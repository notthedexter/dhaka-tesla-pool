import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Dhaka Tesla Pool - Share a seat. Split the fare.',
  description: 'Dhaka ride-pooling MVP for three-wheeled, battery-powered Teslas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#030712] text-slate-100 antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#030712] text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
