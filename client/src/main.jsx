import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" toastOptions={{
      duration: 3000,
      style: {
        background: '#1E293B',
        color: '#F8FAFC',
        border: '1px solid #334155',
      },
    }} />
  </React.StrictMode>,
)
