import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'jotai'
import './index.css'
import App from './App.tsx'
import { AgentContextProvider } from './buildship-agent/agent-context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <AgentContextProvider>
        <App />
      </AgentContextProvider>
    </Provider>
  </StrictMode>,
)
