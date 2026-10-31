import React, { createContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: () => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { user }, error: sessionError } = await supabase.auth.getUser()
        if (sessionError) throw sessionError
        setUser(user || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const getOAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUrl = `${window.location.origin}/auth/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: 'email profile',
      hd: 'agenciasurto.com',
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  const login = () => {
    window.location.href = getOAuthUrl()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
