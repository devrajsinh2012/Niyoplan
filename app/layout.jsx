import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import OnboardingMiddleware from '@/components/middleware/OnboardingMiddleware'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'Niyoplan',
  description: 'Project Management, Simplified.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>
          <OnboardingMiddleware>
            <AppShell>
              {children}
            </AppShell>
          </OnboardingMiddleware>
          <Toaster position="top-right" toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            },
            success: {
              iconTheme: {
                primary: '#22A06B',
                secondary: 'white',
              },
            },
            error: {
              iconTheme: {
                primary: '#E34935',
                secondary: 'white',
              },
            },
          }} />
        </AuthProvider>
      </body>
    </html>
  )
}
