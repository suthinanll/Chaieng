'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'  
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการล็อกอิน'
      setErrorMsg(message)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-violet-600/10 dark:bg-violet-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-100 w-[400px] rounded-full bg-pink-500/[0.02] dark:bg-pink-500/5 blur-[120px]" />

      <div className="w-full max-w-sm lg:max-w-md rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 p-8 lg:p-12 text-center backdrop-blur-xl shadow-xl dark:shadow-2xl transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20">
        <div className="mb-8">
          <Image src={isDarkMode ? "/darklogo.png" : "/lightlogo.png"} alt="Logo" className="w-60 mx-auto" width={100} height={100} />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            ระบบแอปพลิเคชันที่ทำเองเพื่อ "ใช้เอง"
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white border border-slate-200 dark:border-transparent px-5 py-4 lg:py-5 font-semibold text-slate-900 shadow-md transition-all duration-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.05,3.1v2.58h3.29c1.92,-1.77 3.03,-4.38 3.03,-7.38c0,-0.74 -0.07,-1.4 -0.3,-2.0z" fill="#4285F4" />
                  <path d="M12,20.4c2.54,0 4.67,-0.84 6.22,-2.3l-3.29,-2.58c-0.91,0.61 -2.08,0.98 -2.93,0.98c-2.26,0 -4.17,-1.53 -4.85,-3.59H3.77v2.66c1.57,3.11 4.79,5.25 8.23,5.25z" fill="#34A853" />
                  <path d="M7.15,12.91c-0.17,-0.52 -0.27,-1.08 -0.27,-1.66s0.1,-1.14 0.27,-1.66V6.93H3.77C3.13,8.2 2.77,9.65 2.77,11.25s0.36,3.05 1.0,4.32l3.38,-2.66z" fill="#FBBC05" />
                  <path d="M12,5.22c1.38,0 2.62,0.48 3.59,1.41l2.69,-2.69C16.66,2.41 14.53,1.5 12,1.5C8.56,1.5 5.34,3.64 3.77,6.75l3.38,2.66c0.68,-2.06 2.59,-3.59 4.85,-3.59z" fill="#EA4335" />
                </g>
              </svg>
            )}
            <span className="text-base font-medium">เข้าสู่ระบบด้วย Google</span>
          </button>

          {errorMsg && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          <p>© 2026 Suthinanll. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}
