import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/providers/query-provider';
import { DragDropProvider } from '@/components/common/DragDropProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tribe - Private Community Platform",
  description: "Share precious moments and memories in completely private group spaces with your closest communities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <DragDropProvider>
            {children}
            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              containerStyle={{
                top: '20px',
                right: '20px',
              }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--surface)',
                  color: 'var(--ac-brown-dark)',
                  boxShadow: 'var(--shadow-large)',
                  borderRadius: 'var(--radius-large)',
                  fontSize: '14px',
                  maxWidth: '400px',
                  fontFamily: 'var(--font-display)',
                  border: '3px solid var(--ac-sage-light)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--ac-sage)',
                    secondary: 'var(--surface)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--ac-coral)',
                    secondary: 'var(--surface)',
                  },
                },
              }}
            />
          </DragDropProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
