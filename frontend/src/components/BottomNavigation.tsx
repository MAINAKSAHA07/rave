'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { Home, Calendar, ShoppingCart, Ticket, User } from 'lucide-react';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { getItemCount } = useCart();
  const cartItemCount = getItemCount();

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/events', icon: Calendar, label: 'Events' },
    { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: cartItemCount > 0 ? cartItemCount : null },
    { href: '/my-tickets', icon: Ticket, label: 'Tickets' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 z-50" style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
      <div className="max-w-[428px] mx-auto">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full transition-all relative group"
              >
                {isActive && (
                  <div className="w-10 h-10 rounded-full bg-[#CE83FF]/20 flex items-center justify-center mb-1" style={{ boxShadow: '0 2px 8px rgba(206, 131, 255, 0.3)' }}>
                    <IconComponent
                      className="text-[#CE83FF]"
                      style={{ width: '20px', height: '20px', strokeWidth: 2 }}
                    />
                  </div>
                )}
                {!isActive && (
                  <IconComponent
                    className="text-gray-600 group-hover:text-gray-800"
                    style={{ width: '20px', height: '20px', strokeWidth: 1.5 }}
                  />
                )}
                <span
                  className={`mt-1 transition-colors ${isActive ? 'text-[#CE83FF] font-semibold' : 'text-gray-600 group-hover:text-gray-800 font-normal'}`}
                  style={{ fontSize: '12px', lineHeight: '1.4' }}
                >
                  {item.label}
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-1/2 translate-x-3 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

