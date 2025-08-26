import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'French Real Estate Map - Retro Edition',
  description: 'Discover French real estate with retro arcade style',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
          {children}
        </div>
      </body>
    </html>
  )
}
