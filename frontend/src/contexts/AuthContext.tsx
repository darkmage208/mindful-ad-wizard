import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'
import { authAPI } from '@/lib/api'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token && mounted) {
          const response = await authAPI.me()
          if (mounted) {
            setUser(response.data.data.user)
          }
        }
      } catch (error) {
        if (mounted) {
          localStorage.removeItem('token')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])


  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    const { user, accessToken } = response.data.data
    localStorage.setItem('token', accessToken)
    setUser(user)
  }

  const register = async (name: string, email: string, password: string) => {
    const response = await authAPI.register(name, email, password)
    const { user, accessToken } = response.data.data
    localStorage.setItem('token', accessToken)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    authAPI.logout().catch(() => {})
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}