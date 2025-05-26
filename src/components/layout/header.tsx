import { Music } from 'lucide-react';

export function Header() {
  return (
    <header className="py-6 px-4 md:px-8 border-b border-border">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Music className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">SonicSurge</h1>
        </div>
        <p className="text-sm text-muted-foreground hidden md:block">Discover your next favorite track</p>
      </div>
    </header>
  );
}
