import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ConfigMissing } from './components/ConfigMissing'
import { supabaseConfig } from './lib/supabase'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    {supabaseConfig.ok ? <App /> : <ConfigMissing missing={supabaseConfig.missing} />}
  </StrictMode>,
)
