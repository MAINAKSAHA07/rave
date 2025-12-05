import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Sparkles from '@/components/Sparkles'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rave - Event Ticketing Platform',
  description: 'Modern event ticketing platform for India',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`} suppressHydrationWarning>
        <Sparkles />
        <Navigation />
        <main className="relative z-10 pt-20">
          {children}
        </main>
      </body>
    </html>
  )
}

