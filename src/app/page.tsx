import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center lg:pt-32">
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-7xl">
            Connect your{' '}
            <span className="relative whitespace-nowrap text-blue-600">
              <span className="relative">family</span>
            </span>{' '}
            in branches of love
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700">
            Share precious moments, milestones, and memories with the people who matter most. 
            Create private branches for different parts of your family journey.
          </p>
          <div className="mt-10 flex justify-center gap-x-6">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center justify-center rounded-full py-2 px-4 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 bg-blue-600 text-white hover:text-slate-100 hover:bg-blue-500 active:bg-blue-800 active:text-blue-100 focus-visible:outline-blue-600"
            >
              Start your tree
            </Link>
            <Link
              href="/auth/login"
              className="group inline-flex ring-1 items-center justify-center rounded-full py-2 px-4 text-sm focus:outline-none ring-slate-200 text-slate-700 hover:text-slate-900 hover:ring-slate-300 active:bg-slate-100 active:text-slate-600 focus-visible:outline-blue-600 focus-visible:ring-slate-300"
            >
              Sign in
            </Link>
          </div>
        </div>
        
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Private Family Branches</h3>
              <p className="text-slate-600">Create separate branches for different children, topics, or family groups. Control exactly who sees what.</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Rich Memories</h3>
              <p className="text-slate-600">Share photos, videos, voice notes, and milestone moments. Every precious memory in one beautiful timeline.</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Grandparent Friendly</h3>
              <p className="text-slate-600">Easy web viewing for grandparents and family members who prefer not to download apps. No barriers to love.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
