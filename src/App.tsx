import { useState, useEffect } from 'react'
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAgentContext } from './buildship-agent/agent-context'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import { ScrollArea } from './components/ui/scroll-area'
import { Badge } from './components/ui/badge'
import { Settings, Plus, X, User, Bot, Loader2, MessageSquare, Bug } from 'lucide-react'

const DEMO_AGENT_ID = 'demo-agent-1'
const DEFAULT_AGENT_URL = 'https://pfw15o.buildship.run/executeAgent/fbEKO2juekQLR1sRXxDN'
const STORAGE_KEY = 'buildship-agent-url'

function App() {
  const [input, setInput] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const [showSessions, setShowSessions] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [agentUrl, setAgentUrl] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_AGENT_URL
  })
  const [tempUrl, setTempUrl] = useState(agentUrl)

  // Save to localStorage when URL changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, agentUrl)
  }, [agentUrl])

  // Initialize agent with configured URL
  const agent = useAgentContext(DEMO_AGENT_ID, agentUrl)

  const handleSend = async () => {
    if (!input.trim() || agent.inProgress) return

    try {
      await agent.handleSend(input, {
        context: {
          userId: 'demo-user',
          timestamp: new Date().toISOString(),
        }
      })
      setInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const createNewSession = () => {
    agent.switchSession()
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const handleSaveUrl = () => {
    if (tempUrl.trim()) {
      setAgentUrl(tempUrl.trim())
      setShowSettings(false)
    }
  }

  const handleCancelSettings = () => {
    setTempUrl(agentUrl)
    setShowSettings(false)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b bg-background px-6 py-4">
        <h1 className="text-xl font-semibold">BuildShip Agent Runner</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSessions(!showSessions)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {showSessions ? 'Hide' : 'Show'} Sessions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            <Bug className="mr-2 h-4 w-4" />
            {showDebug ? 'Hide' : 'Show'} Debug
          </Button>
        </div>
      </header>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agent Settings</DialogTitle>
            <DialogDescription>
              Configure your BuildShip agent endpoint URL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="agent-url" className="text-sm font-medium">
                Agent URL
              </label>
              <Input
                id="agent-url"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://your-buildship-endpoint.buildship.run/agent"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter your BuildShip agent endpoint URL. This will be saved locally.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelSettings}>
              Cancel
            </Button>
            <Button onClick={handleSaveUrl}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 overflow-hidden">
        {/* Sessions Sidebar */}
        {showSessions && (
          <aside className="w-64 shrink-0 border-r bg-muted/40">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                Sessions
              </h2>
              <Button size="sm" onClick={createNewSession}>
                <Plus className="mr-1 h-3 w-3" />
                New
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-2 p-3">
                {agent.sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer p-3 transition-colors hover:bg-accent ${
                      session.id === agent.sessionId ? 'border-primary bg-accent' : ''
                    }`}
                    onClick={() => agent.switchSession(session.id)}
                  >
                    <div className="relative">
                      <div className="mb-1 text-sm font-medium">
                        {session.name || `Session ${session.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.messages.length} messages
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatTimestamp(session.updatedAt)}
                      </div>
                      {session.id !== agent.sessionId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-0 top-0 h-6 w-6 opacity-0 transition-opacity hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this session?')) {
                              agent.deleteSession(session.id)
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
                {agent.sessions.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No sessions yet. Start chatting to create one!
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Main Chat Area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-3">
            <div>
              <h2 className="text-base font-semibold">Chat</h2>
              <p className="font-mono text-xs text-muted-foreground">
                Session: {agent.sessionId.slice(0, 12)}...
              </p>
            </div>
            {agent.inProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Agent is thinking...
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-6">
            {agent.messages.length === 0 ? (
              <div className="mx-auto max-w-2xl space-y-4">
                <h3 className="text-lg font-semibold">Welcome to BuildShip Agent Runner!</h3>
                <p>This demo showcases the key features:</p>
                <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                  <li>Real-time streaming responses</li>
                  <li>Session management with persistence</li>
                  <li>Background execution</li>
                  <li>Debug data visualization</li>
                  <li>Context passing</li>
                </ul>
                <Card className="mt-6 bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> Use the Settings button to
                    configure your BuildShip agent endpoint URL to start chatting.
                  </p>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                {agent.messages.map((message, index) => (
                  <div
                    key={`${message.executionId}-${message.role}-${index}`}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <Card className={`max-w-[70%] p-4 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                        {message.role === 'user' ? (
                          <>
                            <User className="h-3 w-3" />
                            You
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3" />
                            Agent
                          </>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                      {message.executionId && (
                        <div className="mt-2 font-mono text-xs opacity-70">
                          ID: {message.executionId.slice(0, 12)}...
                        </div>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t bg-background p-4">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                disabled={agent.inProgress}
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || agent.inProgress}
                className="shrink-0"
              >
                {agent.inProgress ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send'
                )}
              </Button>
            </div>
          </div>
        </main>

        {/* Debug Panel */}
        {showDebug && (
          <aside className="w-96 shrink-0 border-l bg-muted/40">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                Debug Data
              </h2>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="space-y-3 p-4">
                {Object.entries(agent.debugData).length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No debug data yet. Send a message to see debug information.
                  </div>
                ) : (
                  Object.entries(agent.debugData).map(([executionId, debugItems]) => (
                    <details key={executionId} className="group">
                      <summary className="cursor-pointer rounded-lg border bg-background p-3 text-sm font-medium transition-colors hover:bg-accent">
                        Execution {executionId.slice(0, 12)}...
                      </summary>
                      <div className="mt-2 space-y-3">
                        {debugItems.map((item, idx) => (
                          <Card key={idx} className="p-3">
                            {item.itemType === 'tool_call' && (
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">🔧 {item.toolId}</span>
                                  <Badge
                                    variant={
                                      item.status === 'complete'
                                        ? 'default'
                                        : item.status === 'error'
                                          ? 'destructive'
                                          : 'secondary'
                                    }
                                  >
                                    {item.status}
                                  </Badge>
                                </div>
                                {item.inputs ? (
                                  <div>
                                    <strong className="text-muted-foreground">Inputs:</strong>
                                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                                      {String(JSON.stringify(item.inputs, null, 2) || '')}
                                    </pre>
                                  </div>
                                ) : null}
                                {item.output ? (
                                  <div>
                                    <strong className="text-muted-foreground">Output:</strong>
                                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                                      {String(JSON.stringify(item.output, null, 2) || '')}
                                    </pre>
                                  </div>
                                ) : null}
                                {item.logs && item.logs.length > 0 && (
                                  <div>
                                    <strong className="text-muted-foreground">Logs:</strong>
                                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs">
                                      {String(JSON.stringify(item.logs, null, 2) || '')}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.itemType === 'reasoning' && (
                              <div className="text-xs">
                                <strong className="text-muted-foreground">💭 Reasoning:</strong>
                                <p className="mt-1 leading-relaxed">{item.reasoning}</p>
                              </div>
                            )}
                            {item.itemType === 'handoff' && (
                              <div className="text-xs">
                                <strong className="text-muted-foreground">🔄 Handoff to:</strong> {item.agentName}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  )
}

export default App
