'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

import HomeIcon3D from '@/components/icons/3d/HomeIcon3D';
import ConcertIcon3D from '@/components/icons/3d/ConcertIcon3D';
import CartIcon3D from '@/components/icons/3d/CartIcon3D';
import TicketIcon3D from '@/components/icons/3d/TicketIcon3D';
import ProfileIcon3D from '@/components/icons/3d/ProfileIcon3D';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { getItemCount } = useCart();
  const cartItemCount = getItemCount();

  const navItems = [
    { href: '/', Component: HomeIcon3D, label: 'Home' },
    { href: '/events', Component: ConcertIcon3D, label: 'Events' },
    { href: '/cart', Component: CartIcon3D, label: 'Cart', badge: cartItemCount > 0 ? cartItemCount : null },
    { href: '/my-tickets', Component: TicketIcon3D, label: 'Tickets' },
    { href: '/profile', Component: ProfileIcon3D, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-xl border-t border-white/10 z-50">
      <div className="max-w-[428px] mx-auto">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                <div className="w-8 h-8 pointer-events-none relative">
                  <item.Component />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm z-10">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

