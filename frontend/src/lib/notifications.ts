// Helper functions for showing notifications
// Developed by mainak saha

import { useNotifications } from '@/contexts/NotificationContext';

export function useNotificationHelpers() {
  const { showNotification } = useNotifications();

  const notifySuccess = (title: string, message?: string) => {
    showNotification({
      type: 'success',
      title,
      message,
      duration: 5000,
    });
  };

  const notifyError = (title: string, message?: string) => {
    showNotification({
      type: 'error',
      title,
      message,
      duration: 7000,
    });
  };

  const notifyInfo = (title: string, message?: string) => {
    showNotification({
      type: 'info',
      title,
      message,
      duration: 5000,
    });
  };

  const notifyWarning = (title: string, message?: string) => {
    showNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
    });
  };

  return {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
  };
}


