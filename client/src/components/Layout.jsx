import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import './Layout.css'

/**
 * App Shell Layout.
 * Matches frontend/index.html: fixed sidebar + main-wrapper with topbar + content-area.
 */
export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-wrapper">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  )
}
