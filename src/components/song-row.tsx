
// src/components/song-row.tsx
'use client';

import Image from 'next/image';
import type { Song } from '@/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PlayCircle, StopCircle } from 'lucide-react';

interface SongRowProps {
  song: Song;
  moodQuery?: string; // Kept for potential future use, but not displayed
}

export function SongRow({ song, moodQuery }: SongRowProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Determine the number of columns for the player row to span
  // Track Name, Artist Name, Album Name, Cover Art, Listen Button = 5 columns
  const numberOfColumns = 5;

  return (
    <>
      <TableRow key={song.id} className="hover:bg-muted/50 transition-colors">
        <TableCell className="py-3 px-4 font-medium text-foreground">
          <div className="text-base group-hover:text-primary transition-colors">{song.songTitle}</div>
        </TableCell>
        {/* <TableCell className="py-3 px-4 text-sm text-muted-foreground">{moodQuery || 'N/A'}</TableCell> */}
        <TableCell className="py-3 px-4 text-sm text-muted-foreground">{song.artistName}</TableCell>
        <TableCell className="py-3 px-4 text-sm text-muted-foreground">{song.albumName || 'N/A'}</TableCell>
        <TableCell className="py-3 px-4">
          <div className="flex justify-start items-center">
            <Image
              src={song.albumArtUrl}
              alt={`Album art for ${song.albumName || song.songTitle}`}
              width={48}
              height={48}
              className="rounded-md object-cover aspect-square"
              data-ai-hint={song.aiHint || "album art"}
            />
          </div>
        </TableCell>
        <TableCell className="py-3 px-4 text-right">
          {song.id && ( // Only show button if song.id is available for the iframe
            <Button
              onClick={handleTogglePlay}
              size="sm"
              variant="outline"
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium themed-button-primary bg-opacity-10 hover:bg-opacity-20 text-primary border-primary/30 hover:border-primary/50',
                isPlaying && 'bg-opacity-20 border-primary/50' // Slightly different style when playing
              )}
              aria-label={isPlaying ? `Close player for ${song.songTitle}` : `Listen to ${song.songTitle} in-app`}
            >
              {isPlaying ? (
                <>
                  <StopCircle className="mr-1.5 h-4 w-4" />
                  Close
                </>
              ) : (
                <>
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  Listen
                </>
              )}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {isPlaying && song.id && (
        <TableRow key={`${song.id}-player`} className="bg-background hover:bg-background">
          <TableCell colSpan={numberOfColumns} className="p-0">
            <div className="py-2 px-2 md:px-4"> {/* Padding around the iframe container */}
              <iframe
                src={`https://open.spotify.com/embed/track/${song.id}?utm_source=generator&theme=0`} // theme=0 for light, theme=1 for dark
                width="100%"
                height="80" // Spotify's compact embed height
                frameBorder="0"
                allowFullScreen={false} // Not typically used for compact player
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" // Removed fullscreen
                loading="lazy"
                title={`Spotify Player for ${song.songTitle}`}
                className="rounded-lg"
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
