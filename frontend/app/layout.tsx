import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { V2AuthProvider } from '@/contexts/V2AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ConversaTree - Dialog Tree Manager',
  description: 'Create and manage dialog trees with vector embeddings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <V2AuthProvider>
            {children}
          </V2AuthProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

