
import Image from 'next/image';
import Link from 'next/link';
import type { Song } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button';
import { SpotifyIcon } from '@/components/icons/spotify-icon';
import { YouTubeMusicIcon } from '@/components/icons/youtube-music-icon';
// import { AppleMusicIcon } from '@/components/icons/apple-music-icon'; // Apple Music not implemented
import { cn } from '@/lib/utils';

interface SongCardProps {
  song: Song;
}

const PlatformLinkButton = ({ href, icon, label, className }: { href: string, icon: React.ReactNode, label: string, className?: string }) => (
  <Button variant="ghost" size="icon" asChild className={cn("rounded-full w-9 h-9 hover:bg-foreground/10", className)}>
    <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${label} on ${href.includes('spotify') ? 'Spotify' : href.includes('youtube') ? 'YouTube Music' : 'another platform'}`}>
      {icon}
    </Link>
  </Button>
);

// This component is no longer used for the main results display if SonicMatches uses SongRow.
// However, it might be useful elsewhere or for a different view toggle in the future.
// For now, it remains as is, but it's not part of the table layout.
export function SongCard({ song }: SongCardProps) {
  return (
    <Card className="w-full overflow-hidden apple-subtle-shadow bg-card rounded-xl group transform transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg dark:hover:shadow-primary/20">
      <CardHeader className="p-0">
        <div className="aspect-square relative overflow-hidden rounded-t-xl">
          <Image
            src={song.albumArtUrl}
            alt={`Album art for ${song.albumName || song.songTitle}`}
            fill 
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
            data-ai-hint={song.aiHint || "album art"}
            priority 
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4">
        <h3 className="text-base md:text-lg font-semibold text-foreground truncate" title={song.songTitle}>
          {song.songTitle}
        </h3>
        <p className="text-sm text-muted-foreground truncate" title={song.artistName}>{song.artistName}</p>
        {song.albumName && <p className="text-xs text-muted-foreground/70 truncate" title={song.albumName}>{song.albumName}</p>}
      </CardContent>
      {(song.platformLinks.spotify || song.platformLinks.youtube) && ( // Removed Apple Music check
        <CardFooter className="p-3 md:p-4 pt-0 flex justify-start items-center space-x-2">
          {song.platformLinks.spotify && (
            <PlatformLinkButton href={song.platformLinks.spotify} icon={<SpotifyIcon className="w-5 h-5 text-green-500" />} label={song.songTitle} />
          )}
          {song.platformLinks.youtube && (
            <PlatformLinkButton href={song.platformLinks.youtube} icon={<YouTubeMusicIcon className="w-5 h-5 text-red-500" />} label={song.songTitle} />
          )}
          {/* Removed Apple Music button */}
        </CardFooter>
      )}
    </Card>
  );
}
