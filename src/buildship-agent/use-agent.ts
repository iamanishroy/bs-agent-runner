import { useCallback, useRef, useState, useEffect } from "react";
import { useAtom } from "jotai";
import { type EventSourceMessage, fetchEventSource } from "@microsoft/fetch-event-source";

import {
  buildshipAgentSessionAtom,
  buildshipAgentDebugDataAtom,
  DEFAULT_SESSION_NAME,
  TEMPORARY_SESSION_ID,
} from "./atoms";
import { useSessionUtils } from "./session-utils";
import { createDebugHandlers } from "./debug-handlers";
import type { Message, OutputStreamEventType } from "./types";
export default function useAgent(agentId: string, agentUrl: string) {
  const [allSessions, setAllSessions] = useAtom(buildshipAgentSessionAtom);
  const [debugData, setDebugData] = useAtom(buildshipAgentDebugDataAtom);

  const [inProgress, setInProgress] = useState(false);
  const [messages, setMessages] = useState<Array<Message>>([]);

  const messagesRef = useRef<Array<Message>>([]);

  // Initialize currentSessionId later after sessionUtils is available
  const [currentSessionId, setCurrentSessionId] = useState<string>(TEMPORARY_SESSION_ID);

  const sessionUtils = useSessionUtils(
    agentId,
    allSessions,
    setAllSessions,
    currentSessionId,
    setCurrentSessionId,
    messagesRef,
  );

  // Set initial session ID after sessionUtils is available
  useEffect(() => {
    const initialSessionId = sessionUtils.getInitialSessionId();
    setCurrentSessionId(initialSessionId);
  }, []);

  const debugHandlers = createDebugHandlers(setDebugData);

  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initialize or load session
  useEffect(() => {
    // Don't reset messages if we're currently in progress (streaming)
    if (inProgress) {
      return;
    }

    const session = sessionUtils.agentSessions[currentSessionId];

    if (session) {
      setMessages(session.messages);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, sessionUtils.agentSessions, agentId, inProgress]);

  // Only sync on unmount to prevent data loss
  useEffect(() => {
    return () => {
      if (messagesRef.current.length > 0 && sessionUtils.syncSessionRef.current) {
        sessionUtils.syncSessionRef.current();
      }
    };
  }, []);

  const controller = useRef<AbortController | undefined>(undefined);

  const runAgent = useCallback(
    async (input: string, options?: { context?: object; testBuildId?: string }) => {
      setInProgress(true);
      // Abort any existing request before creating a new controller
      if (controller.current) {
        controller.current.abort();
      }
      controller.current = new AbortController();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Include session ID in headers if we have one
      if (currentSessionId) {
        headers["x-buildship-agent-session-id"] = currentSessionId;
      }

      const body = {
        stream: true,
        input,
        context: options?.context || {},
        testBuildId: options?.testBuildId,
      };

      try {
        await fetchEventSource(agentUrl, {
          method: "POST",
          headers,
          signal: controller.current.signal,
          openWhenHidden: true,
          body: JSON.stringify(body),
          onopen: async (resp) => {
            // catch the 404 status
            if (resp.status >= 400) {
              console.log(`AI onopen error with status: ${resp.status}`);

              if (resp.status === 404) {
                // for resume operations with 404, throw a specific error for retry
                throw new Error(`Not Found (${resp.statusText})`);
              }

              throw new Error(`Error status ${resp.status}`);
            }

            // Extract session ID from response headers if we don't have one
            if (!currentSessionId || currentSessionId === TEMPORARY_SESSION_ID) {
              const sessionId = resp.headers.get("x-buildship-agent-session-id");
              if (sessionId) {
                // Transfer current messages to the new session before switching
                const currentMessages = messagesRef.current;
                const sessionName =
                  resp.headers.get("x-buildship-agent-session-name") || DEFAULT_SESSION_NAME;

                sessionUtils.createSessionFromResponse(sessionId, sessionName, currentMessages);
                setCurrentSessionId(sessionId);
              }
            }

            // Extract execution ID from response headers and update the last user message
            const executionId = resp.headers.get("x-buildship-agent-execution-id");
            if (executionId) {
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === "user") {
                  const updatedMessage = {
                    ...lastMessage,
                    executionId: executionId,
                  };
                  const updatedMessages = [...prev.slice(0, -1), updatedMessage];

                  // Sync updated user message
                  if (sessionUtils.syncSessionRef.current) {
                    sessionUtils.syncSessionRef.current(updatedMessages);
                  }

                  return updatedMessages;
                }
                return prev;
              });
            }
          },
          onmessage: (event: EventSourceMessage) => {
            try {
              const parsed = JSON.parse(event.data) as OutputStreamEventType;

              if (parsed.type === "llm_text_delta") {
                setMessages((prev) => {
                  // append to last ai message
                  const lastMessage = prev[prev.length - 1];
                  let updatedMessages;
                  if (lastMessage?.role === "agent") {
                    const updatedMessage = {
                      ...lastMessage,
                      content: lastMessage.content + parsed.data,
                    };
                    updatedMessages = [...prev.slice(0, -1), updatedMessage];
                  } else {
                    updatedMessages = [
                      ...prev,
                      {
                        role: "agent" as const,
                        content: parsed.data,
                        executionId: parsed.meta.executionId,
                      },
                    ];
                  }

                  // Sync messages during streaming for consistency
                  if (sessionUtils.syncSessionRef.current) {
                    sessionUtils.syncSessionRef.current(updatedMessages);
                  }

                  return updatedMessages;
                });
              } else if (
                parsed.type.startsWith("debug_") ||
                parsed.type === "llm_reasoning_delta" ||
                parsed.type === "agent_handoff"
              ) {
                debugHandlers.handleDebugEvent(parsed);
              }
            } catch (e) {
              console.log("Failed to parse agent message", e);
            }
          },
          onclose: () => {
            console.log("Agent closed");
            setInProgress(false);
            // Sync messages when streaming completes
            if (sessionUtils.syncSessionRef.current) {
              sessionUtils.syncSessionRef.current();
            }
          },
          onerror: (e) => {
            console.log("Agent error", e);
            setInProgress(false);
            // Sync messages on error to prevent data loss
            if (sessionUtils.syncSessionRef.current) {
              sessionUtils.syncSessionRef.current(messagesRef.current);
            }
            throw new Error("Failed to execute agent");
          },
        });
      } catch (error) {
        console.log("Agent execution failed", error);
        setInProgress(false);
        // Sync messages on execution failure
        if (sessionUtils.syncSessionRef.current) {
          sessionUtils.syncSessionRef.current(messagesRef.current);
        }
        throw error;
      }
    },
    [agentUrl, currentSessionId, sessionUtils, debugHandlers],
  );

  const handleSend = useCallback(
    async (input: string, options?: { context?: object; testBuildId?: string; skipUserMessage?: boolean }) => {
      const userMessage = {
        role: "user" as const,
        content: input,
        executionId: Date.now().toString(),
      };

      // Only add user message if not skipping
      if (!options?.skipUserMessage) {
        setMessages((prev) => {
          const updatedMessages = [...prev, userMessage];
          // Sync immediately after user message
          if (sessionUtils.syncSessionRef.current) {
            sessionUtils.syncSessionRef.current(updatedMessages);
          }
          return updatedMessages;
        });
      }

      try {
        await runAgent(input, options);
      } catch (error) {
        // Ensure user message is preserved even if agent execution fails
        if (!options?.skipUserMessage) {
          setMessages((prev) => {
            const updatedMessages = prev.some((m) => m === userMessage)
              ? prev
              : [...prev, userMessage];
            if (sessionUtils.syncSessionRef.current) {
              sessionUtils.syncSessionRef.current(updatedMessages);
            }
            return updatedMessages;
          });
        }
        throw error;
      }
    },
    [runAgent, sessionUtils.syncSessionRef],
  );

  const addOptimisticMessage = useCallback((input: string) => {
    const userMessage = {
      role: "user" as const,
      content: input,
      executionId: Date.now().toString(),
    };

    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage];
      // Sync immediately after user message
      if (sessionUtils.syncSessionRef.current) {
        sessionUtils.syncSessionRef.current(updatedMessages);
      }
      return updatedMessages;
    });
  }, [sessionUtils.syncSessionRef]);

  return {
    inProgress,
    messages,
    handleSend,
    addOptimisticMessage,
    sessionId: currentSessionId,
    switchSession: sessionUtils.switchSession,
    deleteSession: sessionUtils.deleteSession,
    sessions: sessionUtils.sessionsList,
    debugData,
  };
}
