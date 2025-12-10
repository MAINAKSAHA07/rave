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
    <nav 
      className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t border-white/10 z-50"
      style={{ 
        background: 'linear-gradient(180deg, rgba(16,16,25,0.95) 0%, rgba(5,5,9,0.92) 100%)',
        boxShadow: '0 -2px 14px rgba(0, 0, 0, 0.5), 0 -1px 0 rgba(168,85,247,0.12)',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}
    >
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
                {/* Icon - Consistent weight and alignment */}
                <div className="relative mb-1">
                  <div
                    className={`flex items-center justify-center rounded-full transition-all duration-200 ${isActive ? 'w-10 h-10' : 'w-8 h-8'}`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)',
                      boxShadow: '0 0 18px rgba(168,85,247,0.55)'
                    } : {
                      background: 'rgba(255,255,255,0.06)'
                    }}
                  >
                    <IconComponent
                      className={`transition-colors duration-200 ${
                        isActive ? 'text-white' : 'text-[rgba(255,255,255,0.5)] group-hover:text-[rgba(255,255,255,0.85)]'
                      }`}
                      style={{ 
                        width: '22px', 
                        height: '22px', 
                        strokeWidth: isActive ? 2.5 : 2 
                      }}
                    />
                  </div>
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center" 
                      style={{ 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                )}
                </div>
                
                {/* Label - Smaller font size */}
                <span
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-[#C4B5FD] font-medium' : 'text-[rgba(255,255,255,0.6)] group-hover:text-[rgba(255,255,255,0.85)] font-normal'
                  }`}
                  style={{ 
                    fontSize: '9px', 
                    lineHeight: '1.2', 
                    letterSpacing: '0.01em',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  {item.label}
                </span>
                
                {/* Active State Underline */}
                {isActive && (
                  <div 
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #A855F7 0%, #3B82F6 50%, #C4B5FD 100%)',
                      boxShadow: '0 0 8px rgba(168, 85, 247, 0.45)'
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

