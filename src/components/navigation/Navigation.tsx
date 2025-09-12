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

  // Don't show nav on auth pages
  if (isAuthPage) {
    return null
  }

  return (
    <nav className="bg-gradient-to-r from-leaf-500 to-leaf-600 shadow-lg border-b-4 border-bark-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Breadcrumbs */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center">
              <Icon name="treePine" size="lg" className="text-bark-400" />
              <span className="ml-2 text-xl font-bold text-bark-400 font-display hidden sm:block">
                Tribe
              </span>
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
                        className="text-bark-300 mx-2" 
                      />
                    )}
                    {breadcrumb.href ? (
                      <Link 
                        href={breadcrumb.href}
                        className="flex items-center space-x-1 text-bark-300 hover:text-bark-400 transition-colors"
                      >
                        {breadcrumb.icon && (
                          <Icon name={breadcrumb.icon as any} size="xs" />
                        )}
                        <span className="hidden sm:inline">{breadcrumb.label}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center space-x-1 text-bark-400">
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
                {/* Quick Actions */}
                <div className="hidden md:flex items-center space-x-3">
                  <Link href="/dashboard">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-leaf-100/20 border-bark-300 text-bark-400 hover:bg-leaf-100/40"
                    >
                      <Icon name="trees" size="xs" className="mr-1" />
                      Dashboard
                    </Button>
                  </Link>
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 text-bark-400 hover:text-bark-300 transition-colors"
                  >
                    <div className="w-8 h-8 bg-bark-400 rounded-full flex items-center justify-center">
                      <Icon name="user" size="sm" className="text-leaf-100" />
                    </div>
                    <Icon name="chevronDown" size="xs" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border-2 border-leaf-300 z-50">
                      <div className="py-2">
                        <Link 
                          href="/profile"
                          className="block px-4 py-2 text-sm text-bark-400 hover:bg-leaf-100 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Icon name="user" size="xs" className="mr-2" />
                          Profile
                        </Link>
                        <Link 
                          href="/settings"
                          className="block px-4 py-2 text-sm text-bark-400 hover:bg-leaf-100 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Icon name="settings" size="xs" className="mr-2" />
                          Settings
                        </Link>
                        <hr className="my-2 border-leaf-200" />
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-bark-400 hover:bg-leaf-100 transition-colors"
                        >
                          <Icon name="x" size="xs" className="mr-2" />
                          Sign Out
                        </button>
                      </div>
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