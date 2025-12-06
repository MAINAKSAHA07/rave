'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/events', icon: '🎫', label: 'Events' },
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
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

