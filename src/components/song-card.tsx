import Image from 'next/image';
import Link from 'next/link';
import type { Song } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SpotifyIcon } from '@/components/icons/spotify-icon';
import { YouTubeMusicIcon } from '@/components/icons/youtube-music-icon';
import { AppleMusicIcon } from '@/components/icons/apple-music-icon';
import { ExternalLink } from 'lucide-react';


interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-lg bg-card hover:shadow-primary/20 transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="aspect-square relative">
          <Image
            src={song.albumArtUrl}
            alt={`Album art for ${song.albumName || song.songTitle}`}
            layout="fill"
            objectFit="cover"
            data-ai-hint={song.aiHint || "album art"}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl font-semibold text-primary-foreground mb-1 truncate" title={song.songTitle}>
          {song.songTitle}
        </CardTitle>
        <p className="text-sm text-muted-foreground truncate" title={song.artistName}>{song.artistName}</p>
        {song.albumName && <p className="text-xs text-muted-foreground/80 truncate" title={song.albumName}>{song.albumName}</p>}
      </CardContent>
      <Separator />
      <CardFooter className="p-4 flex flex-col items-start space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Listen on:</p>
        <div className="flex space-x-2">
          {song.platformLinks.spotify && (
            <Button variant="outline" size="sm" asChild className="border-green-500 hover:bg-green-500/10 text-green-400 hover:text-green-300">
              <Link href={song.platformLinks.spotify} target="_blank" rel="noopener noreferrer">
                <SpotifyIcon className="mr-2 h-4 w-4" /> Spotify
              </Link>
            </Button>
          )}
          {song.platformLinks.youtube && (
            <Button variant="outline" size="sm" asChild className="border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300">
              <Link href={song.platformLinks.youtube} target="_blank" rel="noopener noreferrer">
                <YouTubeMusicIcon className="mr-2 h-4 w-4" /> YouTube
              </Link>
            </Button>
          )}
          {song.platformLinks.appleMusic && (
            <Button variant="outline" size="sm" asChild className="border-pink-500 hover:bg-pink-500/10 text-pink-400 hover:text-pink-300">
              <Link href={song.platformLinks.appleMusic} target="_blank" rel="noopener noreferrer">
                <AppleMusicIcon className="mr-2 h-4 w-4" /> Apple Music
              </Link>
            </Button>
          )}
        </div>
         {!song.platformLinks.spotify && !song.platformLinks.youtube && !song.platformLinks.appleMusic && (
          <p className="text-xs text-muted-foreground">No streaming links available.</p>
        )}
      </CardFooter>
    </Card>
  );
}
