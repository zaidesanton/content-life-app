'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function LoginContent() {
  const params = useSearchParams()
  const unauthorized = params.get('error') === 'unauthorized'

  async function signInWithGoogle() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-[22px] font-semibold text-white tracking-tight">
            Content + Life
          </h1>
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

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-[#161616] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#1c1c1c] text-[#ccc] hover:text-white rounded-xl px-4 py-3 text-[13px] font-medium transition-all"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="text-[11px] text-[#444] text-center">
          Private app — by invitation only
        </p>
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
