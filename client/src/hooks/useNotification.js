import { useState, useCallback } from 'react'
import { notificationApi } from '../services/api'
import { toast } from 'react-toastify'

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/**
 * Hook to manage Web Push notification subscription
 */
export const useNotification = () => {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [permission, setPermission] = useState(Notification?.permission || 'default')

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
      return !!sub
    } catch {
      return false
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications not supported in this browser.')
      return false
    }

    setLoading(true)
    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        toast.warning('Notification permission denied.')
        return false
      }

      // Get VAPID public key from server
      const { data } = await notificationApi.getPublicKey()
      if (!data.publicKey) {
        toast.error('Push notifications not configured on server.')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey)
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      // Save subscription to server
      await notificationApi.subscribe({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      })

      setIsSubscribed(true)
      toast.success('🔔 Push notifications enabled!')
      return true
    } catch (err) {
      console.error('Subscribe error:', err)
      toast.error('Failed to enable notifications.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await notificationApi.unsubscribe({ endpoint: sub.endpoint })
        await sub.unsubscribe()
        setIsSubscribed(false)
        toast.info('Notifications disabled.')
      }
    } catch {
      toast.error('Failed to disable notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  const sendTest = useCallback(async () => {
    try {
      await notificationApi.test()
      toast.success('Test notification sent!')
    } catch {
      toast.error('No active subscription. Enable notifications first.')
    }
  }, [])

  return { isSubscribed, loading, permission, subscribe, unsubscribe, sendTest, checkSubscription }
}
