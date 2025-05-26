
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe, FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song, InterpretMusicalIntentOutput as AIOutput } from '@/types';
import type { InterpretMusicalIntentInput } from '@/ai/flows/interpret-musical-intent';
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
  
  const [isLoadingSearch, setIsLoadingSearch] = useState(false); // For initial AI interpretation + first song fetch
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For "Next 5" button

  const [showResults, setShowResults] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalSongsAvailable, setTotalSongsAvailable] = useState(0);

  const handleSearchSubmit = async (aiInputFromForm: InterpretMusicalIntentInput, formValuesFromForm: FindYourVibeFormValues) => {
    setIsLoadingSearch(true);
    setRecommendedSongs([]);
    setCurrentOffset(0);
    setTotalSongsAvailable(0);
    setShowResults(false);
    setAiInterpretation(null);
    setCurrentFormValues(formValuesFromForm);

    try {
      const aiOutput = await interpretMusicalIntent(aiInputFromForm);
      setAiInterpretation(aiOutput);
      if (aiOutput) {
        await loadSongs(aiOutput, formValuesFromForm, 0, true);
      } else {
        toast({
          title: 'Could not interpret intent',
          description: "The AI could not fully interpret your request. Please try rephrasing.",
          variant: 'destructive',
        });
        setShowResults(true); 
      }
    } catch (error: any) {
      console.error('Error in search submission:', error);
      toast({
        title: 'Error Interpreting Intent',
        description: error.message || 'Could not process your request. Please try again.',
        variant: 'destructive',
      });
      setShowResults(true);
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
    // If it is a new search, setIsLoadingSearch is already true from handleSearchSubmit

    try {
      const { songs: newSongs, total: totalFromServer } = await fetchSpotifyTracksAction(
        aiOutputToUse,
        formValuesToUse,
        SONGS_PER_PAGE,
        offsetToLoad
      );

      setRecommendedSongs(prev => isNewSearch ? newSongs : [...prev, ...newSongs]);
      setTotalSongsAvailable(totalFromServer);
      setCurrentOffset(offsetToLoad + newSongs.length);
      setShowResults(true);

      if (newSongs.length === 0 && !isNewSearch) {
          toast({ title: "No more songs found", variant: "default"});
      }
      // Initial "no songs" case is handled by SonicMatches component

    } catch (error: any) {
      console.error('Error fetching songs:', error);
      toast({
        title: 'Error Fetching Songs',
        description: error.message || 'Could not fetch song recommendations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (!isNewSearch) {
        setIsLoadingMore(false);
      }
      // For new searches, setIsLoadingSearch is handled by handleSearchSubmit's finally block
    }
  };
  
  const handleLoadMore = () => {
    if (!aiInterpretation || !currentFormValues) {
      toast({ title: "Cannot load more", description: "Search context is missing.", variant: "destructive" });
      return;
    }
    loadSongs(aiInterpretation, currentFormValues, currentOffset, false);
  };

  // Scroll to results when they are shown for the first time
  useEffect(() => {
    if (showResults && recommendedSongs.length <= SONGS_PER_PAGE && recommendedSongs.length > 0) { // Only scroll on initial batch
      const resultsSection = document.getElementById('sonic-matches');
      resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults, recommendedSongs.length]);

  const hasMoreSongs = recommendedSongs.length > 0 && recommendedSongs.length < totalSongsAvailable;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="animate-fade-in">
          <FindYourVibe onSearchInitiated={handleSearchSubmit} isParentSearching={isLoadingSearch} />
        </div>
        
        {isLoadingSearch && (
          <div className="flex flex-col justify-center items-center py-10 mt-8 space-y-3 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">Finding your vibe…</p>
          </div>
        )}

        {showResults && !isLoadingSearch && (
          <div className="mt-12 md:mt-16 animate-slide-up">
             <SonicMatches 
               aiInterpretation={aiInterpretation} 
               songs={recommendedSongs}
               onLoadMore={handleLoadMore}
               isLoadingMore={isLoadingMore}
               hasMore={hasMoreSongs}
             />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
