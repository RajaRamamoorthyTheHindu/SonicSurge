
// src/components/song-row.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Song } from '@/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SpotifyIcon } from '@/components/icons/spotify-icon';
import { cn } from '@/lib/utils';

interface SongRowProps {
  song: Song;
  mood?: string;
}

export function SongRow({ song, mood }: SongRowProps) {
  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell className="py-3 px-4 font-medium text-foreground">
        <div className="text-base group-hover:text-primary transition-colors">{song.songTitle}</div>
      </TableCell>
      <TableCell className="py-3 px-4 text-sm text-muted-foreground">{mood || 'N/A'}</TableCell>
      <TableCell className="py-3 px-4 text-sm text-muted-foreground">{song.artistName}</TableCell>
      <TableCell className="py-3 px-4 text-sm text-muted-foreground">{song.albumName || 'N/A'}</TableCell>
      <TableCell className="py-3 px-4">
        <div className="flex justify-start items-center">
          <Image
            src={song.albumArtUrl}
            alt={`Album art for ${song.albumName || song.songTitle}`}
            width={48} // Smaller size for table cell, as per 64x64px max, this gives padding
            height={48}
            className="rounded-md object-cover aspect-square"
            data-ai-hint={song.aiHint || "album art"}
          />
        </div>
      </TableCell>
      <TableCell className="py-3 px-4 text-right">
        {song.platformLinks.spotify && (
          <Button
            asChild
            size="sm"
            className={cn(
              'bg-[#1DB954] text-white hover:bg-[#1aa34a] focus-visible:ring-[#1DB954] focus-visible:ring-offset-2 rounded-[24px] px-4 py-2 text-xs font-semibold apple-button',
              'group/spotify-btn'
            )}
          >
            <Link href={song.platformLinks.spotify} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${song.songTitle} on Spotify`}>
              <SpotifyIcon className="mr-1.5 h-4 w-4 text-white group-hover/spotify-btn:text-white transition-none" />
              Listen
            </Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
