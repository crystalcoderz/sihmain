import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NER Sentinel · Disaster Logistics Command Console',
  description:
    'Live route-risk intelligence, incident tracking, and supply coordination for the North Eastern Region of India.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#102447',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <body>{children}</body>
    </html>
  )
}
