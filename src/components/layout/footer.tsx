import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-6 px-4 md:px-8 border-t border-border mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SonicSurge. All rights reserved.</p>
        <nav className="flex gap-4 mt-2 md:mt-0">
          <Link href="#" className="hover:text-primary transition-colors">
            About
          </Link>
          <Link href="#" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
