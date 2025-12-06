import type { Metadata } from 'next'
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Sparkles from '@/components/Sparkles'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Powerglide - Event Ticketing Platform',
  description: 'Modern event ticketing platform for India',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (

    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jakarta.variable} font-body min-h-screen antialiased`} suppressHydrationWarning>
        <div className="min-h-screen py-4 px-4 overflow-x-hidden">
          <div className="mobile-container relative">
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

