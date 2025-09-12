import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/providers/query-provider';
import { DragDropProvider } from '@/components/common/DragDropProvider';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import "./globals.css";
import "../styles/masonry-grid.css";

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
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
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
                  color: 'var(--bark-400)',
                  boxShadow: 'var(--shadow-large)',
                  borderRadius: 'var(--radius-large)',
                  fontSize: '14px',
                  maxWidth: '400px',
                  fontFamily: 'var(--font-display)',
                  border: '3px solid var(--leaf-300)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--leaf-500)',
                    secondary: 'var(--surface)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--flower-400)',
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
