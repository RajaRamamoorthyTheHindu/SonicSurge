
// src/components/song-list-item-mobile.tsx
'use client';

import Image from 'next/image';
import type { Song } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PlayCircle, StopCircle } from 'lucide-react';

interface SongListItemMobileProps {
  song: Song;
}

export function SongListItemMobile({ song }: SongListItemMobileProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="border-b border-border/30 bg-card last:border-b-0">
      <div className="flex items-center p-3">
        <div className="flex-shrink-0 mr-3">
          <Image
            src={song.albumArtUrl}
            alt={`Album art for ${song.albumName || song.songTitle}`}
            width={48}
            height={48}
            className="rounded-md object-cover aspect-square"
            data-ai-hint={song.aiHint || "album art"}
          />
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-base font-medium text-foreground truncate">{song.songTitle}</p>
          <p className="text-sm text-muted-foreground truncate">{song.artistName}</p>
        </div>
        <div className="ml-3 flex-shrink-0">
          {song.id && (
            <Button
              onClick={handleTogglePlay}
              size="icon" // Making button smaller for mobile list item
              variant="ghost" // Ghost variant to be less intrusive, or 'outline'
              className={cn(
                'rounded-full h-9 w-9 p-0 text-primary hover:bg-primary/10',
                isPlaying && 'bg-primary/10'
              )}
              aria-label={isPlaying ? `Close player for ${song.songTitle}` : `Listen to ${song.songTitle} in-app`}
            >
              {isPlaying ? (
                <StopCircle className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>
      {isPlaying && song.id && (
        <div className="px-3 pb-3 pt-1">
          <iframe
            src={`https://open.spotify.com/embed/track/${song.id}?utm_source=generator&theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            loading="lazy"
            title={`Spotify Player for ${song.songTitle}`}
            className="rounded-lg w-full"
          />
        </div>
      )}
    </div>
  );
}
