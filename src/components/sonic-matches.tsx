import type { Song, InterpretMusicalIntentOutput } from '@/types';
import { SongCard } from '@/components/song-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SonicMatchesProps {
  aiInterpretation: InterpretMusicalIntentOutput | null;
  songs: Song[];
}

export function SonicMatches({ aiInterpretation, songs }: SonicMatchesProps) {
  if (!aiInterpretation && songs.length === 0) {
    return null;
  }

  return (
    <section id="sonic-matches" className="py-8 md:py-12 w-full">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 text-primary-foreground">Your Sonic Matches</h2>
        
        {aiInterpretation && (
          <Card className="mb-8 bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-xl text-primary-foreground">AI Interpretation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {aiInterpretation.moodDescriptors && aiInterpretation.moodDescriptors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Mood Descriptors:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.moodDescriptors.map(desc => <Badge key={desc} variant="secondary">{desc}</Badge>)}
                  </div>
                </div>
              )}
              {aiInterpretation.instrumentTags && aiInterpretation.instrumentTags.length > 0 && (
                 <div>
                  <h3 className="font-semibold mb-1">Instrument Tags:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.instrumentTags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </div>
              )}
              {aiInterpretation.tempo && (
                <p><strong className="font-semibold">Tempo:</strong> {aiInterpretation.tempo}</p>
              )}
              {aiInterpretation.genreAffinities && aiInterpretation.genreAffinities.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Genre Affinities:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.genreAffinities.map(genre => <Badge key={genre} variant="secondary">{genre}</Badge>)}
                  </div>
                </div>
              )}
               {aiInterpretation.artistSimilarity && aiInterpretation.artistSimilarity.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Similar Artists:</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiInterpretation.artistSimilarity.map(artist => <Badge key={artist} variant="secondary">{artist}</Badge>)}
                  </div>
                </div>
              )}
              {aiInterpretation.trackMetadata?.trackUrl && (
                 <p><strong className="font-semibold">Input Track URL:</strong> <a href={aiInterpretation.trackMetadata.trackUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{aiInterpretation.trackMetadata.trackUrl}</a></p>
              )}
            </CardContent>
          </Card>
        )}

        {songs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        ) : (
          aiInterpretation && ( // Only show no results if an interpretation attempt was made
            <div className="text-center py-10">
              <p className="text-xl text-muted-foreground">No similar songs found based on your criteria.</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your search terms or providing a different song.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
