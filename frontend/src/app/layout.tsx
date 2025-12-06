import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Sparkles from '@/components/Sparkles'

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
        <div className="min-h-screen py-4 px-4">
          <div className="mobile-container bg-white text-gray-900 relative">
            <Sparkles />
            <Navigation />
            <main className="relative z-10">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}

