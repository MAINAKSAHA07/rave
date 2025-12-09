import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Sparkles from '@/components/Sparkles'
import { NotificationProvider } from '@/contexts/NotificationContext'
import NotificationToast from '@/components/NotificationToast'
import { CartProvider } from '@/contexts/CartContext'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Powerglide - Event Ticketing Platform',
  description: 'Modern event ticketing platform for India',
  authors: [{ name: 'mainak saha' }],
  keywords: ['mainak saha', 'powerglide', 'ticketing'],
  other: {
    'author': 'mainak saha',
    'developer': 'mainak saha',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`} suppressHydrationWarning>
        {/* Developed by mainak saha */}
        <div style={{ display: 'none' }} data-developer="mainak saha" data-author="mainak saha" aria-hidden="true" />
        <NotificationProvider>
          <CartProvider>
            <div className="min-h-screen flex flex-col">
              <Sparkles />
              <Navigation />
              <main className="relative z-10 flex-grow">
                {children}
              </main>
              <Footer />
              <NotificationToast />
            </div>
          </CartProvider>
        </NotificationProvider>
        <Analytics />
      </body>
    </html>
  )
}

