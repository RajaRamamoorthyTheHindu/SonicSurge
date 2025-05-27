
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe, FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song, ProfileAnalysisOutput } from '@/types';
import type { InterpretMusicalIntentInput, InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
import type { InterpretProfileForMusicInput } from '@/ai/flows/interpret-profile-for-music';
import { interpretMusicalIntent } from '@/ai/flows/interpret-musical-intent';
import { analyzeSocialProfile } from '@/ai/flows/analyze-social-profile';
import { interpretProfileAnalysisForMusic } from '@/ai/flows/interpret-profile-for-music';
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { buildSpotifyParamsFromMoodInput, MoodInput } from '@/lib/music/buildRecommendationParams';

const SONGS_PER_PAGE = 5;

export default function Home() {
  const { toast } = useToast();
  const [aiInterpretation, setAiInterpretation] = useState<AIOutput | null>(null);
  const [currentFullFormValues, setCurrentFullFormValues] = useState<FindYourVibeFormValues | null>(null);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  
  const [isLoadingSearch, setIsLoadingSearch] = useState(false); // For initial search + AI
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For "Load More" button

  const [showResults, setShowResults] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalSongsAvailable, setTotalSongsAvailable] = useState(0);

  const [profileAnalysisResult, setProfileAnalysisResult] = useState<ProfileAnalysisOutput | null>(null);
  const [isProfileAnalysisLoading, setIsProfileAnalysisLoading] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState<'mood' | 'profile' | 'structured_mood' | null>(null);


  const handleAnalyzeProfile = useCallback(async (url: string) => {
    if (!url) {
      toast({ title: "No URL", description: "Please enter a social profile URL.", variant: "destructive" });
      return;
    }
    setIsProfileAnalysisLoading(true);
    setProfileAnalysisResult(null);
    try {
      const analysis = await analyzeSocialProfile({ socialProfileUrl: url });
      setProfileAnalysisResult(analysis);
      if (!analysis.keywords?.length && !analysis.location && !analysis.languages?.length) {
        toast({ title: "Profile Analysis", description: "Could not extract detailed insights, but will use URL for context.", variant: "default" });
      } else {
        toast({ title: "Profile Analysis Complete", description: "Insights extracted. You can now find your vibe.", variant: "default" });
      }
    } catch (error) {
      console.error('Error analyzing profile:', (error as Error));
      toast({
        title: 'Profile Analysis Failed',
        description: (error as Error).message || 'Could not analyze the profile URL.',
        variant: 'destructive',
      });
    } finally {
      setIsProfileAnalysisLoading(false);
    }
  }, [toast]);


  const handleSearchSubmit = async (
    formValuesFromForm: FindYourVibeFormValues,
    searchType: 'mood' | 'profile' | 'structured_mood'
  ) => {
    setIsLoadingSearch(true);
    setRecommendedSongs([]);
    setCurrentOffset(0);
    setTotalSongsAvailable(0);
    setShowResults(false);
    setAiInterpretation(null);
    setCurrentFullFormValues(formValuesFromForm);
    setActiveSearchType(searchType);

    let finalAiOutput: AIOutput | null = null;

    try {
      if (searchType === 'structured_mood' && formValuesFromForm.moodComposerParams) {
        console.log("Structured mood path. Params:", formValuesFromForm.moodComposerParams);
        const spotifyParams = buildSpotifyParamsFromMoodInput(formValuesFromForm.moodComposerParams);
        
        // The buildSpotifyParamsFromMoodInput directly gives parameters for Spotify.
        // We need to ensure it fits the AIOutput structure for fetchSpotifyTracksAction.
        // It will have seed_genres, target_*, etc. It won't have seed_tracks/artists from this path unless we add them.
        // It also won't have a fallbackSearchQuery from this direct path.
        
        const hasSeeds = spotifyParams.seed_genres && spotifyParams.seed_genres.length > 0;
        
        if (hasSeeds || spotifyParams.target_danceability || spotifyParams.target_energy || spotifyParams.target_instrumentalness || spotifyParams.target_tempo || spotifyParams.target_valence) {
             finalAiOutput = {
                // Ensure all potential fields of AIOutput are at least undefined if not present
                seed_tracks: undefined, 
                seed_artists: undefined, 
                ...spotifyParams // This will spread seed_genres, target_*, etc.
             };
        } else {
            // If structured mood yields no useful params, maybe fallback to free-text if available?
            // For now, treat as no-op if no seeds/targets generated.
             toast({ title: "Mood Composer", description: "The selected mood profile and adjustments didn't yield specific parameters. Try the advanced text description or add more details.", variant: "default" });
        }

      } else if (searchType === 'mood' && formValuesFromForm.moodDescription) {
        console.log("Free-text mood path. Description:", formValuesFromForm.moodDescription);
        const aiInput: InterpretMusicalIntentInput = {
          moodDescription: formValuesFromForm.moodDescription,
          songName: formValuesFromForm.songName,
          instrumentTags: formValuesFromForm.instrumentTags,
        };
        console.log("Calling interpretMusicalIntent with input:", aiInput);
        finalAiOutput = await interpretMusicalIntent(aiInput);

      } else if (searchType === 'profile' && formValuesFromForm.socialProfileUrl) {
        console.log("Social profile path. URL:", formValuesFromForm.socialProfileUrl);
        let currentAnalysis = profileAnalysisResult;
        // If profileAnalysisResult is not set for the current URL, re-analyze (or use cached if service does)
        if (!currentAnalysis || formValuesFromForm.socialProfileUrl !== currentAnalysis.sourceUrl) {
            setIsProfileAnalysisLoading(true); // Show loading for this implicit analysis
            try {
                currentAnalysis = await analyzeSocialProfile({ socialProfileUrl: formValuesFromForm.socialProfileUrl });
                setProfileAnalysisResult(currentAnalysis); // Update state with new analysis
            } finally {
                setIsProfileAnalysisLoading(false);
            }
        }

        const profileInterpretInput: InterpretProfileForMusicInput = {
          analysis: currentAnalysis || { socialProfileUrl: formValuesFromForm.socialProfileUrl, keywords: [], location: '', languages: [] },
          songName: formValuesFromForm.songName,
          instrumentTags: formValuesFromForm.instrumentTags,
        };
        console.log("Calling interpretProfileAnalysisForMusic with input:", profileInterpretInput);
        finalAiOutput = await interpretProfileAnalysisForMusic(profileInterpretInput);
      } else {
        toast({ title: "Invalid Search", description: "Please provide input for the selected search method.", variant: "destructive" });
        setIsLoadingSearch(false);
        return;
      }

      console.log("Final AI Output for Spotify:", finalAiOutput);
      setAiInterpretation(finalAiOutput);

      if (finalAiOutput && ( (finalAiOutput.seed_tracks && finalAiOutput.seed_tracks.length > 0) || 
                         (finalAiOutput.seed_artists && finalAiOutput.seed_artists.length > 0) || 
                         (finalAiOutput.seed_genres && finalAiOutput.seed_genres.length > 0) ||
                         finalAiOutput.fallbackSearchQuery ||
                         Object.keys(finalAiOutput).some(k => k.startsWith('target_'))) // Check for any target properties
        )
      {
        await loadSongs(finalAiOutput, formValuesFromForm, 0, true);
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
      console.log("Calling fetchSpotifyTracksAction with AI output:", aiOutputToUse, "form values (less relevant now):", formValuesToUse, "offset:", offsetToLoad);
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
    if (!aiInterpretation || !currentFullFormValues) {
      toast({ title: "Cannot load more", description: "Search context is missing.", variant: "destructive" });
      return;
    }
    if (recommendedSongs.length >= totalSongsAvailable) {
      return;
    }
    loadSongs(aiInterpretation, currentFullFormValues, currentOffset, false);
  };

  useEffect(() => {
    if (showResults && isLoadingSearch === false && recommendedSongs.length > 0 && currentOffset === recommendedSongs.length) { 
      const resultsSection = document.getElementById('sonic-matches-results');
      resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults, isLoadingSearch, recommendedSongs, currentOffset]);

  const hasMoreSongs = recommendedSongs.length > 0 && recommendedSongs.length < totalSongsAvailable;
  
  const currentMoodDescriptionForDisplay = activeSearchType === 'structured_mood' 
    ? currentFullFormValues?.moodComposerParams?.selectedMoodName // Or a display name if you have one
    : currentFullFormValues?.moodDescription;


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
            profileAnalysis={profileAnalysisResult}
            profileAnalysisLoading={isProfileAnalysisLoading}
            onAnalyzeProfile={handleAnalyzeProfile}
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
               originalMoodDescription={currentMoodDescriptionForDisplay}
             />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

    