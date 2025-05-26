
'use client';

import type { Song } from '@/types'; // Removed InterpretMusicalIntentOutput import as it's not directly used for props here
import type { InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
import { SongRow } from '@/components/song-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Info, Loader2, ChevronDown, Search, Music, ListFilter, Disc3 } from 'lucide-react'; // Replaced Disc with Disc3 or similar
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SonicMatchesProps {
  aiInterpretation: AIOutput | null;
  songs: Song[];
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  originalMoodDescription?: string; // This is the user's raw mood input
}

const DetailItem = ({ label, value, icon }: { label: string; value?: string | number | string[]; icon?: React.ReactNode }) => {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || String(value).trim() === '') return null;
  return (
    <div className="flex items-start">
      {icon && <div className="mr-2 mt-0.5 text-primary shrink-0">{icon}</div>}
      <div>
        <h3 className="font-medium text-foreground/80 text-xs uppercase tracking-wider">{label}:</h3>
        {Array.isArray(value) ? (
          <div className="flex flex-wrap gap-2 mt-1">
            {value.map(item => <Badge key={item} variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal">{item}</Badge>)}
          </div>
        ) : (
          <Badge variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal mt-1 whitespace-normal text-left break-words">{String(value)}</Badge>
        )}
      </div>
    </div>
  );
};

export function SonicMatches({ aiInterpretation, songs, onLoadMore, isLoadingMore, hasMore, originalMoodDescription }: SonicMatchesProps) {
  if (!aiInterpretation && songs.length === 0) {
    return null;
  }

  const hasRelevantAiOutput = aiInterpretation && (
    (aiInterpretation.seed_tracks && aiInterpretation.seed_tracks.length > 0) ||
    (aiInterpretation.seed_artists && aiInterpretation.seed_artists.length > 0) ||
    (aiInterpretation.seed_genres && aiInterpretation.seed_genres.length > 0) ||
    aiInterpretation.target_danceability !== undefined ||
    aiInterpretation.target_energy !== undefined ||
    aiInterpretation.target_tempo !== undefined ||
    aiInterpretation.target_valence !== undefined ||
    aiInterpretation.fallbackSearchQuery
  );

  return (
    <section id="sonic-matches-results" className="w-full"> {/* Added ID back for scroll anchoring */}
      <div className="space-y-8 md:space-y-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">
          Your Sonic Matches
        </h2>

        {hasRelevantAiOutput && aiInterpretation && (
          <Card className="form-container-card subtle-shadow">
            <CardHeader className="pb-3 pt-1 px-0 md:px-0">
              <CardTitle className="form-card-title flex items-center">
                <ListFilter className="mr-2 h-5 w-5 text-primary" />
                AI Recommendation Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm pt-4 px-0 md:px-0">
              {aiInterpretation.fallbackSearchQuery && (
                <DetailItem label="Spotify Fallback Search Query" value={aiInterpretation.fallbackSearchQuery} icon={<Search size={16}/>} />
              )}
              <DetailItem label="Seed Tracks" value={aiInterpretation.seed_tracks} icon={<Disc3 size={16}/>} />
              <DetailItem label="Seed Artists" value={aiInterpretation.seed_artists} icon={<Music size={16}/>} />
              <DetailItem label="Seed Genres" value={aiInterpretation.seed_genres} icon={<ListFilter size={16}/>} /> 
              
              {(aiInterpretation.target_energy !== undefined || aiInterpretation.target_danceability !== undefined || aiInterpretation.target_tempo !== undefined || aiInterpretation.target_valence !== undefined) && (
                <div>
                   <h3 className="font-medium text-foreground/80 text-xs uppercase tracking-wider mb-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M14.5 16.5L18 13l-1.5-1.5L13 15l-1.5 1.5zM8.5 12.5L12 9l-1.5-1.5L7 11l-1.5 1.5zM12 7.5L15.5 4l-1.5-1.5L10.5 6Z"/><path d="m12 22 1-1ZM11 11l1-1ZM4 4l1.5 1.5L8 8l1-1V3c0-1.1.9-2 2-2h1M3 12c0 1.1.9 2 2 2h4l1 1ZM11 11l-1 1L6.5 15.5 4 18l-1-1Z"/></svg>
                     Target Audio Features
                    </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <DetailItem label="Energy" value={aiInterpretation.target_energy?.toFixed(2)} />
                    <DetailItem label="Danceability" value={aiInterpretation.target_danceability?.toFixed(2)} />
                    <DetailItem label="Tempo (BPM)" value={aiInterpretation.target_tempo?.toFixed(0)} />
                    <DetailItem label="Valence (Positiveness)" value={aiInterpretation.target_valence?.toFixed(2)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {songs.length > 0 ? (
          <>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card text-card-foreground shadow-sm subtle-shadow">
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
          (aiInterpretation || originalMoodDescription) && !isLoadingMore && ( 
            <div className="text-center py-10 flex flex-col items-center space-y-3 bg-card rounded-xl subtle-shadow p-6 md:p-8">
              <Info className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No matches for that vibe.</p>
              <p className="text-sm text-muted-foreground">Try changing up your search terms or recording a different snippet.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
