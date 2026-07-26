import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nemotron Chat',
  description: 'Chat with NVIDIA Nemotron 3 Ultra via OpenRouter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased">
        {children}
      </body>
    </html>
  )
}
