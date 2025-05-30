
'use client';

import type { Song } from '@/types'; 
import type { InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent'; 
import { SongRow } from '@/components/song-row';
import { SongListItemMobile } from '@/components/song-list-item-mobile';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Loader2, ChevronDown } from 'lucide-react'; 
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMediaQuery } from '@/hooks/use-media-query';

interface SonicMatchesProps {
  songs: Song[];
  aiInterpretation: AIOutput | null; 
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  originalMoodDescription?: string; 
}

export function SonicMatches({ songs, aiInterpretation, onLoadMore, isLoadingMore, hasMore, originalMoodDescription }: SonicMatchesProps) {
  const wasSearchAttempted = originalMoodDescription || songs.length > 0 || aiInterpretation;
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const hasRelevantAiOutput = aiInterpretation && (
    (aiInterpretation.seed_tracks && aiInterpretation.seed_tracks.length > 0) ||
    (aiInterpretation.seed_artists && aiInterpretation.seed_artists.length > 0) ||
    (aiInterpretation.seed_genres && aiInterpretation.seed_genres.length > 0) ||
    aiInterpretation.target_acousticness !== undefined ||
    aiInterpretation.target_danceability !== undefined ||
    aiInterpretation.target_energy !== undefined ||
    aiInterpretation.target_instrumentalness !== undefined ||
    aiInterpretation.target_liveness !== undefined ||
    aiInterpretation.target_loudness !== undefined ||
    aiInterpretation.target_mode !== undefined ||
    aiInterpretation.target_popularity !== undefined ||
    aiInterpretation.target_speechiness !== undefined ||
    aiInterpretation.target_tempo !== undefined ||
    aiInterpretation.target_time_signature !== undefined ||
    aiInterpretation.target_valence !== undefined ||
    aiInterpretation.fallbackSearchQuery
  );

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

        {/* AI Interpretation Debug Card - Re-enabled for debugging */}
        {aiInterpretation && hasRelevantAiOutput && (
          <Card className="form-container-card subtle-shadow">
            <CardHeader className="pb-2 pt-4 px-4 md:px-6">
              <CardTitle className="text-base font-semibold text-foreground">AI Recommendation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground px-4 md:px-6 pb-4 space-y-2">
              {aiInterpretation.fallbackSearchQuery && (
                <div><strong>Spotify Fallback Search Query:</strong> {aiInterpretation.fallbackSearchQuery}</div>
              )}
              {(aiInterpretation.seed_tracks && aiInterpretation.seed_tracks.length > 0) && (
                <div><strong>Seed Tracks:</strong> {aiInterpretation.seed_tracks.map(t => <Badge key={t} variant="secondary" className="mr-1 my-0.5">{t}</Badge>)}</div>
              )}
              {(aiInterpretation.seed_artists && aiInterpretation.seed_artists.length > 0) && (
                <div><strong>Seed Artists:</strong> {aiInterpretation.seed_artists.map(a => <Badge key={a} variant="secondary" className="mr-1 my-0.5">{a}</Badge>)}</div>
              )}
              {(aiInterpretation.seed_genres && aiInterpretation.seed_genres.length > 0) && (
                <div><strong>Seed Genres:</strong> {aiInterpretation.seed_genres.map(g => <Badge key={g} variant="secondary" className="mr-1 my-0.5">{g}</Badge>)}</div>
              )}
              {(
                aiInterpretation.target_acousticness !== undefined ||
                aiInterpretation.target_danceability !== undefined ||
                aiInterpretation.target_energy !== undefined ||
                aiInterpretation.target_instrumentalness !== undefined ||
                aiInterpretation.target_liveness !== undefined ||
                aiInterpretation.target_loudness !== undefined ||
                aiInterpretation.target_mode !== undefined ||
                aiInterpretation.target_popularity !== undefined ||
                aiInterpretation.target_speechiness !== undefined ||
                aiInterpretation.target_tempo !== undefined ||
                aiInterpretation.target_time_signature !== undefined ||
                aiInterpretation.target_valence !== undefined
              ) && (
                <div>
                  <strong>Target Audio Features:</strong>
                  <ul className="list-disc list-inside pl-1">
                    {aiInterpretation.target_acousticness !== undefined && <li>Acousticness: {aiInterpretation.target_acousticness.toFixed(2)}</li>}
                    {aiInterpretation.target_danceability !== undefined && <li>Danceability: {aiInterpretation.target_danceability.toFixed(2)}</li>}
                    {aiInterpretation.target_energy !== undefined && <li>Energy: {aiInterpretation.target_energy.toFixed(2)}</li>}
                    {aiInterpretation.target_instrumentalness !== undefined && <li>Instrumentalness: {aiInterpretation.target_instrumentalness.toFixed(2)}</li>}
                    {aiInterpretation.target_liveness !== undefined && <li>Liveness: {aiInterpretation.target_liveness.toFixed(2)}</li>}
                    {aiInterpretation.target_loudness !== undefined && <li>Loudness: {aiInterpretation.target_loudness.toFixed(2)}</li>}
                    {aiInterpretation.target_mode !== undefined && <li>Mode: {aiInterpretation.target_mode}</li>}
                    {aiInterpretation.target_popularity !== undefined && <li>Popularity: {aiInterpretation.target_popularity}</li>}
                    {aiInterpretation.target_speechiness !== undefined && <li>Speechiness: {aiInterpretation.target_speechiness.toFixed(2)}</li>}
                    {aiInterpretation.target_tempo !== undefined && <li>Tempo: {Math.round(aiInterpretation.target_tempo)} BPM</li>}
                    {aiInterpretation.target_time_signature !== undefined && <li>Time Signature: {aiInterpretation.target_time_signature}</li>}
                    {aiInterpretation.target_valence !== undefined && <li>Valence (Positiveness): {aiInterpretation.target_valence.toFixed(2)}</li>}
                  </ul>
                </div>
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
