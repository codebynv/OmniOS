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

export const teamApi = {
  getAll: () => request('/api/team.php', { method: 'GET' }),
  getById: (id) => request(`/api/team.php?id=${encodeURIComponent(id)}`, { method: 'GET' }),
  create: (member) => request('/api/team.php', { method: 'POST', body: JSON.stringify(member) }),
  update: (id, member) => request(`/api/team.php?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ id, ...member }) }),
  activate: (id) => request(`/api/team.php?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'activate' }) }),
  deactivate: (id) => request(`/api/team.php?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'deactivate' }) }),
}

export const tasksApi = {
  getAll: () => request('/api/tasks.php', { method: 'GET' }),
  getById: (id) => request(`/api/tasks.php?id=${encodeURIComponent(id)}`, { method: 'GET' }),
  create: (task) => request('/api/tasks.php', { method: 'POST', body: JSON.stringify(task) }),
  update: (id, task) => request(`/api/tasks.php?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ id, ...task }) }),
  updateStatus: (id, status) => request(`/api/tasks.php?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id) => request(`/api/tasks.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

export const ordersApi = {
  getAll: (status = '', search = '') => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.append('status', status)
    if (search) params.append('search', search)
    const queryString = params.toString()
    return request(`/api/orders.php${queryString ? '?' + queryString : ''}`, { method: 'GET' })
  },
  getById: (id) => request(`/api/orders.php?id=${encodeURIComponent(id)}`, { method: 'GET' }),
  create: (order) => request('/api/orders.php', { method: 'POST', body: JSON.stringify(order) }),
  update: (id, order) => request(`/api/orders.php?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ id, ...order }) }),
  updateStatus: (id, status) => request(`/api/orders.php?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancel: (id) => request(`/api/orders.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  delete: (id, hard = false) => request(`/api/orders.php?id=${encodeURIComponent(id)}${hard ? '&hard=true' : ''}`, { method: 'DELETE' }),
}

export const salesApi = {
  getSummary: () => request('/api/sales.php', { method: 'GET' }),
}

export const dashboardApi = {
  getSummary: () => request('/api/dashboard.php', { method: 'GET' }),
}

export const analyticsApi = {
  getSummary: (params = {}) => {
    const searchParams = new URLSearchParams()
    if (params.range) searchParams.append('range', params.range)
    if (params.from) searchParams.append('from', params.from)
    if (params.to) searchParams.append('to', params.to)
    const qs = searchParams.toString()
    return request(`/api/analytics.php${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
}

export const notificationsApi = {
  getAll: (limit = 50, offset = 0) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit)
    if (offset) params.append('offset', offset)
    const qs = params.toString()
    return request(`/api/notifications.php${qs ? '?' + qs : ''}`, { method: 'GET' })
  },
  getUnreadCount: () => request('/api/notifications.php?action=count', { method: 'GET' }),
  markAsRead: (id) => request(`/api/notifications.php?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'mark_read' }) }),
  toggleRead: (id) => request(`/api/notifications.php?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'toggle' }) }),
  markAllAsRead: () => request('/api/notifications.php?action=mark_all_read', { method: 'PATCH' }),
}

export const profileApi = {
  getProfile: () => request('/api/profile.php', { method: 'GET' }),
  updateProfile: (data) => request('/api/profile.php', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => request('/api/profile.php', { method: 'POST', body: JSON.stringify(data) }),
}

export const systemApi = {
  getHealth: () => request('/api/health.php', { method: 'GET' }),
}

export const api = request
export default request



