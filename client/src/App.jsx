import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import ProtectedRoute, { OwnerOnlyRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Explainer from './pages/Explainer'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Tasks from './pages/Tasks'
import Orders from './pages/Orders'
import Team from './pages/Team'
import Sales from './pages/Sales'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'

/**
 * Root Application Component.
 * Demonstrates:
 * - Unit IV-A (Functional components and composition)
 * - Unit IV-H (React Router v6 SPA routing with protected routes)
 * - Unit II-D (Session-based auth with PHP backend)
 * Maps all 9 authenticated sections: Dashboard, Customers, Tasks, Orders,
 * Team, Sales, Analytics, Notifications, Settings.
 * NotificationsProvider is mounted above <Routes> so the topbar bell and the
 * Notifications page share one unread-count state.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <Routes>
            {/* Public routes — no authentication required */}
            <Route path="/" element={<Explainer />} />
            <Route path="/login" element={<Login />} />

            {/* Protected routes — accessible to both Owner and Team Member */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Tasks />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Orders />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Owner-only routes */}
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <OwnerOnlyRoute>
                    <Layout>
                      <Team />
                    </Layout>
                  </OwnerOnlyRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <OwnerOnlyRoute>
                    <Layout>
                      <Sales />
                    </Layout>
                  </OwnerOnlyRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <OwnerOnlyRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </OwnerOnlyRoute>
                </ProtectedRoute>
              }
            />

            {/* Catch-all: redirect unknown paths to explainer */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}