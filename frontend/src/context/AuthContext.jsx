import { createContext, useContext, useState, useEffect } from 'react'
import api, { setAuthToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user_session')
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        const cachedAvatar = localStorage.getItem('user_avatar')
        if (cachedAvatar && !parsed.avatarUrl) {
          parsed.avatarUrl = cachedAvatar
          parsed.avatar_url = cachedAvatar
        }
        return parsed
      }
    } catch (e) {}
    return null
  })

  // Synchronize profile & avatar from backend on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      setAuthToken(token)
      api.get('/profile')
        .then((res) => {
          if (res.data) {
            const avatar = res.data.avatarUrl || res.data.avatar_url || localStorage.getItem('user_avatar') || null
            if (avatar) {
              localStorage.setItem('user_avatar', avatar)
            }
            setUser((prev) => {
              const updated = {
                ...(prev || {}),
                id: res.data.id || prev?.id,
                role: res.data.role || prev?.role,
                fullName: res.data.full_name || res.data.fullName || prev?.fullName,
                full_name: res.data.full_name || prev?.full_name,
                email: res.data.email || prev?.email,
                avatarUrl: avatar,
                avatar_url: avatar,
                registrationNo: res.data.registration_no || prev?.registrationNo,
                department_id: res.data.department_id || prev?.department_id,
              }
              localStorage.setItem('user_session', JSON.stringify(updated))
              return updated
            })
          }
        })
        .catch(() => {})
    }
  }, [])

  // Listen for avatar updates across components
  useEffect(() => {
    function handleAvatarUpdate(e) {
      const newAvatar = e.detail?.avatarUrl || localStorage.getItem('user_avatar')
      if (newAvatar) {
        setUser((prev) => {
          if (!prev) return prev
          const updated = { ...prev, avatarUrl: newAvatar, avatar_url: newAvatar }
          localStorage.setItem('user_session', JSON.stringify(updated))
          return updated
        })
      }
    }
    window.addEventListener('user_avatar_updated', handleAvatarUpdate)
    return () => window.removeEventListener('user_avatar_updated', handleAvatarUpdate)
  }, [])

  const login = (userData) => {
    const avatar = userData.avatarUrl || userData.avatar_url || localStorage.getItem('user_avatar') || null
    const completeUser = {
      ...userData,
      avatarUrl: avatar,
      avatar_url: avatar,
    }
    if (avatar) {
      localStorage.setItem('user_avatar', avatar)
    }
    setUser(completeUser)
    localStorage.setItem('user_session', JSON.stringify(completeUser))
  }

  const updateUser = (data) => {
    setUser((prev) => {
      const avatar = data.avatarUrl || data.avatar_url || prev?.avatarUrl || localStorage.getItem('user_avatar') || null
      if (avatar) {
        localStorage.setItem('user_avatar', avatar)
      }
      const updated = {
        ...(prev || {}),
        ...data,
        avatarUrl: avatar,
        avatar_url: avatar,
      }
      localStorage.setItem('user_session', JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { avatarUrl: avatar } }))
      return updated
    })
  }

  const logout = () => {
    localStorage.removeItem('user_session')
    localStorage.removeItem('user_avatar')
    setAuthToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}