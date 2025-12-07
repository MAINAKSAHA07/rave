'use client';

import { useEffect, useState } from 'react';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationToast() {
  const { notifications, clearNotification, markAsRead } = useNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Show only unread notifications that haven't expired
    const unread = notifications.filter((n) => !n.read && (!n.duration || n.duration > 0));
    setVisibleNotifications(unread.slice(0, 3)); // Show max 3 at a time
  }, [notifications]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBgColor(notification.type)} border-2 rounded-xl p-4 shadow-lg animate-in slide-in-from-right duration-300`}
          onMouseEnter={() => markAsRead(notification.id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
              {notification.message && (
                <p className="text-gray-600 text-xs mt-1">{notification.message}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={() => clearNotification(notification.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}


