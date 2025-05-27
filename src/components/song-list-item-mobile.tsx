
// src/components/song-list-item-mobile.tsx
'use client';

import Image from 'next/image';
import type { Song } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PlayCircle, StopCircle, Youtube, Loader2 } from 'lucide-react';
import { searchYouTubeVideo } from '@/services/youtube-service'; // New import

interface SongListItemMobileProps {
  song: Song;
}

export function SongListItemMobile({ song }: SongListItemMobileProps) {
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [showYouTubePlayer, setShowYouTubePlayer] = useState(false);
  const [youTubeVideoId, setYouTubeVideoId] = useState<string | null>(null);
  const [youTubeError, setYouTubeError] = useState<string | null>(null);
  const [isYouTubeLoading, setIsYouTubeLoading] = useState(false);

  const handleToggleSpotifyPlay = () => {
    setIsSpotifyPlaying(!isSpotifyPlaying);
    if (!isSpotifyPlaying && showYouTubePlayer) { // If opening Spotify, close YouTube
        setShowYouTubePlayer(false);
    }
  };

  const handleToggleYouTubePlay = async () => {
    if (showYouTubePlayer) {
      setShowYouTubePlayer(false);
    } else {
      setIsYouTubeLoading(true);
      setYouTubeError(null);
      if(isSpotifyPlaying) setIsSpotifyPlaying(false); // If opening YouTube, close Spotify

      try {
        const videoId = await searchYouTubeVideo(`${song.songTitle} ${song.artistName}`);
        if (videoId) {
          setYouTubeVideoId(videoId);
          setShowYouTubePlayer(true);
        } else {
          setYouTubeError('Video not found.');
        }
      } catch (error) {
        console.error("Error searching YouTube video:", error);
        setYouTubeError('Error loading video.');
      } finally {
        setIsYouTubeLoading(false);
      }
    }
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
        <div className="ml-auto flex-shrink-0 flex space-x-1">
          {song.id && (
            <Button
              onClick={handleToggleSpotifyPlay}
              size="icon" 
              variant="ghost" 
              className={cn(
                'rounded-full h-9 w-9 p-0 text-primary hover:bg-primary/10',
                isSpotifyPlaying && 'bg-primary/10'
              )}
              aria-label={isSpotifyPlaying ? `Close Spotify player` : `Listen on Spotify`}
            >
              {isSpotifyPlaying ? (
                <StopCircle className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )}
            </Button>
          )}
          <Button
            onClick={handleToggleYouTubePlay}
            size="icon"
            variant="ghost"
            disabled={isYouTubeLoading}
            className={cn(
              'rounded-full h-9 w-9 p-0 text-red-600 hover:bg-red-500/10 dark:text-red-400',
              showYouTubePlayer && 'bg-red-500/10'
            )}
            aria-label={showYouTubePlayer ? `Close YouTube player` : `Watch on YouTube`}
          >
            {isYouTubeLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : showYouTubePlayer ? (
              <StopCircle className="h-5 w-5" />
            ) : (
              <Youtube className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {isSpotifyPlaying && song.id && (
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
      {showYouTubePlayer && youTubeVideoId && (
        <div className="px-3 pb-3 pt-1">
          <iframe
            width="100%"
            height="180" // Standard mobile embed height
            src={`https://www.youtube.com/embed/${youTubeVideoId}?autoplay=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`YouTube Player for ${song.songTitle}`}
            className="rounded-lg w-full"
          />
        </div>
      )}
      {youTubeError && !showYouTubePlayer && (
         <div className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">
            {youTubeError}
         </div>
      )}
    </div>
  );
}
