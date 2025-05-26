import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Changed from Geist to Inter
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ // Initialize Inter
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SonicSurge - Discover Your Next Favorite Track',
  description: 'Find songs that match your musical preferences or resemble a known track.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Defaulting to dark theme as per original PRD */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}> {/* Use inter variable and add font-sans for Tailwind to pick it up */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
