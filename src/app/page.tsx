
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe, FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song } from '@/types';
import type { InterpretMusicalIntentInput, InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
import { interpretMusicalIntent } from '@/ai/flows/interpret-musical-intent';
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const SONGS_PER_PAGE = 5;

export default function Home() {
  const { toast } = useToast();
  const [aiInterpretation, setAiInterpretation] = useState<AIOutput | null>(null);
  const [currentFormValues, setCurrentFormValues] = useState<FindYourVibeFormValues | null>(null);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  
  const [isLoadingSearch, setIsLoadingSearch] = useState(false); // For initial search + AI
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For "Load More" button

  const [showResults, setShowResults] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalSongsAvailable, setTotalSongsAvailable] = useState(0);


  const handleSearchSubmit = async (formValuesFromForm: FindYourVibeFormValues, audioDataUriFromForm?: string) => {
    setIsLoadingSearch(true);
    setRecommendedSongs([]);
    setCurrentOffset(0);
    setTotalSongsAvailable(0);
    setShowResults(false);
    setAiInterpretation(null);
    setCurrentFormValues(formValuesFromForm);

    const aiInput: InterpretMusicalIntentInput = {
      moodDescription: formValuesFromForm.moodDescription,
      songName: formValuesFromForm.songName,
      artistName: formValuesFromForm.artistName,
      instrumentTags: formValuesFromForm.instrumentTags,
      // audioSnippet: audioDataUriFromForm // This line was for audio input, removed as per user request
    };
    
    console.log("Calling interpretMusicalIntent with input:", aiInput);
    try {
      const aiOutput = await interpretMusicalIntent(aiInput);
      console.log("Received AI output:", aiOutput);
      setAiInterpretation(aiOutput);

      if (aiOutput && ( (aiOutput.seed_tracks && aiOutput.seed_tracks.length > 0) || 
                         (aiOutput.seed_artists && aiOutput.seed_artists.length > 0) || 
                         (aiOutput.seed_genres && aiOutput.seed_genres.length > 0) ||
                         aiOutput.fallbackSearchQuery )
      ) {
        await loadSongs(aiOutput, formValuesFromForm, 0, true);
      } else {
        toast({
          title: 'Could not interpret intent',
          description: "The AI could not determine specific recommendations or a search query. Please try rephrasing or adding more details.",
          variant: 'destructive',
        });
        setShowResults(true); 
        setRecommendedSongs([]);
        setTotalSongsAvailable(0);
      }
    } catch (error) {
      console.error('Error in search submission or AI interpretation:', (error as Error));
      toast({
        title: 'Error Processing Request',
        description: (error as Error).message || 'Could not process your request. Please try again.',
        variant: 'destructive',
      });
      setShowResults(true);
      setRecommendedSongs([]);
      setTotalSongsAvailable(0);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const loadSongs = async (
    aiOutputToUse: AIOutput,
    formValuesToUse: FindYourVibeFormValues,
    offsetToLoad: number,
    isNewSearch: boolean
  ) => {
    if (!isNewSearch) {
      setIsLoadingMore(true);
    }

    try {
      console.log("Calling fetchSpotifyTracksAction with AI output:", aiOutputToUse, "form values:", formValuesToUse, "offset:", offsetToLoad);
      const { songs: newSongs, total: totalFromServer } = await fetchSpotifyTracksAction(
        aiOutputToUse,
        formValuesToUse, 
        SONGS_PER_PAGE,
        offsetToLoad
      );
      console.log("Received songs from action:", newSongs, "total:", totalFromServer);

      setRecommendedSongs(prev => isNewSearch ? newSongs : [...prev, ...newSongs]);
      setTotalSongsAvailable(totalFromServer); 
      setCurrentOffset(offsetToLoad + newSongs.length);
      setShowResults(true);

      if (newSongs.length === 0 && isNewSearch) {
        toast({ title: "No songs found for this vibe", description: "Try adjusting your mood or filters!", variant: "default"});
      } else if (newSongs.length === 0 && !isNewSearch) {
        // No toast for "no more songs found" during load more, UI will just disable button
      }

    } catch (error) {
      console.error('Error fetching songs:', (error as Error));
      toast({
        title: 'Error Fetching Songs',
        description: (error as Error).message || 'Could not fetch song recommendations. Please try again.',
        variant: 'destructive',
      });
      if(isNewSearch) {
        setRecommendedSongs([]);
        setTotalSongsAvailable(0);
      }
    } finally {
      if (!isNewSearch) {
        setIsLoadingMore(false);
      }
      if (isNewSearch) setShowResults(true);
    }
  };
  
  const handleLoadMore = () => {
    if (!aiInterpretation || !currentFormValues) {
      toast({ title: "Cannot load more", description: "Search context is missing.", variant: "destructive" });
      return;
    }
    if (recommendedSongs.length >= totalSongsAvailable) {
      return;
    }
    loadSongs(aiInterpretation, currentFormValues, currentOffset, false);
  };

  useEffect(() => {
    if (showResults && isLoadingSearch === false && recommendedSongs.length > 0 && currentOffset === recommendedSongs.length) { 
      const resultsSection = document.getElementById('sonic-matches-results');
      resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults, isLoadingSearch, recommendedSongs, currentOffset]);

  const hasMoreSongs = recommendedSongs.length > 0 && recommendedSongs.length < totalSongsAvailable;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-10 md:py-16">
        <h1 className="explainer-text">
          Tell us the vibe, we&apos;ll find your song.
        </h1>
        <div className="animate-fade-in">
          <FindYourVibe 
            onSearchInitiated={handleSearchSubmit} 
            isParentSearching={isLoadingSearch} 
          />
        </div>
        
        {isLoadingSearch && (
          <div className="flex flex-col justify-center items-center py-12 mt-10 space-y-4 animate-fade-in">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">Finding your vibe…</p>
            <p className="text-sm text-muted-foreground">This might take a moment...</p>
          </div>
        )}

        {showResults && !isLoadingSearch && (
          <div id="sonic-matches-results" className="mt-12 md:mt-16 animate-slide-up">
             <SonicMatches 
               aiInterpretation={aiInterpretation} 
               songs={recommendedSongs}
               onLoadMore={handleLoadMore}
               isLoadingMore={isLoadingMore}
               hasMore={hasMoreSongs}
               originalMoodDescription={currentFormValues?.moodDescription}
             />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
