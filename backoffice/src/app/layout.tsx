import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Powerglide Backoffice - Organizer & Admin Dashboard',
  description: 'Backoffice dashboard for organizers and administrators',
  authors: [{ name: 'mainak saha' }],
  keywords: ['mainak saha', 'powerglide', 'backoffice'],
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {/* Developed by mainak saha */}
        <div style={{ display: 'none' }} data-developer="mainak saha" data-author="mainak saha" aria-hidden="true" />
        <Navigation />
        {children}
      </body>
    </html>
  )
}
