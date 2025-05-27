
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe, FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song } from '@/types';
import type { InterpretMusicalIntentInput, InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
import type { ProfileAnalysisOutput } from '@/ai/flows/analyze-social-profile';
import type { InterpretProfileForMusicInput } from '@/ai/flows/interpret-profile-for-music';
import { interpretMusicalIntent } from '@/ai/flows/interpret-musical-intent';
import { analyzeSocialProfile } from '@/ai/flows/analyze-social-profile';
import { interpretProfileAnalysisForMusic } from '@/ai/flows/interpret-profile-for-music';
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { buildSpotifyParamsFromMoodInput } from '@/lib/music/buildRecommendationParams';

const SONGS_PER_PAGE = 5;

export default function Home() {
  const { toast } = useToast();
  const [aiInterpretation, setAiInterpretation] = useState<AIOutput | null>(null);
  const [currentFullFormValues, setCurrentFullFormValues] = useState<FindYourVibeFormValues | null>(null);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  
  const [isLoadingSearch, setIsLoadingSearch] = useState(false); 
  const [isLoadingMore, setIsLoadingMore] = useState(false); 

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
    setProfileAnalysisResult(null); // Clear previous results
    console.log("page.tsx: handleAnalyzeProfile - Starting analysis for URL:", url);
    try {
      const analysis = await analyzeSocialProfile({ socialProfileUrl: url });
      setProfileAnalysisResult(analysis);
      console.log("page.tsx: handleAnalyzeProfile - Analysis result:", JSON.stringify(analysis));
      if (!analysis.keywords?.length && !analysis.location && !analysis.languages?.length) {
        toast({ title: "Profile Analysis", description: "Could not extract detailed insights from the profile, but will use the URL for general context.", variant: "default" });
      } else {
        toast({ title: "Profile Analysis Complete", description: "Insights extracted. You can now find your vibe based on this profile.", variant: "default" });
      }
    } catch (error) {
      let message = 'Could not analyze the profile URL.';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') message = (error as any).message;
      
      console.error('page.tsx: handleAnalyzeProfile - Error analyzing profile:', message, error);
      toast({
        title: 'Profile Analysis Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsProfileAnalysisLoading(false);
      console.log("page.tsx: handleAnalyzeProfile - Finished analysis for URL:", url);
    }
  }, [toast]);


  const handleSearchSubmit = async (
    formValuesFromForm: FindYourVibeFormValues,
    searchType: 'mood' | 'profile' | 'structured_mood'
  ) => {
    console.log("page.tsx: handleSearchSubmit called with formValues:", JSON.stringify(formValuesFromForm), "searchType:", searchType);
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
        console.log("page.tsx: Structured mood path. Params:", JSON.stringify(formValuesFromForm.moodComposerParams));
        const spotifyParams = buildSpotifyParamsFromMoodInput(formValuesFromForm.moodComposerParams);
        
        const hasSeeds = spotifyParams.seed_genres && spotifyParams.seed_genres.length > 0;
        // Ensure Object.keys() is used on spotifyParams, not finalAiOutput which is null here
        const hasTargets = Object.keys(spotifyParams).some(k => k.startsWith('target_') && spotifyParams[k as keyof typeof spotifyParams] !== undefined);

        if (hasSeeds || hasTargets) {
             finalAiOutput = {
                seed_tracks: undefined, 
                seed_artists: undefined, 
                ...spotifyParams 
             };
        } else {
            toast({ title: "Mood Composer", description: "The selected mood profile and adjustments didn't yield specific parameters. Trying a general search.", variant: "default" });
            finalAiOutput = { 
                fallbackSearchQuery: formValuesFromForm.moodComposerParams.selectedMoodName 
                                     ? `music for ${formValuesFromForm.moodComposerParams.selectedMoodName.replace(/_/g, ' ')}` 
                                     : "popular music"
            };
        }
        console.log("page.tsx: Structured mood - finalAiOutput for Spotify:", JSON.stringify(finalAiOutput));

      } else if (searchType === 'mood' && formValuesFromForm.moodDescription) {
        console.log("page.tsx: Free-text mood path. Description:", formValuesFromForm.moodDescription);
        const aiInput: InterpretMusicalIntentInput = {
          moodDescription: formValuesFromForm.moodDescription,
          songName: formValuesFromForm.songName,
          instrumentTags: formValuesFromForm.instrumentTags,
        };
        console.log("page.tsx: Calling interpretMusicalIntent with input:", JSON.stringify(aiInput));
        finalAiOutput = await interpretMusicalIntent(aiInput);
        console.log("page.tsx: Free-text mood - finalAiOutput from interpretMusicalIntent:", JSON.stringify(finalAiOutput));

      } else if (searchType === 'profile' && formValuesFromForm.socialProfileUrl) {
        console.log("page.tsx: Social profile path. URL:", formValuesFromForm.socialProfileUrl);
        let currentAnalysis = profileAnalysisResult;
        // Re-analyze if URL changed or no current analysis
        if (!currentAnalysis || formValuesFromForm.socialProfileUrl !== currentAnalysis.sourceUrl) {
            setIsProfileAnalysisLoading(true); 
            try {
                console.log("page.tsx: Social profile - Re-analyzing profile URL:", formValuesFromForm.socialProfileUrl);
                currentAnalysis = await analyzeSocialProfile({ socialProfileUrl: formValuesFromForm.socialProfileUrl });
                setProfileAnalysisResult(currentAnalysis); 
                console.log("page.tsx: Social profile - Analysis result:", JSON.stringify(currentAnalysis));
            } catch(profileError) {
                let message = 'Failed to analyze social profile during search.';
                if (profileError instanceof Error) message = profileError.message;
                else if (typeof profileError === 'string') message = profileError;
                else if (typeof profileError === 'object' && profileError !== null && 'message' in profileError && typeof (profileError as any).message === 'string') message = (profileError as any).message;
                console.error("page.tsx: Social profile - Error re-analyzing profile:", message, profileError);
                toast({ title: "Profile Analysis Error", description: message, variant: "destructive" });
                // Decide if we should proceed with empty analysis or stop
                currentAnalysis = { sourceUrl: formValuesFromForm.socialProfileUrl, keywords:[], location: '', languages: [] }; // Proceed with empty
            } finally {
                setIsProfileAnalysisLoading(false);
            }
        }

        const profileInterpretInput: InterpretProfileForMusicInput = {
          analysis: currentAnalysis || { sourceUrl: formValuesFromForm.socialProfileUrl, keywords: [], location: '', languages: [] },
          songName: formValuesFromForm.songName,
          instrumentTags: formValuesFromForm.instrumentTags,
        };
        console.log("page.tsx: Calling interpretProfileAnalysisForMusic with input:", JSON.stringify(profileInterpretInput));
        finalAiOutput = await interpretProfileAnalysisForMusic(profileInterpretInput);
        console.log("page.tsx: Social profile - finalAiOutput from interpretProfileAnalysisForMusic:", JSON.stringify(finalAiOutput));
      } else {
        toast({ title: "Invalid Search", description: "Please provide input for the selected search method.", variant: "destructive" });
        console.log("page.tsx: Invalid search type or missing primary input for active tab.");
        setIsLoadingSearch(false);
        setShowResults(true); 
        return;
      }

      console.log("page.tsx: Final AI Output before loading songs:", JSON.stringify(finalAiOutput));
      setAiInterpretation(finalAiOutput);

      if (finalAiOutput && ( (finalAiOutput.seed_tracks && finalAiOutput.seed_tracks.length > 0) || 
                         (finalAiOutput.seed_artists && finalAiOutput.seed_artists.length > 0) || 
                         (finalAiOutput.seed_genres && finalAiOutput.seed_genres.length > 0) ||
                         finalAiOutput.fallbackSearchQuery ||
                         Object.keys(finalAiOutput).some(k => k.startsWith('target_') && finalAiOutput[k as keyof AIOutput] !== undefined))
        )
      {
        console.log("page.tsx: AI output is actionable. Calling loadSongs.");
        await loadSongs(finalAiOutput, formValuesFromForm, 0, true);
      } else {
        console.log("page.tsx: AI output NOT actionable. Seeds/targets/fallback missing. Final AI Output:", JSON.stringify(finalAiOutput));
        toast({
          title: 'Could not interpret intent',
          description: "The AI could not determine specific recommendations or a search query. Please try rephrasing or adding more details.",
          variant: 'destructive',
        });
        setRecommendedSongs([]);
        setTotalSongsAvailable(0);
        setShowResults(true); 
      }
    } catch (error) {
      let message = 'Could not process your request. Please try again.';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') message = (error as any).message;

      console.error('page.tsx: Error in search submission or AI interpretation pipeline:', message, error);
      toast({
        title: 'Error Processing Request',
        description: message,
        variant: 'destructive',
      });
      setRecommendedSongs([]);
      setTotalSongsAvailable(0);
      setShowResults(true); // Ensure results area is shown on error
    } finally {
      setIsLoadingSearch(false);
      console.log("page.tsx: handleSearchSubmit FINALLY block, isLoadingSearch set to false. showResults current value:", showResults);
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
    console.log("page.tsx: loadSongs - START. AI output:", JSON.stringify(aiOutputToUse), "Offset:", offsetToLoad, "IsNewSearch:", isNewSearch);

    try {
      const { songs: newSongs, total: totalFromServer } = await fetchSpotifyTracksAction(
        aiOutputToUse,
        formValuesToUse, 
        SONGS_PER_PAGE,
        offsetToLoad
      );
      console.log("page.tsx: loadSongs - Received from action. New songs count:", newSongs.length, "Total from server:", totalFromServer);

      setRecommendedSongs(prev => isNewSearch ? newSongs : [...prev, ...newSongs]);
      setTotalSongsAvailable(totalFromServer); 
      setCurrentOffset(offsetToLoad + newSongs.length);
      
      if (newSongs.length === 0 && isNewSearch) {
        toast({ title: "No songs found for this vibe", description: "Try adjusting your mood or filters!", variant: "default"});
      }
      console.log("page.tsx: loadSongs - State updated. Recommended songs count:", (isNewSearch ? newSongs : recommendedSongs.concat(newSongs)).length);

    } catch (error) {
      let message = 'Could not fetch song recommendations. Please try again.';
      if (error instanceof Error) message = error.message;
      else if (typeof error === 'string') message = error;
      else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') message = (error as any).message;
      
      console.error('page.tsx: loadSongs - Error fetching songs:', message, error);
      toast({
        title: 'Error Fetching Songs',
        description: message,
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
      console.log("page.tsx: loadSongs FINALLY block. isLoadingMore:", isLoadingMore, "showResults set to true.");
    }
  };
  
  const handleLoadMore = () => {
    if (!aiInterpretation || !currentFullFormValues) {
      toast({ title: "Cannot load more", description: "Search context is missing.", variant: "destructive" });
      console.warn("page.tsx: handleLoadMore - Cannot load more, context missing. AI Interpretation:", !!aiInterpretation, "Form Values:", !!currentFullFormValues);
      return;
    }
    if (recommendedSongs.length >= totalSongsAvailable && totalSongsAvailable > 0) { // Added check for totalSongsAvailable > 0
      console.log("page.tsx: handleLoadMore - All songs loaded or total is zero.");
      toast({ title: "All songs loaded", description: "You've reached the end of the results for this vibe!", variant: "default" });
      return;
    }
    console.log("page.tsx: handleLoadMore - Loading next batch of songs. Current offset:", currentOffset);
    loadSongs(aiInterpretation, currentFullFormValues, currentOffset, false);
  };

  useEffect(() => {
    console.log("page.tsx: Scroll useEffect triggered. showResults:", showResults, "isLoadingSearch:", isLoadingSearch, "recommendedSongs.length:", recommendedSongs.length, "currentOffset:", currentOffset);
    // Scroll to results only if it's a new search, loading is finished, and there are songs
    if (showResults && !isLoadingSearch && recommendedSongs.length > 0 && currentOffset === recommendedSongs.length && currentOffset <= SONGS_PER_PAGE ) { 
      console.log("page.tsx: Scroll condition MET for new search. Scrolling to results.");
      const resultsSection = document.getElementById('sonic-matches-results');
      resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults, isLoadingSearch, recommendedSongs, currentOffset]);

  const hasMoreSongs = recommendedSongs.length > 0 && recommendedSongs.length < totalSongsAvailable;
  
  const currentMoodDescriptionForDisplay = activeSearchType === 'structured_mood' 
    ? currentFullFormValues?.moodComposerParams?.selectedMoodName?.replace(/_/g, ' ') || currentFullFormValues?.moodComposerParams?.energy?.toString() // Or a display name if you have one
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
            <p className="text-sm text-muted-foreground">This might take a moment as we consult the music oracles...</p>
          </div>
        )}

        {showResults && !isLoadingSearch && (
          <div id="sonic-matches-results" className="mt-12 md:mt-16 animate-slide-up">
             <SonicMatches 
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
