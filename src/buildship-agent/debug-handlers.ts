import type {
  AgentDebugEventType,
  AgentHandoffEventType,
  DebugDataType,
  LLMReasoningDeltaEventType,
  ReasoningItem,
  ToolExecutionItem,
  HandoffItem,
} from "./types";

export const createDebugHandlers = (
  setDebugData: (
    value:
      | Record<string, DebugDataType>
      | ((prev: Record<string, DebugDataType>) => Record<string, DebugDataType>),
  ) => void,
) => {
  const handleDebugToolExecutionStarted = (parsed: AgentDebugEventType) => {
    const executionId = parsed.meta.executionId;
    setDebugData((prev) => ({
      ...prev,
      [executionId]: [
        ...(prev[executionId] || []),
        {
          itemType: "tool_call",
          toolId: (parsed.data as { toolId?: string }).toolId || "unknown",
          toolCallId: (parsed.data as { toolCallId?: string }).toolCallId,
          status: "progress",
        },
      ],
    }));
  };

  const handleDebugToolExecutionInputs = (parsed: AgentDebugEventType) => {
    const executionId = parsed.meta.executionId;
    const toolCallId = (parsed.data as { toolCallId?: string }).toolCallId;
    setDebugData((prev) => {
      const currentData = [...(prev[executionId] || [])];

      for (let i = currentData.length - 1; i >= 0; i--) {
        if (currentData[i].itemType === "tool_call") {
          const toolItem = currentData[i] as ToolExecutionItem;
          if (toolItem.toolCallId === toolCallId) {
            currentData[i] = {
              ...toolItem,
              inputs: (parsed.data as { value: unknown }).value,
            };
            break;
          }
        }
      }

      return {
        ...prev,
        [executionId]: currentData,
      };
    });
  };

  const handleDebugToolExecutionFinished = (parsed: AgentDebugEventType) => {
    const executionId = parsed.meta.executionId;
    const toolCallId = (parsed.data as { toolCallId?: string }).toolCallId;
    setDebugData((prev) => {
      const currentData = [...(prev[executionId] || [])];

      for (let i = currentData.length - 1; i >= 0; i--) {
        if (currentData[i].itemType === "tool_call") {
          const toolItem = currentData[i] as ToolExecutionItem;
          if (toolItem.toolCallId === toolCallId) {
            currentData[i] = {
              ...toolItem,
              status: "complete",
              output: (parsed.data as { value: unknown }).value,
            };
            break;
          }
        }
      }

      return {
        ...prev,
        [executionId]: currentData,
      };
    });
  };

  const handleDebugToolExecutionError = (parsed: AgentDebugEventType) => {
    const executionId = parsed.meta.executionId;
    const toolCallId = (parsed.data as { toolCallId?: string }).toolCallId;
    setDebugData((prev) => {
      const currentData = [...(prev[executionId] || [])];

      for (let i = currentData.length - 1; i >= 0; i--) {
        if (currentData[i].itemType === "tool_call") {
          const toolItem = currentData[i] as ToolExecutionItem;
          if (toolItem.toolCallId === toolCallId) {
            currentData[i] = {
              ...toolItem,
              status: "error",
              output: (parsed.data as { value: unknown }).value,
            };
            break;
          }
        }
      }

      return {
        ...prev,
        [executionId]: currentData,
      };
    });
  };

  const handleDebugToolLog = (parsed: AgentDebugEventType) => {
    const executionId = parsed.meta.executionId;
    const toolCallId = (parsed.data as { toolCallId?: string }).toolCallId;
    setDebugData((prev) => {
      const currentData = [...(prev[executionId] || [])];

      for (let i = currentData.length - 1; i >= 0; i--) {
        if (currentData[i].itemType === "tool_call") {
          const toolItem = currentData[i] as ToolExecutionItem;
          if (toolItem.toolCallId === toolCallId) {
            const currentLogs = toolItem.logs || [];
            currentData[i] = {
              ...toolItem,
              logs: [...currentLogs, (parsed.data as { value: unknown[] }).value[0]],
            };
            break;
          }
        }
      }

      return {
        ...prev,
        [executionId]: currentData,
      };
    });
  };

  let lastReasoningIndex = -1;
  const handleDebugReasoningStep = (parsed: LLMReasoningDeltaEventType) => {
    const executionId = parsed.meta.executionId;
    const { delta, index } = parsed.data;
    setDebugData((prev) => {
      const currentData = [...(prev[executionId] || [])];

      if (lastReasoningIndex < index) {
        currentData.push({ itemType: "reasoning", reasoning: "" });
        lastReasoningIndex = index;
      }

      for (let i = currentData.length - 1; i >= 0; i--) {
        if (currentData[i].itemType === "reasoning") {
          currentData[i] = {
            itemType: "reasoning",
            reasoning: (currentData[i] as ReasoningItem).reasoning + delta,
          };
          break;
        }
      }

      return {
        ...prev,
        [executionId]: currentData,
      };
    });
  };

  const handleAgentHandoff = (parsed: AgentHandoffEventType) => {
    const executionId = parsed.meta.executionId;
    setDebugData((prev) => ({
      ...prev,
      [executionId]: [
        ...(prev[executionId] || []),
        {
          itemType: "handoff",
          agentName: parsed.data.agentName,
        } as HandoffItem,
      ],
    }));
  };

  const handleDebugEvent = (
    parsed: AgentDebugEventType | LLMReasoningDeltaEventType | AgentHandoffEventType,
  ) => {
    switch (parsed.type) {
      case "debug_tool_execution_started":
        handleDebugToolExecutionStarted(parsed);
        break;
      case "debug_tool_execution_inputs":
        handleDebugToolExecutionInputs(parsed);
        break;
      case "debug_tool_execution_finished":
        handleDebugToolExecutionFinished(parsed);
        break;
      case "debug_tool_execution_error":
        handleDebugToolExecutionError(parsed);
        break;
      case "debug_tool_log":
        handleDebugToolLog(parsed);
        break;
      case "llm_reasoning_delta":
        handleDebugReasoningStep(parsed);
        break;
      case "agent_handoff":
        handleAgentHandoff(parsed);
        break;
    }
  };

  return {
    handleDebugEvent,
  };
};
