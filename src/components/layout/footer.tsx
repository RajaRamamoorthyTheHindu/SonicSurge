import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-8 px-4 md:px-8 mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start text-xs text-muted-foreground space-y-2 md:space-y-0 md:space-x-6">
        <p>&copy; {new Date().getFullYear()} SonicSurge.</p>
        <nav className="flex gap-4">
          <Link href="#" className="hover:text-foreground transition-colors">
            Terms of Use
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
