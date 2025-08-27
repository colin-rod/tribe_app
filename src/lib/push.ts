// Web Push Notification Helper Library for Tree App

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export interface PushNotificationSupport {
  isSupported: boolean
  isGranted: boolean
  isDenied: boolean
  canRequestPermission: boolean
}

/**
 * Check if push notifications are supported and get permission status
 */
export function checkPushSupport(): PushNotificationSupport {
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
  
  if (!isSupported) {
    return {
      isSupported: false,
      isGranted: false,
      isDenied: false,
      canRequestPermission: false
    }
  }

  const permission = Notification.permission
  
  return {
    isSupported: true,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    canRequestPermission: permission === 'default'
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Register service worker and get push subscription
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    
    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error('VAPID public key not configured')
    }

    const registration = await registerServiceWorker()
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    // Send subscription to server
    if (subscription) {
      await sendSubscriptionToServer(subscription)
    }

    return subscription
  } catch (error) {
    console.error('Error subscribing to push:', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      const success = await subscription.unsubscribe()
      if (success) {
        await removeSubscriptionFromServer(subscription)
      }
      return success
    }
    
    return true
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    throw error
  }
}

/**
 * Send subscription data to server
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const subscriptionData = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth'))
    }
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscriptionData)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to save subscription: ${error.error}`)
  }
}

/**
 * Remove subscription from server
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to remove subscription: ${error.error}`)
  }
}

/**
 * Test push notification (for development/testing)
 */
export async function testPushNotification(): Promise<void> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported')
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  new Notification('Test Notification', {
    body: 'This is a test notification from Tree App',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  })
}

/**
 * Utility function to convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Utility function to convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Hook for React components to manage push notifications
 */
export function usePushNotifications() {
  const support = checkPushSupport()

  const subscribe = async () => {
    if (!support.isSupported) {
      throw new Error('Push notifications not supported')
    }

    if (support.isDenied) {
      throw new Error('Push notifications denied. Please enable them in browser settings.')
    }

    if (!support.isGranted) {
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        throw new Error('Push notification permission denied')
      }
    }

    return subscribeToPush()
  }

  const unsubscribe = async () => {
    return unsubscribeFromPush()
  }

  const test = async () => {
    return testPushNotification()
  }

  return {
    support,
    subscribe,
    unsubscribe,
    test
  }
}