
// src/components/song-row.tsx
'use client';

import Image from 'next/image';
import type { Song } from '@/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PlayCircle, StopCircle, Youtube } from 'lucide-react';
import { searchYouTubeVideo } from '@/services/youtube-service'; // New import

interface SongRowProps {
  song: Song;
}

export function SongRow({ song }: SongRowProps) {
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [showYouTubePlayer, setShowYouTubePlayer] = useState(false);
  const [youTubeVideoId, setYouTubeVideoId] = useState<string | null>(null);
  const [youTubeError, setYouTubeError] = useState<string | null>(null);
  const [isYouTubeLoading, setIsYouTubeLoading] = useState(false);

  const handleToggleSpotifyPlay = () => {
    setIsSpotifyPlaying(!isSpotifyPlaying);
    // Optionally close YouTube player if Spotify is opened
    // if (!isSpotifyPlaying && showYouTubePlayer) {
    //   setShowYouTubePlayer(false);
    // }
  };

  const handleToggleYouTubePlay = async () => {
    if (showYouTubePlayer) {
      setShowYouTubePlayer(false);
      // No need to clear videoId if we want to resume the same video later
    } else {
      setIsYouTubeLoading(true);
      setYouTubeError(null);
      // setShowSpotifyPlayer(false); // Optionally close Spotify player

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

  // Determine the number of columns for the player row to span
  // Track Name, Artist Name, Album Name, Cover Art, Listen Buttons (Spotify, YouTube) = 6 columns
  // The original number was 5 (Track, Artist, Album, Cover, Spotify Listen Button)
  // Now with YouTube, it should span 5 if we put buttons in one cell or 6 if they are separate.
  // Let's keep buttons in one cell for now, so 5 columns
  const numberOfPlayerColumns = 5; // Track, Artist, Album, Cover, Actions

  return (
    <>
      <TableRow key={song.id} className="hover:bg-muted/50 transition-colors">
        <TableCell className="py-3 px-4 font-medium text-foreground">
          <div className="text-base group-hover:text-primary transition-colors">{song.songTitle}</div>
        </TableCell>
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
        <TableCell className="py-3 px-4 text-right space-x-2">
          {song.id && ( 
            <Button
              onClick={handleToggleSpotifyPlay}
              size="sm"
              variant="outline"
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium themed-button-primary bg-opacity-10 hover:bg-opacity-20 text-primary border-primary/30 hover:border-primary/50',
                isSpotifyPlaying && 'bg-opacity-20 border-primary/50' 
              )}
              aria-label={isSpotifyPlaying ? `Close Spotify player for ${song.songTitle}` : `Listen to ${song.songTitle} on Spotify`}
            >
              {isSpotifyPlaying ? (
                <>
                  <StopCircle className="mr-1.5 h-4 w-4" />
                  Spotify
                </>
              ) : (
                <>
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  Spotify
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleToggleYouTubePlay}
            size="sm"
            variant="outline"
            disabled={isYouTubeLoading}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium themed-button-primary bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/30 hover:border-red-500/50 dark:text-red-400 dark:border-red-400/30 dark:hover:border-red-400/50',
              showYouTubePlayer && 'bg-red-500/20 border-red-500/50'
            )}
            aria-label={showYouTubePlayer ? `Close YouTube player for ${song.songTitle}` : `Watch ${song.songTitle} on YouTube`}
          >
            {isYouTubeLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : showYouTubePlayer ? (
              <StopCircle className="mr-1.5 h-4 w-4" />
            ) : (
              <Youtube className="mr-1.5 h-4 w-4" />
            )}
            YouTube
          </Button>
        </TableCell>
      </TableRow>

      {(isSpotifyPlaying && song.id) || (showYouTubePlayer && youTubeVideoId) || youTubeError ? (
        <TableRow key={`${song.id}-players`} className="bg-background hover:bg-background">
          <TableCell colSpan={numberOfPlayerColumns} className="p-0">
            <div className="py-2 px-2 md:px-4 space-y-3">
              {isSpotifyPlaying && song.id && (
                <div>
                  <iframe
                    src={`https://open.spotify.com/embed/track/${song.id}?utm_source=generator&theme=0`} 
                    width="100%"
                    height="80" 
                    frameBorder="0"
                    allowFullScreen={false} 
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" 
                    loading="lazy"
                    title={`Spotify Player for ${song.songTitle}`}
                    className="rounded-lg"
                  />
                </div>
              )}
              {showYouTubePlayer && youTubeVideoId && (
                <div>
                  <iframe
                    width="100%"
                    height="200" // YouTube embeds are often taller
                    src={`https://www.youtube.com/embed/${youTubeVideoId}?autoplay=1`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`YouTube Player for ${song.songTitle}`}
                    className="rounded-lg"
                  />
                </div>
              )}
              {youTubeError && (
                <div className="p-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded-md">
                  {youTubeError}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
