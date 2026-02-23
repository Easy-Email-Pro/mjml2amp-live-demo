import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import './index.css'
import App from './App.tsx'

// Use local monaco-editor to avoid slow/failed CDN and endless Loading
loader.config({ monaco })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
