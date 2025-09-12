'use client'

import { usePathname } from 'next/navigation'
import Navigation from '@/components/navigation/Navigation'
import { useNavigation } from '@/hooks/useNavigation'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, loading } = useNavigation()
  const pathname = usePathname()
  
  // Don't render global navigation on dashboard - it has its own minimal navigation
  const showNavigation = !pathname.startsWith('/dashboard')

  return (
    <>
      {showNavigation && <Navigation user={user} />}
      <main className="min-h-screen bg-gradient-to-br from-sky-50 to-leaf-50">
        {children}
      </main>
    </>
  )
}