export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

// グローバルなToast配列を定義
const toastsState = () => useState<Toast[]>('app-toasts', () => [])
const toastCounterState = () => useState<number>('app-toast-counter', () => 0)

export const useToast = () => {
  const toasts = toastsState()
  const toastCounter = toastCounterState()

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${toastCounter.value++}`
    const newToast: Toast = {
      id,
      duration: 3000,
      ...toast
    }

    toasts.value.push(newToast)

    // 自動的に削除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message: string, duration: number = 3000) => {
    return addToast({ message, type: 'success', duration })
  }

  const error = (message: string, duration: number = 5000) => {
    return addToast({ message, type: 'error', duration })
  }

  const warning = (message: string, duration: number = 4000) => {
    return addToast({ message, type: 'warning', duration })
  }

  const info = (message: string, duration: number = 3000) => {
    return addToast({ message, type: 'info', duration })
  }

  const clear = () => {
    toasts.value = []
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clear
  }
}