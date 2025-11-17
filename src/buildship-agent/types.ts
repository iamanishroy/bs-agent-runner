export type ToolExecutionItem = {
  itemType: "tool_call";
  toolId: string;
  toolCallId?: string;
  status: "progress" | "complete" | "error";
  inputs?: unknown;
  output?: unknown;
  logs?: unknown[];
};

export type ReasoningItem = {
  itemType: "reasoning";
  reasoning: string;
};

export type HandoffItem = {
  itemType: "handoff";
  agentName: string;
};

export type DebugDataType = Array<ToolExecutionItem | ReasoningItem | HandoffItem>;

export type Message = {
  role: "user" | "agent";
  content: string;
  executionId?: string;
};

export type Session = {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: Array<Message>;
  name?: string;
};

export type OutputStreamMetaType = {
  meta: {
    executionId: string;
    eventSequence: number;
    sequence: number;
    timestamp?: number;
  };
};

type LLMTextDeltaEventType = OutputStreamMetaType & {
  type: "llm_text_delta";
  data: string;
};

export type LLMReasoningDeltaEventType = OutputStreamMetaType & {
  type: "llm_reasoning_delta";
  data: {
    delta: string;
    index: number;
  };
};

export type AgentHandoffEventType = OutputStreamMetaType & {
  type: "agent_handoff";
  data: {
    agentName: string;
  };
};

export type AgentDebugEventType = OutputStreamMetaType & {
  type:
    | "debug_tool_execution_finished"
    | "debug_tool_execution_error"
    | "debug_tool_execution_started"
    | "debug_tool_execution_inputs"
    | "debug_tool_log";
  data: any;
};

// type AgentDataEventType = {
//   type: "agent_data";
//   data: any;
// };

export type OutputStreamEventType =
  | LLMTextDeltaEventType
  | LLMReasoningDeltaEventType
  | AgentDebugEventType
  | AgentHandoffEventType;
