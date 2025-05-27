
'use client';

import type { Song } from '@/types'; 
import type { InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
import { SongRow } from '@/components/song-row';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Info, Loader2, ChevronDown } from 'lucide-react'; 
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SonicMatchesProps {
  aiInterpretation: AIOutput | null;
  songs: Song[];
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  originalMoodDescription?: string; 
}

export function SonicMatches({ aiInterpretation, songs, onLoadMore, isLoadingMore, hasMore, originalMoodDescription }: SonicMatchesProps) {
  const wasSearchAttempted = aiInterpretation || originalMoodDescription;

  if (!wasSearchAttempted && songs.length === 0) {
    return null; 
  }

  return (
    <section id="sonic-matches-results" className="w-full">
      <div className="space-y-8 md:space-y-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">
          Your Sonic Matches
        </h2>

        {songs.length > 0 ? (
          <>
            <ScrollArea className="w-full rounded-lg border bg-card text-card-foreground shadow-sm subtle-shadow"> {/* Removed whitespace-nowrap */}
              <Table className="min-w-full music-table">
                <TableHeader>
                  <TableRow className="border-b-border/50">
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">Track Name</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%]">Mood Query</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">Artist Name</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">Album Name</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">Cover Art</TableHead>
                    <TableHead className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">Spotify</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {songs.map((song) => (
                    <SongRow key={song.id} song={song} moodQuery={originalMoodDescription} />
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="themed-button-primary bg-opacity-10 hover:bg-opacity-20 text-primary border-primary/30 hover:border-primary/50 font-medium text-sm px-6 py-2.5"
                >
                  {isLoadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="mr-1.5 h-4 w-4" />
                  )}
                  {isLoadingMore ? 'Loading...' : 'Next 5 Songs'}
                </Button>
              </div>
            )}
          </>
        ) : (
          wasSearchAttempted && !isLoadingMore && ( 
            <div className="text-center py-10 flex flex-col items-center space-y-3 bg-card rounded-xl subtle-shadow p-6 md:p-8">
              <Info className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No matches for that vibe.</p>
              <p className="text-sm text-muted-foreground">Try changing up your search terms.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
