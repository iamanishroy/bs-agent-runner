import { createContext, useContext, useCallback, useRef, useState, useEffect, useMemo, ReactNode } from "react";
import { atom, useAtom, useSetAtom } from "jotai";
import { atomFamily } from "jotai/utils";
import useAgent from "./use-agent";
import type { Message, Session, DebugDataType } from "./types";

export interface AgentRunner {
  messages: Message[];
  inProgress: boolean;
  sessionId: string;
  sessions: Session[];
  debugData: Record<string, DebugDataType>;
  handleSend: (input: string, options?: { context?: object; testBuildId?: string; skipUserMessage?: boolean }) => Promise<void>;
  switchSession: (sessionId?: string) => void;
  deleteSession: (sessionId: string) => void;
  addOptimisticMessage: (input: string) => void;
}

// Atom family to store agent runners (reactive state)
const agentRunnerAtomFamily = atomFamily((agentId: string) =>
  atom<AgentRunner | null>(null)
);

interface AgentContextValue {
  initializeAgent: (agentId: string, agentUrl: string) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

// Context stays mounted at app level to enable background execution across route changes
export function AgentContextProvider({ children }: { children: ReactNode }) {
  const activeAgentsRef = useRef<Map<string, string>>(new Map());
  const [, forceUpdate] = useState({});

  const initializeAgent = useCallback((agentId: string, agentUrl: string) => {
    const existingUrl = activeAgentsRef.current.get(agentId);

    if (!existingUrl) {
      activeAgentsRef.current.set(agentId, agentUrl);
      forceUpdate({});
    } else if (existingUrl !== agentUrl) {
      // URL changed for existing agent, update and trigger re-render
      activeAgentsRef.current.set(agentId, agentUrl);
      forceUpdate({});
    }
  }, []);

  const contextValue = useMemo(() => ({ initializeAgent }), [initializeAgent]);

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
      {Array.from(activeAgentsRef.current.entries()).map(([agentId, agentUrl]) => (
        <AgentRunnerInstance key={agentId} agentId={agentId} agentUrl={agentUrl} />
      ))}
    </AgentContext.Provider>
  );
}

// Internal component that stays mounted to keep agent running in background
function AgentRunnerInstance({ agentId, agentUrl }: { agentId: string; agentUrl: string }) {
  const agent = useAgent(agentId, agentUrl);
  const setAgentRunner = useSetAtom(agentRunnerAtomFamily(agentId));

  // Update atom when agent changes (reactive state for consumers)
  useEffect(() => {
    setAgentRunner(agent);
  }, [agent, setAgentRunner]);

  return null;
}

export function useAgentContext(agentId: string, agentUrl: string): AgentRunner {
  const context = useContext(AgentContext);

  if (!context) {
    throw new Error("useAgentContext must be used within AgentContextProvider");
  }

  const { initializeAgent } = context;

  useEffect(() => {
    initializeAgent(agentId, agentUrl);
  }, [agentId, agentUrl, initializeAgent]);

  // Read from reactive atom - component rerenders when agent state changes
  const [runner] = useAtom(agentRunnerAtomFamily(agentId));

  const placeholder = useMemo(
    () => ({
      messages: [],
      inProgress: false,
      sessionId: "",
      sessions: [],
      debugData: {},
      handleSend: async () => {},
      switchSession: () => {},
      deleteSession: () => {},
      addOptimisticMessage: () => {},
    }),
    []
  );

  return runner || placeholder;
}
