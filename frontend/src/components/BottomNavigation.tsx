'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { getItemCount } = useCart();
  const cartItemCount = getItemCount();

  const navItems = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/events', icon: '🎫', label: 'Events' },
    { href: '/cart', icon: '🛒', label: 'Cart', badge: cartItemCount > 0 ? cartItemCount : null },
    { href: '/my-tickets', icon: '🎧', label: 'Tickets' },
    { href: '/profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-[428px] mx-auto">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${
                  isActive ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                <span className="text-2xl mb-1 relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

