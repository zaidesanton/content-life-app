'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

function LoginContent() {
  const params = useSearchParams()
  const unauthorized = params.get('error') === 'unauthorized'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-[22px] font-semibold text-white tracking-tight">Content + Life</h1>
          <p className="text-[13px] text-[#666]">Your personal dashboard</p>
        </div>

        {unauthorized && (
          <div className="w-full bg-[#1a0a0a] border border-[#3a1a1a] rounded-xl px-4 py-3 text-center space-y-1">
            <p className="text-[13px] text-[#ff6b6b]">Access restricted</p>
            <p className="text-[12px] text-[#888]">
              Contact{' '}
              <a href="mailto:anton@manager.dev" className="text-[#aaa] hover:text-white transition-colors underline underline-offset-2">
                anton@manager.dev
              </a>{' '}
              to request access.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full bg-[#111] border border-[#252525] rounded-xl px-4 py-3 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="w-full bg-[#111] border border-[#252525] rounded-xl px-4 py-3 text-[13px] text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
          />
          {error && (
            <p className="text-[12px] text-[#ff6b6b] text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#242424] text-[#ccc] hover:text-white rounded-xl px-4 py-3 text-[13px] font-medium transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px] text-[#444] text-center">Private app — by invitation only</p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
