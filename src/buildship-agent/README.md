# BuildShip Agent Runner

A React library for integrating AI agent functionality into any React application with persistent background execution and multi-agent support.

## Features

- **Background Execution**: Agents continue running even when components unmount or routes change
- **Multi-Agent Support**: Run multiple agent instances simultaneously with independent state
- **Real-time Streaming**: Server-Sent Events (SSE) for streaming agent responses
- **Session Management**: Built-in session handling with localStorage persistence
- **Debug Support**: Comprehensive debug data tracking for agent execution
- **Framework Agnostic**: Generic implementation with no app-specific logic
- **Type Safe**: Full TypeScript support

## Installation

```bash
npm install @buildship/agent-runner
# or
yarn add @buildship/agent-runner
```

## Quick Start

### 1. Wrap Your App with AgentContextProvider

```tsx
import { AgentContextProvider } from '@buildship/agent-runner';

function App() {
  return (
    <AgentContextProvider>
      <YourApp />
    </AgentContextProvider>
  );
}
```

### 2. Use the Agent in Your Components

```tsx
import { useAgentContext } from '@buildship/agent-runner';

function ChatComponent({ agentId }: { agentId: string }) {
  const agentUrl = `https://api.example.com/agent/${agentId}`;
  const agent = useAgentContext(agentId, agentUrl);

  const handleSubmit = (input: string) => {
    agent.handleSend(input);
  };

  return (
    <div>
      <div>
        {agent.messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <input
        onSubmit={handleSubmit}
        disabled={agent.inProgress}
      />
    </div>
  );
}
```

## Core Concepts

### AgentContextProvider

The provider component that manages all agent runners at the application level. It stays mounted across route changes to enable background execution.

**Props:**
- `children`: React children

**Example:**
```tsx
<AgentContextProvider>
  <App />
</AgentContextProvider>
```

### useAgentContext

Hook to access a specific agent runner. Automatically initializes the agent if not already active.

**Parameters:**
- `agentId` (string): Unique identifier for the agent
- `agentUrl` (string): SSE endpoint URL for the agent

**Returns:** `AgentRunner` - Agent instance with state and actions

**Example:**
```tsx
const agent = useAgentContext('my-agent-123', 'https://api.example.com/agent/my-agent-123');
```

## API Reference

### AgentRunner Interface

```typescript
interface AgentRunner {
  // State
  messages: Message[];           // Chat message history
  inProgress: boolean;           // Whether agent is currently processing
  sessionId: string;             // Current session ID
  sessions: Session[];           // All sessions for this agent
  debugData: Record<string, DebugDataType>; // Debug information

  // Actions
  handleSend: (
    input: string,
    options?: {
      context?: object;
      testBuildId?: string;
      skipUserMessage?: boolean;
    }
  ) => Promise<void>;

  switchSession: (sessionId?: string) => void;
  deleteSession: (sessionId: string) => void;
  addOptimisticMessage: (input: string) => void;
}
```

### Message Interface

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  debugId?: string;
}
```

### Session Interface

```typescript
interface Session {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
```

## Usage Examples

### Basic Chat Interface

```tsx
import { useAgentContext } from '@buildship/agent-runner';

function ChatInterface({ agentId }: { agentId: string }) {
  const agent = useAgentContext(agentId, `https://api.example.com/agent/${agentId}`);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      agent.handleSend(input);
      setInput('');
    }
  };

  return (
    <div>
      <div className="messages">
        {agent.messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <div className="input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={agent.inProgress}
          placeholder="Type a message..."
        />
        <button onClick={handleSend} disabled={agent.inProgress}>
          Send
        </button>
      </div>
    </div>
  );
}
```

### Multi-Agent Dashboard

```tsx
import { useAgentContext } from '@buildship/agent-runner';

function MultiAgentDashboard() {
  const agent1 = useAgentContext('agent-1', 'https://api.example.com/agent/agent-1');
  const agent2 = useAgentContext('agent-2', 'https://api.example.com/agent/agent-2');

  return (
    <div>
      <div className="agent-panel">
        <h2>Agent 1</h2>
        <ChatInterface agent={agent1} />
      </div>

      <div className="agent-panel">
        <h2>Agent 2</h2>
        <ChatInterface agent={agent2} />
      </div>
    </div>
  );
}
```

### Session Management

```tsx
import { useAgentContext } from '@buildship/agent-runner';

function SessionManager({ agentId }: { agentId: string }) {
  const agent = useAgentContext(agentId, `https://api.example.com/agent/${agentId}`);

  return (
    <div>
      <div className="sessions">
        {agent.sessions.map((session) => (
          <div key={session.id}>
            <button onClick={() => agent.switchSession(session.id)}>
              Session {session.id.slice(0, 8)}
              {session.id === agent.sessionId && ' (active)'}
            </button>
            <button onClick={() => agent.deleteSession(session.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => agent.switchSession()}>
        New Session
      </button>
    </div>
  );
}
```

### With Context and Custom Options

```tsx
import { useAgentContext } from '@buildship/agent-runner';

function AdvancedChat({ agentId }: { agentId: string }) {
  const agent = useAgentContext(agentId, `https://api.example.com/agent/${agentId}`);

  const handleSendWithContext = (input: string) => {
    agent.handleSend(input, {
      context: {
        userId: 'user-123',
        preferences: { theme: 'dark' },
        metadata: { source: 'web-app' }
      }
    });
  };

  const handleTestBuild = (input: string, buildId: string) => {
    agent.handleSend(input, {
      testBuildId: buildId,
      skipUserMessage: true // Don't add user message to history
    });
  };

  return (
    <div>
      {/* Your chat UI */}
    </div>
  );
}
```

### Debug Data Visualization

```tsx
import { useAgentContext } from '@buildship/agent-runner';

function DebugPanel({ agentId }: { agentId: string }) {
  const agent = useAgentContext(agentId, `https://api.example.com/agent/${agentId}`);

  return (
    <div>
      <h3>Debug Information</h3>
      {Object.entries(agent.debugData).map(([id, debug]) => (
        <div key={id}>
          <h4>Message {id}</h4>
          <pre>{JSON.stringify(debug, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
```

## Architecture

### Background Execution

The `AgentContextProvider` stays mounted at the app level, ensuring agent executions continue even when:
- Components unmount
- Routes change
- UI is navigated away

This is achieved by:
1. Provider mounted at app level (above router)
2. Agent state managed in refs (not component state)
3. SSE connections maintained in background
4. State persisted to localStorage via Jotai atoms

### Multi-Agent Support

The context manages multiple agent runners using a Map:
- Each agent has a unique `agentId`
- Each agent maintains its own state, sessions, and connections
- Agents can run simultaneously without interference
- Each agent can have different URLs/endpoints

### State Persistence

Agent state is persisted using Jotai atoms with localStorage sync:
- Messages persist across page refreshes
- Sessions are maintained
- Current session is remembered

## Server-Side Requirements

Your agent server must support Server-Sent Events (SSE) and emit events in the following format:

### Event Types

**1. Message Event**
```json
{
  "type": "message",
  "content": "Agent response text"
}
```

**2. Debug Event**
```json
{
  "type": "debug",
  "data": {
    "step": "processing",
    "details": { /* any debug data */ }
  }
}
```

**3. Done Event**
```json
{
  "type": "done"
}
```

**4. Error Event**
```json
{
  "type": "error",
  "error": "Error message"
}
```

### Example Server Implementation (Node.js)

```javascript
app.post('/agent/:agentId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { input, sessionId, context } = req.body;

  // Process agent request
  processAgent(input, sessionId, context, {
    onMessage: (content) => {
      res.write(`data: ${JSON.stringify({ type: 'message', content })}\n\n`);
    },
    onDebug: (data) => {
      res.write(`data: ${JSON.stringify({ type: 'debug', data })}\n\n`);
    },
    onDone: () => {
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    },
    onError: (error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
      res.end();
    }
  });
});
```

## Advanced Usage

### Custom URL Resolver with Environment Logic

If your app has complex environment logic, create a wrapper hook:

```tsx
// useCustomAgent.ts
import { useMemo } from 'react';
import { useAgentContext } from '@buildship/agent-runner';

export function useCustomAgent(agentId: string) {
  const environment = useEnvironment();
  const runtimeUrl = useRuntimeUrl();

  const agentUrl = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      return `http://localhost:8080/agent/${agentId}`;
    }
    return `${runtimeUrl}/agent/${agentId}`;
  }, [agentId, runtimeUrl]);

  return useAgentContext(agentId, agentUrl);
}

// Usage
function MyComponent() {
  const agent = useCustomAgent('my-agent');
  // ...
}
```

### Deployment Logic Wrapper

Wrap the agent with custom deployment logic:

```tsx
// useAgentWithDeploy.ts
import { useCallback } from 'react';
import { useAgentContext } from '@buildship/agent-runner';

export function useAgentWithDeploy(agentId: string, agentUrl: string) {
  const agent = useAgentContext(agentId, agentUrl);

  const handleSendWithDeploy = useCallback(async (input: string) => {
    // Custom deployment logic
    const deployId = await deployAgent(agentConfig);

    // Send with deployId
    return agent.handleSend(input, {
      testBuildId: deployId,
      skipUserMessage: true
    });
  }, [agent]);

  return {
    ...agent,
    handleSend: handleSendWithDeploy
  };
}
```

## Best Practices

1. **Mount Provider at App Level**: Always mount `AgentContextProvider` above your router to ensure background execution.

2. **Stable URLs**: Use `useMemo` or constants for agent URLs to avoid unnecessary re-initializations.

3. **Error Handling**: Always handle errors in your UI when `agent.messages` contains error messages.

4. **Cleanup**: The library handles cleanup automatically when the app unmounts.

5. **Session Management**: Use sessions for different conversation contexts, but don't create too many as they're persisted.

6. **Debug Data**: Use debug data in development to understand agent behavior, but consider disabling in production for performance.

## TypeScript

The library is written in TypeScript and exports all necessary types:

```typescript
import type {
  AgentRunner,
  Message,
  Session,
  DebugDataType
} from '@buildship/agent-runner';
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
