import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  )
}
