
'use client';

import type { Song, InterpretMusicalIntentOutput } from '@/types';
import { SongRow } from '@/components/song-row'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Info, Loader2, ChevronDown } from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SonicMatchesProps {
  aiInterpretation: InterpretMusicalIntentOutput | null;
  songs: Song[];
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
}

export function SonicMatches({ aiInterpretation, songs, onLoadMore, isLoadingMore, hasMore }: SonicMatchesProps) {
  if (!aiInterpretation && songs.length === 0) {
    return null;
  }

  const hasAiContent = aiInterpretation &&
    (aiInterpretation.moodDescriptors?.length > 0 ||
     aiInterpretation.instrumentTags?.length > 0 ||
     aiInterpretation.tempo ||
     aiInterpretation.genreAffinities?.length > 0 ||
     aiInterpretation.artistSimilarity?.length > 0 ||
     aiInterpretation.trackMetadata?.trackUrl
    );

  // If there's no AI content to display AND no songs, don't render anything.
  // This case should ideally be handled by the parent (page.tsx) not even rendering SonicMatches.
  // However, this check prevents an empty section if somehow invoked with no data.
  if (!hasAiContent && songs.length === 0) {
    return null;
  }

  const primaryMood = aiInterpretation?.moodDescriptors?.[0];

  return (
    <section id="sonic-matches" className="w-full">
      <div className="space-y-8 md:space-y-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">
          Your Sonic Matches
        </h2>

        {hasAiContent && (
          <Card className="apple-card apple-subtle-shadow">
            <CardHeader className="pb-3 pt-1">
              <CardTitle className="text-lg md:text-xl font-semibold text-foreground">AI Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pt-0">
              {aiInterpretation.moodDescriptors && aiInterpretation.moodDescriptors.length > 0 && (
                <div>
                  <h3 className="font-medium text-foreground/80 mb-1.5 text-xs uppercase tracking-wider">Moods:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.moodDescriptors.map(desc => <Badge key={desc} variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal">{desc}</Badge>)}
                  </div>
                </div>
              )}
              {aiInterpretation.instrumentTags && aiInterpretation.instrumentTags.length > 0 && (
                 <div>
                  <h3 className="font-medium text-foreground/80 mb-1.5 text-xs uppercase tracking-wider">Instruments:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.instrumentTags.map(tag => <Badge key={tag} variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal">{tag}</Badge>)}
                  </div>
                </div>
              )}
              {aiInterpretation.tempo && (
                 <div><strong className="font-medium text-foreground/80 text-xs uppercase tracking-wider">Tempo:</strong> <Badge variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal">{aiInterpretation.tempo}</Badge></div>
              )}
              {aiInterpretation.genreAffinities && aiInterpretation.genreAffinities.length > 0 && (
                <div>
                  <h3 className="font-medium text-foreground/80 mb-1.5 text-xs uppercase tracking-wider">Genres:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.genreAffinities.map(genre => <Badge key={genre} variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal">{genre}</Badge>)}
                  </div>
                </div>
              )}
               {aiInterpretation.artistSimilarity && aiInterpretation.artistSimilarity.length > 0 && (
                <div>
                  <h3 className="font-medium text-foreground/80 mb-1.5 text-xs uppercase tracking-wider">Similar Artists:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.artistSimilarity.map(artist => <Badge key={artist} variant="secondary" className="bg-foreground/10 text-foreground/90 font-normal">{artist}</Badge>)}
                  </div>
                </div>
              )}
              {aiInterpretation.trackMetadata?.trackUrl && (
                 <p><strong className="font-medium text-foreground/80 text-xs uppercase tracking-wider">Input Track:</strong> <a href={aiInterpretation.trackMetadata.trackUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{aiInterpretation.trackMetadata.trackUrl}</a></p>
              )}
            </CardContent>
          </Card>
        )}

        {songs.length > 0 ? (
          <>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card text-card-foreground shadow-sm apple-subtle-shadow">
              <Table className="min-w-full music-table">
                <TableHeader>
                  <TableRow className="border-b-border/50">
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">Track Name</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%]">Mood</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">Artist Name</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">Album Name</TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">Cover Art</TableHead>
                    <TableHead className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">Spotify</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {songs.map((song) => (
                    <SongRow key={song.id} song={song} mood={primaryMood} />
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
                  className="apple-button bg-foreground/5 hover:bg-foreground/10 text-foreground/80 border-foreground/20 hover:border-foreground/30 font-medium text-sm px-6 py-2.5"
                >
                  {isLoadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="mr-1.5 h-4 w-4" /> // Or another suitable icon
                  )}
                  {isLoadingMore ? 'Loading...' : 'Next 5 Songs'}
                </Button>
              </div>
            )}
          </>
        ) : (
          aiInterpretation && ( 
            <div className="text-center py-10 flex flex-col items-center space-y-3 bg-card rounded-xl apple-subtle-shadow p-6 md:p-8">
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
