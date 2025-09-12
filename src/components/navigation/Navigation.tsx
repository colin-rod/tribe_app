'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/IconLibrary'
import { Button } from '@/components/ui/button'

interface NavigationProps {
  user?: User | null
}

interface Breadcrumb {
  label: string
  href?: string
  icon?: string
}

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = (): Breadcrumb[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: Breadcrumb[] = [
      { label: 'Grove', href: '/', icon: 'treePine' }
    ]

    if (!user) {
      return breadcrumbs
    }

    // Add user-specific breadcrumbs
    if (segments.includes('dashboard')) {
      breadcrumbs.push({ label: 'Dashboard', href: '/dashboard', icon: 'trees' })
    }
    
    if (segments.includes('trees')) {
      breadcrumbs.push({ label: 'Trees', href: '/trees', icon: 'trees' })
      
      // If viewing specific tree leaves
      if (segments.includes('leaves')) {
        const treeId = segments[segments.indexOf('trees') + 1]
        breadcrumbs.push({ 
          label: 'Memories', 
          href: `/trees/${treeId}/leaves`, 
          icon: 'leaf' 
        })
      }
    }
    
    if (segments.includes('branches')) {
      breadcrumbs.push({ label: 'Branches', icon: 'sprout' })
    }
    
    if (segments.includes('settings')) {
      breadcrumbs.push({ label: 'Settings', href: '/settings', icon: 'settings' })
    }
    
    if (segments.includes('profile')) {
      breadcrumbs.push({ label: 'Profile', href: '/profile', icon: 'user' })
    }

    return breadcrumbs
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const breadcrumbs = getBreadcrumbs()
  const isAuthPage = pathname.includes('/auth/')
  const isLandingPage = pathname === '/'

  // Don't show nav on auth pages or landing page
  if (isAuthPage || isLandingPage) {
    return null
  }

  return (
    <nav className="bg-white/90 backdrop-blur-sm border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Breadcrumbs */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <Icon name="trees" size="lg" className="text-leaf-600" />
              <h1 className="text-xl font-semibold text-gray-900">Tribe</h1>
            </Link>
            
            {/* Breadcrumb Trail */}
            {breadcrumbs.length > 1 && (
              <div className="flex items-center space-x-2 text-sm">
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <Icon 
                        name="chevronRight" 
                        size="sm" 
                        className="text-gray-400 mx-2" 
                      />
                    )}
                    {breadcrumb.href ? (
                      <Link 
                        href={breadcrumb.href}
                        className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {breadcrumb.icon && (
                          <Icon name={breadcrumb.icon as any} size="xs" />
                        )}
                        <span className="hidden sm:inline">{breadcrumb.label}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center space-x-1 text-gray-700">
                        {breadcrumb.icon && (
                          <Icon name={breadcrumb.icon as any} size="xs" />
                        )}
                        <span className="hidden sm:inline font-medium">{breadcrumb.label}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <div className="w-8 h-8 bg-leaf-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-leaf-700">
                        {user?.user_metadata?.first_name?.[0]}{user?.user_metadata?.last_name?.[0]}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          window.location.href = '/profile'
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Icon name="user" size="sm" className="text-gray-500" />
                        <span className="text-sm text-gray-700">Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          window.location.href = '/settings'
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Icon name="settings" size="sm" className="text-gray-500" />
                        <span className="text-sm text-gray-700">Settings</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => {
                          handleSignOut()
                          setIsMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                      >
                        <Icon name="logOut" size="sm" className="text-red-500" />
                        <span className="text-sm">Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/login">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-leaf-100/20 border-bark-300 text-bark-400 hover:bg-leaf-100/40"
                  >
                    <Icon name="leaf" size="xs" className="mr-1" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button 
                    variant="bark" 
                    size="sm"
                    className="shadow-lg"
                  >
                    <Icon name="treePine" size="xs" className="mr-1" />
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-25 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </nav>
  )
}