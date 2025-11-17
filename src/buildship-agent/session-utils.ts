import { useCallback, useMemo, useRef } from "react";
import type { Message, Session } from "./types";
import { TEMPORARY_SESSION_ID } from "./atoms";

export const useSessionUtils = (
  agentId: string,
  allSessions: Record<string, Record<string, Session>>,
  setAllSessions: (value: Record<string, Record<string, Session>> | ((prev: Record<string, Record<string, Session>>) => Record<string, Record<string, Session>>)) => void,
  currentSessionId: string,
  setCurrentSessionId: (sessionId: string) => void,
  messagesRef: React.MutableRefObject<Array<Message>>
) => {
  const agentSessions = useMemo(() => allSessions[agentId] || {}, [agentId, allSessions]);

  const syncSessionRef = useRef<((messages?: Array<Message>) => void) | null>(null);

  syncSessionRef.current = (updatedMessages?: Array<Message>) => {
    if (!currentSessionId || currentSessionId === TEMPORARY_SESSION_ID) {
      return;
    }

    setAllSessions((prev) => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [currentSessionId]: {
          ...prev[agentId]?.[currentSessionId],
          messages: updatedMessages ?? messagesRef.current,
          updatedAt: Date.now(),
        },
      },
    }));
  };

  const getInitialSessionId = () => {
    const sessions = Object.values(agentSessions);
    if (sessions.length > 0) {
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    }
    return TEMPORARY_SESSION_ID;
  };

  const switchSession = useCallback((sessionId: string = TEMPORARY_SESSION_ID) => {
    setCurrentSessionId(sessionId);
  }, [setCurrentSessionId]);

  const deleteSession = useCallback(
    (sessionId: string) => {
      if (!sessionId || sessionId === TEMPORARY_SESSION_ID) {
        return;
      }

      setAllSessions((prev) => {
        const updatedAgentSessions = { ...prev[agentId] };
        delete updatedAgentSessions[sessionId];

        return {
          ...prev,
          [agentId]: updatedAgentSessions,
        };
      });

      if (sessionId === currentSessionId) {
        const remainingSessions = Object.values(agentSessions).filter((s) => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          const mostRecent = remainingSessions.sort((a, b) => b.updatedAt - a.updatedAt)[0];
          setCurrentSessionId(mostRecent.id);
        } else {
          setCurrentSessionId(TEMPORARY_SESSION_ID);
        }
      }
    },
    [agentId, currentSessionId, agentSessions, setAllSessions, setCurrentSessionId],
  );

  const sessionsList = useMemo(
    () => Object.values(agentSessions).sort((a, b) => b.updatedAt - a.updatedAt),
    [agentSessions],
  );

  const createSessionFromResponse = (
    sessionId: string,
    sessionName: string,
    currentMessages: Array<Message>
  ) => {
    setAllSessions((prev) => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [sessionId]: {
          id: sessionId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: currentMessages,
          name: sessionName,
        },
      },
    }));
  };

  return {
    agentSessions,
    syncSessionRef,
    getInitialSessionId,
    switchSession,
    deleteSession,
    sessionsList,
    createSessionFromResponse,
  };
};
