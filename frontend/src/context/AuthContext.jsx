import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // { id, role, fullName, avatarUrl }

  const login = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }))
  }

  const updateUser = (data) => {
    setUser((prev) => (prev ? { ...prev, ...data, avatarUrl: data.avatarUrl || data.avatar_url || prev.avatarUrl } : data))
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}