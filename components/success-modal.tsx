"use client"

import { useEffect, useState } from "react"

export function SuccessModal() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white rounded-lg p-8 text-center max-w-sm mx-4 animate-in fade-in zoom-in">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-primary mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-4">Your tickets have been confirmed. Check your email for details.</p>
        <p className="text-sm text-muted-foreground">Redirecting you back...</p>
      </div>
    </div>
  )
}
