
import Link from 'next/link';
import { Info, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="py-4 px-4 md:px-8 sticky top-0 z-50 bg-background/80 backdrop-blur-md apple-subtle-shadow">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          {/* Using an SVG for SonicSurge logo to ensure font style if SF Pro isn't available */}
          <svg width="32" height="32" viewBox="0 0 100 100" className="text-primary group-hover:text-opacity-80 transition-opacity">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" />
            <path d="M30 60 Q50 30 70 60" stroke="currentColor" strokeWidth="8" fill="none" />
            <path d="M35 70 Q50 45 65 70" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="10" fill="currentColor" />
          </svg>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground group-hover:text-opacity-80 transition-opacity">
            SonicSurge
          </h1>
        </Link>
        <nav className="flex items-center space-x-3 md:space-x-4">
          <Link href="#" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-card">
            <Info className="h-5 w-5 md:h-6 md:w-6" />
            <span className="sr-only">About</span>
          </Link>
          <Link href="#" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-card">
            <ShieldCheck className="h-5 w-5 md:h-6 md:w-6" />
            <span className="sr-only">Privacy Policy</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
