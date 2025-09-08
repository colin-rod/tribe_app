'use client'

import Link from 'next/link'
import { useParallax, useShakeDetection, useParticleEffect } from '@/hooks/useTactileInteractions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { animated, useSpring } from '@react-spring/web'
import { useEffect, useState } from 'react'

export default function Home() {
  const scrollY = useParallax()
  const createParticles = useParticleEffect()
  const [showEasterEgg, setShowEasterEgg] = useState(false)
  
  // Parallax animations
  const [backgroundSpring, backgroundApi] = useSpring(() => ({
    transform: 'translateY(0px) scale(1)'
  }))
  
  const [heroSpring, heroApi] = useSpring(() => ({
    transform: 'translateY(0px)',
    opacity: 1
  }))
  
  // Shake easter egg
  useShakeDetection(() => {
    setShowEasterEgg(true)
    createParticles(window.innerWidth / 2, window.innerHeight / 2, 20)
    setTimeout(() => setShowEasterEgg(false), 3000)
  })
  
  // Parallax effect on scroll
  useEffect(() => {
    backgroundApi.start({
      transform: `translateY(${scrollY * 0.5}px) scale(${1 + scrollY * 0.0001})`
    })
    heroApi.start({
      transform: `translateY(${scrollY * 0.3}px)`,
      opacity: Math.max(0.3, 1 - scrollY * 0.001)
    })
  }, [scrollY, backgroundApi, heroApi])

  return (
    <div className="min-h-screen bg-gradient-to-br from-ac-cream via-ac-sky-light to-ac-peach-light relative overflow-hidden">
      {/* Background decorative elements */}
      <animated.div className="absolute inset-0" style={backgroundSpring}>
        <div className="absolute top-20 left-20 w-32 h-32 bg-ac-sage/10 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-ac-peach/15 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 bg-ac-lavender/8 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 bg-ac-yellow/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Floating emojis */}
        <div className="absolute top-32 left-1/4 text-4xl animate-bounce opacity-20" style={{ animationDelay: '0s' }}>🌸</div>
        <div className="absolute top-1/2 right-1/4 text-3xl animate-bounce opacity-15" style={{ animationDelay: '1s' }}>🦋</div>
        <div className="absolute bottom-40 left-1/3 text-5xl animate-bounce opacity-25" style={{ animationDelay: '2s' }}>🌿</div>
        <div className="absolute bottom-1/4 right-1/3 text-2xl animate-bounce opacity-30" style={{ animationDelay: '1.5s' }}>🍃</div>
      </animated.div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <animated.div className="pt-20 pb-16 text-center lg:pt-32" style={heroSpring}>
          <div className="relative">
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-bold tracking-tight text-ac-brown-dark sm:text-7xl mb-8">
              Connect your{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-ac-sage to-ac-sage-light bg-clip-text text-transparent font-black">
                  family
                </span>
                <div className="absolute -bottom-2 left-0 right-0 h-3 bg-ac-yellow/30 rounded-full transform -rotate-1"></div>
              </span>{' '}
              in branches of love
            </h1>
            
            {/* Decorative elements around title */}
            <div className="absolute -top-8 left-1/4 text-3xl animate-spin" style={{ animationDuration: '8s' }}>🌻</div>
            <div className="absolute -top-4 right-1/4 text-2xl animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>🌱</div>
          </div>
          
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-ac-brown-dark font-medium">
            Share precious moments, milestones, and memories in completely private family spaces. 
            Every branch is invite-only, keeping your family memories safe and intimate.
          </p>
          
          <div className="mt-12 flex justify-center gap-x-6 flex-wrap">
            <Button
              variant="wooden"
              size="lg"
              particles
              className="shadow-xl text-lg px-8 py-4 mb-4"
            >
              <Link href="/auth/signup" className="flex items-center">
                <span className="mr-2">🌳</span>
                Start your tree
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="shadow-lg text-lg px-8 py-4 mb-4"
            >
              <Link href="/auth/login" className="flex items-center">
                <span className="mr-2">🌿</span>
                Sign in
              </Link>
            </Button>
          </div>
          
          {showEasterEgg && (
            <div className="mt-6 animate-bounce">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-ac-brown font-display text-lg bg-ac-yellow/20 px-4 py-2 rounded-full border-2 border-ac-yellow inline-block">
                You found the secret shake! 🎊
              </p>
            </div>
          )}
        </animated.div>
        
        <div className="mx-auto max-w-6xl mt-20">
          <h2 className="text-3xl font-bold text-center text-ac-brown-dark font-display mb-12">
            🌸 Why families love our grove 🌸
          </h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            <Card 
              variant="bulletin" 
              className="p-8 hover:rotate-0 transition-all duration-500 transform hover:scale-105"
            >
              <div className="w-16 h-16 bg-ac-sage-light rounded-full flex items-center justify-center mb-6 border-4 border-ac-sage shadow-lg mx-auto">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-bold text-ac-brown-dark mb-4 font-display text-center">Always Private & Secure</h3>
              <p className="text-ac-brown leading-relaxed text-center">
                Create separate branches for different children, topics, or family groups. 
                Only invited family members can see your precious content.
              </p>
            </Card>
            
            <Card 
              variant="polaroid" 
              className="p-8 hover:rotate-0 transition-all duration-500 transform hover:scale-105"
            >
              <div className="w-16 h-16 bg-ac-peach-light rounded-full flex items-center justify-center mb-6 border-4 border-ac-peach shadow-lg mx-auto">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="text-xl font-bold text-ac-brown-dark mb-4 font-display text-center">Rich Memories & Milestones</h3>
              <p className="text-ac-brown leading-relaxed text-center">
                Share photos, videos, voice notes, and milestone moments with AI-powered prompts 
                to help capture every precious memory.
              </p>
            </Card>
            
            <Card 
              variant="wooden" 
              className="p-8 hover:rotate-0 transition-all duration-500 transform hover:scale-105"
            >
              <div className="w-16 h-16 bg-ac-lavender rounded-full flex items-center justify-center mb-6 border-4 border-purple-300 shadow-lg mx-auto">
                <span className="text-3xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="text-xl font-bold text-ac-brown-dark mb-4 font-display text-center">Family Friendly Design</h3>
              <p className="text-ac-cream leading-relaxed text-center">
                Easy access for all family members including grandparents. 
                Real-time sharing and simple invitation system.
              </p>
            </Card>
          </div>
          
          {/* Bottom decoration */}
          <div className="text-center mt-16 opacity-60">
            <div className="flex justify-center items-center space-x-4 text-2xl">
              <span className="animate-bounce" style={{ animationDelay: '0s' }}>🌿</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🌸</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>🦋</span>
              <span className="animate-bounce" style={{ animationDelay: '0.6s' }}>🌻</span>
              <span className="animate-bounce" style={{ animationDelay: '0.8s' }}>🍃</span>
            </div>
            <p className="mt-4 text-ac-brown-light font-display text-sm">
              💫 Shake your device for a surprise! 💫
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
