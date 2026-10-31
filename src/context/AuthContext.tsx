import React, { createContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { isAgenciaEmail } from '@/utils/types'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

async function saveGmailCredential(refreshToken: string) {
  const { error } = await supabase.functions.invoke('save-gmail-credential', {
    body: { refresh_token: refreshToken },
  })
  if (error) {
    console.error('Failed to save Gmail credential:', error.message)
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const applySession = async (session: Session | null) => {
      const sessionUser = session?.user ?? null
      if (sessionUser && !isAgenciaEmail(sessionUser.email ?? '')) {
        await supabase.auth.signOut()
        setUser(null)
        setError('Acesso permitido apenas para contas @agenciasurto.com.')
        return
      }
      setUser(sessionUser)
      // Google only returns this token right after sign-in
      if (sessionUser && session?.provider_refresh_token) {
        await saveGmailCredential(session.provider_refresh_token)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError
        return applySession(data.session)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro desconhecido'))
      .finally(() => setLoading(false))

    // Calling Supabase directly inside this callback can deadlock its auth lock
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => applySession(session), 0)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const login = async () => {
    setError(null)
    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/gmail.send',
        queryParams: {
          hd: 'agenciasurto.com',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (loginError) {
      setError(loginError.message)
    }
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
