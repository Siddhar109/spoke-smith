import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
  // Including thin weights as requested
  weight: ['100', '200', '300', '400', '500', '600', '700'] 
})

export const metadata: Metadata = {
  title: 'Kawkai - AI Media Training Coach',
  description: 'Practice your interview skills with AI-powered coaching. Get real-time feedback on pace, messaging, and delivery.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
