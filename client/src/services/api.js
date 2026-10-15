/**
 * OmniOS Centralized API Client Service
 *
 * Handles HTTP requests to the PHP backend with credentials (session cookies)
 * and standardized error handling.
 */

const API_BASE = '/api'

/**
 * Generic fetch wrapper with credentials and JSON parsing.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `${API_BASE}/${endpoint}`
  const config = {
    ...options,
    credentials: 'include', // Ensures OMNIOS_SESSID session cookie is transmitted
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  }

  const response = await fetch(url, config)
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const errorMsg = data?.error || (data?.errors && data.errors.join(', ')) || `Request failed with status ${response.status}`
    const error = new Error(errorMsg)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export const authApi = {
  login: (credentials) => request('/api/auth/login.php', { method: 'POST', body: JSON.stringify(credentials) }),
  checkSession: () => request('/api/auth/me.php', { method: 'GET' }),
  logout: () => request('/api/auth/logout.php', { method: 'POST' }),
}

export const customersApi = {
  getAll: (page = 1, limit = 10, search = '') => {
    const query = new URLSearchParams({ page, limit, search }).toString()
    return request(`/api/customers.php?${query}`, { method: 'GET' })
  },
  getById: (id) => request(`/api/customers.php?id=${encodeURIComponent(id)}`, { method: 'GET' }),
  create: (customer) => request('/api/customers.php', { method: 'POST', body: JSON.stringify(customer) }),
  update: (id, customer) => request('/api/customers.php', { method: 'PUT', body: JSON.stringify({ id, ...customer }) }),
  delete: (id) => request(`/api/customers.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export const systemApi = {
  getHealth: () => request('/api/health.php', { method: 'GET' }),
}

export const api = request
export default request
