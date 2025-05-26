
import type { Song, InterpretMusicalIntentOutput } from '@/types';
import { SongCard } from '@/components/song-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react'; // For "No results" message

interface SonicMatchesProps {
  aiInterpretation: InterpretMusicalIntentOutput | null;
  songs: Song[];
}

export function SonicMatches({ aiInterpretation, songs }: SonicMatchesProps) {
  if (!aiInterpretation && songs.length === 0) {
    return null;
  }

  const hasContent = songs.length > 0 || (aiInterpretation && 
    (aiInterpretation.moodDescriptors?.length > 0 ||
     aiInterpretation.instrumentTags?.length > 0 ||
     aiInterpretation.tempo ||
     aiInterpretation.genreAffinities?.length > 0 ||
     aiInterpretation.artistSimilarity?.length > 0 ||
     aiInterpretation.trackMetadata?.trackUrl
    ));

  if (!hasContent && !(songs.length === 0 && aiInterpretation)) { // Ensure we don't render an empty section unless it's a "no results" state
    return null;
  }
  
  return (
    <section id="sonic-matches" className="w-full">
      <div className="space-y-8 md:space-y-10">
        <h2 className="text-2xl md:text-3xl font-semibold text-center text-foreground">
          Your Sonic Matches
        </h2>
        
        {aiInterpretation && (
          (aiInterpretation.moodDescriptors?.length > 0 ||
           aiInterpretation.instrumentTags?.length > 0 ||
           aiInterpretation.tempo ||
           aiInterpretation.genreAffinities?.length > 0 ||
           aiInterpretation.artistSimilarity?.length > 0 ||
           aiInterpretation.trackMetadata?.trackUrl
          ) && (
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
          )
        )}

        {songs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {songs.map((song, index) => (
              <div key={song.id} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms`}}>
                <SongCard song={song} />
              </div>
            ))}
          </div>
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
