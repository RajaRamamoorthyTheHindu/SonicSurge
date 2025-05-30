
'use client';

import type { Song } from '@/types'; 
import type { InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent'; 
import { SongRow } from '@/components/song-row';
import { SongListItemMobile } from '@/components/song-list-item-mobile';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge'; // Badge removed as seed/target display is removed
import { Info, Loader2, ChevronDown } from 'lucide-react'; 
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMediaQuery } from '@/hooks/use-media-query';

interface SonicMatchesProps {
  songs: Song[];
  aiInterpretation?: AIOutput | null; 
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  originalMoodDescription?: string; 
}

export function SonicMatches({ songs, aiInterpretation, onLoadMore, isLoadingMore, hasMore, originalMoodDescription }: SonicMatchesProps) {
  const wasSearchAttempted = originalMoodDescription || songs.length > 0 || aiInterpretation;
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Updated to check for the primary output of the AI: fallbackSearchQuery
  const hasRelevantAiOutput = aiInterpretation && aiInterpretation.fallbackSearchQuery && aiInterpretation.fallbackSearchQuery.trim() !== '';

  if (!wasSearchAttempted && songs.length === 0) {
    console.log("SonicMatches: No search attempted and no songs. Rendering null.");
    return null; 
  }

  return (
    <section id="sonic-matches-results" className="w-full">
      <div className="space-y-8 md:space-y-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">
          Your Sonic Matches
        </h2>

        {/* AI Interpretation Debug Card - Displays only fallbackSearchQuery now */}
        {hasRelevantAiOutput && (
          <Card className="form-container-card subtle-shadow">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base font-semibold text-foreground">AI Recommendation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground px-4 md:px-6 pb-4 space-y-2">
              {aiInterpretation?.fallbackSearchQuery && (
                <div><strong>Spotify Search Query:</strong> {aiInterpretation.fallbackSearchQuery}</div>
              )}
            </CardContent>
          </Card>
        )}

        {songs.length > 0 ? (
          <>
            {isDesktop && (
              <ScrollArea className="w-full rounded-lg border bg-card text-card-foreground shadow-sm subtle-shadow">
                <Table className="min-w-full music-table">
                  <TableHeader>
                    <TableRow className="border-b-border/50">
                      <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[30%]">Track Name</TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">Artist Name</TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">Album Name</TableHead>
                      <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">Cover Art</TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">Listen Options</TableHead> 
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {songs.map((song) => (
                      <SongRow key={song.id} song={song} />
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}

            {!isDesktop && (
              <div className="bg-card rounded-lg border shadow-sm subtle-shadow overflow-hidden">
                {songs.map((song) => (
                  <SongListItemMobile key={song.id} song={song} />
                ))}
              </div>
            )}
            
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
              <p className="text-sm text-muted-foreground">Try changing up your search terms or mood.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
