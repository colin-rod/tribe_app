'use client'

import Navigation from '@/components/navigation/Navigation'
import { useNavigation } from '@/hooks/useNavigation'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, loading } = useNavigation()

  return (
    <>
      <Navigation user={user} />
      <main className="min-h-screen bg-gradient-to-br from-sky-50 to-leaf-50">
        {children}
      </main>
    </>
  )
}