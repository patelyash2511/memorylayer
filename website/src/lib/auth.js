export const API_BASE = 'https://memorylayer-production.up.railway.app/v1'

export function clearSessionToken() {
  notifyAuthChange()
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event('authchange'))
}

export async function fetchWithSession(path, options = {}) {
  const headers = new Headers(options.headers || {})

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

export async function checkAuthStatus() {
  try {
    const response = await fetchWithSession('/auth/me')
    return response.ok
  } catch {
    return false
  }
}
