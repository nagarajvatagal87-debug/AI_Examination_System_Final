import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

const storedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('auth_token')
    delete api.defaults.headers.common['Authorization']
  }
}

export default api