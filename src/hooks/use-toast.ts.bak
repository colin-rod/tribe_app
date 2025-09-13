import { showSuccess, showError, showWarning, showInfo } from '@/lib/toast-service'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    const message = description ? `${title}: ${description}` : title
    
    if (variant === 'destructive') {
      showError(message)
    } else {
      showSuccess(message)
    }
  }
  
  return { toast }
}