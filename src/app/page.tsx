
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe, FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song } from '@/types';
import type { InterpretMusicalIntentInput, InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
import { interpretMusicalIntent } from '@/ai/flows/interpret-musical-intent';
import { fetchSpotifyTrackDetailsAction, type SpotifyTrackDetails } from '@/actions/fetch-spotify-track-details-action';
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const SONGS_PER_PAGE = 5;

// Helper to extract Spotify track ID from various URL formats
function extractSpotifyTrackId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'open.spotify.com' && parsedUrl.pathname.includes('/track/')) {
      const parts = parsedUrl.pathname.split('/');
      return parts[parts.indexOf('track') + 1] || null;
    }
  } catch (e) {
    // Invalid URL
  }
  // Regex for other Spotify URI/URL forms (e.g. spotify:track:TRACK_ID)
  const spotifyRegex = /(?:spotify:track:|open\.spotify\.com\/track\/)([a-zA-Z0-9]+)/;
  const match = url.match(spotifyRegex);
  return match ? match[1] : null;
}


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
  const [audioDataUriForAI, setAudioDataUriForAI] = useState<string | null>(null);


  const handleSearchSubmit = async (formValuesFromForm: FindYourVibeFormValues, audioDataUri?: string | null) => {
    setIsLoadingSearch(true);
    setRecommendedSongs([]);
    setCurrentOffset(0);
    setTotalSongsAvailable(0);
    setShowResults(false);
    setAiInterpretation(null);
    setCurrentFormValues(formValuesFromForm);
    setAudioDataUriForAI(audioDataUri || null);


    let derivedMetadata: SpotifyTrackDetails | null = null;
    if (formValuesFromForm.songLink) {
      const spotifyTrackId = extractSpotifyTrackId(formValuesFromForm.songLink);
      if (spotifyTrackId) {
        try {
          derivedMetadata = await fetchSpotifyTrackDetailsAction(spotifyTrackId);
          if (!derivedMetadata) {
            toast({
              title: 'Could Not Fetch Link Details',
              description: "We couldn't get all details for the Spotify link provided, but we'll still try to use it.",
              variant: 'default', // Changed from destructive as it's a soft failure
            });
          }
        } catch (error) {
          console.error("Error fetching Spotify track details:", error);
          toast({
            title: 'Error Fetching Link Details',
            description: "There was an issue processing the song link. The AI will use the link URL directly.",
            variant: 'destructive',
          });
        }
      } else {
         console.log("Non-Spotify link or ID extraction failed, passing link to AI:", formValuesFromForm.songLink);
      }
    }

    const aiInput: InterpretMusicalIntentInput = {
      moodDescription: formValuesFromForm.moodDescription, // Already required by form
      songName: formValuesFromForm.songName,
      artistName: formValuesFromForm.artistName,
      instrumentTags: formValuesFromForm.instrumentTags,
      genre: formValuesFromForm.genre === 'no_preference_selected' ? undefined : formValuesFromForm.genre,
      songLink: formValuesFromForm.songLink || undefined,
      derivedTrackMetadata: derivedMetadata || undefined,
      audioSnippet: audioDataUriForAI || undefined,
    };
    
    try {
      const aiOutput = await interpretMusicalIntent(aiInput);
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
    } catch (error: any) {
      console.error('Error in search submission or AI interpretation:', error);
      toast({
        title: 'Error Processing Request',
        description: error.message || 'Could not process your request. Please try again.',
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

      if (newSongs.length === 0 && isNewSearch) {
        toast({ title: "No songs found for this vibe", description: "Try adjusting your mood or filters!", variant: "default"});
      } else if (newSongs.length === 0 && !isNewSearch) {
        // No toast for "no more songs found" during load more, UI will just disable button
      }

    } catch (error: any) {
      console.error('Error fetching songs:', error);
      toast({
        title: 'Error Fetching Songs',
        description: error.message || 'Could not fetch song recommendations. Please try again.',
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
      setShowResults(true);
    }
  };
  
  const handleLoadMore = () => {
    if (!aiInterpretation || !currentFormValues) {
      toast({ title: "Cannot load more", description: "Search context is missing.", variant: "destructive" });
      return;
    }
    if (recommendedSongs.length >= totalSongsAvailable) {
      // No toast here, button will be disabled by hasMoreSongs
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
