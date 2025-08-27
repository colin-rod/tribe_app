// Service Worker for Tree App Web Push Notifications

const CACHE_NAME = 'tree-app-v1'
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)

  if (!event.data) {
    console.log('Push event has no data')
    return
  }

  const data = event.data.json()
  const { title, body, badge, icon, data: notificationData } = data

  const options = {
    body: body || 'You have new activity',
    icon: icon || '/icon-192x192.png',
    badge: badge || '/icon-192x192.png',
    data: notificationData || {},
    tag: notificationData?.branch_id || 'default',
    renotify: true,
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title || 'Tree App', options)
  )
})

// Notification click event - handle user interactions
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Handle the click - focus existing tab or open new one
  const urlToOpen = event.notification.data?.url || '/dashboard'
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Try to find an existing tab with the app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Focus the existing tab and navigate to the specific page
          return client.focus().then(() => {
            return client.navigate(urlToOpen)
          })
        }
      }
      
      // No existing tab found, open a new one
      return clients.openWindow(urlToOpen)
    })
  )
})

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      Promise.resolve()
    )
  }
})

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})