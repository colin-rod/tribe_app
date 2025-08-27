'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile, Subscription } from '@/types/database'

interface Tree {
  tree_id: string
  role: string
  trees: {
    id: string
    name: string
  }
}

interface SidebarProps {
  user: User
  profile: Profile | null
  trees: Tree[]
  subscription: Subscription | null
}

export default function Sidebar({ user, profile, trees, subscription }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true
    if (path !== '/dashboard' && pathname.startsWith(path)) return true
    return false
  }

  const isPaidUser = subscription?.is_active && subscription?.plan !== 'free'
  
  // Provide fallback values
  const displayName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user.email?.split('@')[0] || 'User'
  const initials = profile?.first_name && profile?.last_name 
    ? `${profile.first_name[0]}${profile.last_name[0]}` 
    : user.email?.[0]?.toUpperCase() || 'U'

  // Primary navigation items
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
    },
    {
      name: 'My Tree',
      href: '/trees',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Branches',
      href: '/branches',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Assistant',
      href: '/assistant',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      isPro: true, // Assistant is a pro feature
    },
  ]

  // Secondary navigation items
  const secondaryNavigation = [
    {
      name: 'Profile',
      href: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-xl font-bold text-gray-900">Tree</h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          {profile?.avatar_url ? (
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={profile.avatar_url}
              alt={displayName}
            />
          ) : (
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {initials}
              </span>
            </div>
          )}
          
          {!collapsed && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {displayName}
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isPaidUser 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {subscription?.plan === 'pro' ? '✨ Pro' : '🌱 Free'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade button for free users */}
        {!collapsed && !isPaidUser && (
          <button
            onClick={() => router.push('/settings?tab=billing')}
            className="mt-3 w-full flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Upgrade to Pro
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const active = isActive(item.href)
          const disabled = item.isPro && !isPaidUser

          return (
            <button
              key={item.name}
              onClick={() => {
                if (disabled) {
                  router.push('/settings?tab=billing')
                } else {
                  router.push(item.href)
                }
              }}
              className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                active 
                  ? 'bg-blue-100 text-blue-700' 
                  : disabled 
                    ? 'text-gray-400 hover:text-gray-500 hover:bg-gray-50' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <span className={`flex-shrink-0 ${active ? 'text-blue-700' : ''}`}>
                {item.icon}
              </span>
              
              {!collapsed && (
                <span className="ml-3 flex-1 text-left">{item.name}</span>
              )}
              
              {!collapsed && disabled && (
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </button>
          )
        })}

        {/* Trees section - only if user has trees and sidebar is expanded */}
        {!collapsed && trees.length > 0 && (
          <div className="pt-4">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Your Trees
            </h3>
            <div className="mt-2 space-y-1">
              {trees.slice(0, 3).map((tree) => (
                <button
                  key={tree.tree_id}
                  onClick={() => router.push(`/trees/${tree.tree_id}`)}
                  className="w-full group flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                  <span className="ml-3 truncate">{tree.trees.name}</span>
                  <span className="ml-auto text-xs text-gray-400 capitalize">{tree.role}</span>
                </button>
              ))}
              
              {trees.length > 3 && (
                <button
                  onClick={() => router.push('/trees')}
                  className="w-full group flex items-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="ml-5 text-xs">View all ({trees.length})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Secondary Navigation */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="space-y-1">
          {secondaryNavigation.map((item) => {
            const active = isActive(item.href)
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  active 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <span className="flex-shrink-0">
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="ml-3">{item.name}</span>
                )}
              </button>
            )
          })}
          
          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full group flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && (
              <span className="ml-3">Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}