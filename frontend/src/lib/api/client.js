// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5555/api'
const BASE_URL = 'http://localhost:5555/api'


export class ApiClientError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // flask-jwt-extended errors come back as {"msg": "..."}; our own API errors as {"error": "..."}
    // or {"details": [...]}  — check all three so auth failures don't fall through to a generic message.
    const message = data?.error || data?.msg || data?.details?.[0]?.message || 'Something went wrong'
    throw new ApiClientError(message, res.status)
  }

  return data
}

async function requestBlob(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const message = data?.error || data?.msg || data?.details?.[0]?.message || 'Something went wrong'
    throw new ApiClientError(message, res.status)
  }

  return res.blob()
}

export const api = {
  get: (path, token) => request(path, { method: 'GET', token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  patch: (path, body, token) => request(path, { method: 'PATCH', body, token }),
  delete: (path, token) => request(path, { method: 'DELETE', token }),
  getBlob: (path, token) => requestBlob(path, token),
}
