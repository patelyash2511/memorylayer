export const API_BASE = 'https://memorylayer-production.up.railway.app/v1'

const SESSION_COOKIE = 'session_token'
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30

export function getSessionToken() {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=')[1] ?? null
}

export function setSessionToken(token) {
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${SESSION_AGE_SECONDS}; SameSite=Strict; Secure`
  notifyAuthChange()
}

export function clearSessionToken() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Strict; Secure`
  notifyAuthChange()
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event('authchange'))
}

export async function fetchWithSession(path, options = {}) {
  const token = getSessionToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('X-Session-Token', token)
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })
}

export async function checkAuthStatus() {
  const token = getSessionToken()
  if (!token) {
    return false
  }

  try {
    const response = await fetchWithSession('/auth/me')
    return response.ok
  } catch {
    return false
  }
}
