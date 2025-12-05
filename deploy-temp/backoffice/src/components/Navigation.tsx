'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/pocketbase';

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Check if user has backoffice access
    if (currentUser && pathname !== '/login') {
      const hasAccess =
        currentUser.role === 'admin' ||
        currentUser.role === 'super_admin' ||
        currentUser.backoffice_access === true;

      if (!hasAccess) {
        window.location.href = '/login';
      }
    }
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              Rave Backoffice
            </Link>
            <div className="flex space-x-4">
              {(user?.backoffice_access || user?.role === 'admin' || user?.role === 'super_admin') && (
                <Link
                  href="/organizer"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname?.startsWith('/organizer')
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  Organizer
                </Link>
              )}
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <>
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname?.startsWith('/admin') &&
                        !pathname?.startsWith('/admin/users') &&
                        !pathname?.startsWith('/admin/tickets') &&
                        !pathname?.startsWith('/admin/orders')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    Admin
                  </Link>
                  <Link
                    href="/admin/orders"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname?.startsWith('/admin/orders')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    Orders
                  </Link>
                  <Link
                    href="/admin/tickets"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname?.startsWith('/admin/tickets')
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    Tickets
                  </Link>
                  {user?.role === 'super_admin' && (
                    <Link
                      href="/admin/users"
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname?.startsWith('/admin/users')
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      Users
                    </Link>
                  )}
                </>
              )}
              <Link
                href="/checkin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === '/checkin'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Check-In
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-600">
                {user.name} ({user.role})
              </span>
            )}
            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

