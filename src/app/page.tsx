// src/app/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe, FormValues as FindYourVibeFormValues } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song } from '@/types';
import type { InterpretMusicalIntentInput, InterpretMusicalIntentOutput as AIOutput } from '@/ai/flows/interpret-musical-intent';
// import type { AnalyzeSocialProfileOutput } from '@/ai/flows/analyze-social-profile'; // Removed unused import
import type { InterpretProfileForMusicInput } from '@/ai/flows/interpret-profile-for-music';
import { interpretMusicalIntent } from '@/ai/flows/interpret-musical-intent';
import { analyzeSocialProfile } from '@/ai/flows/analyze-social-profile';
import { interpretProfileAnalysisForMusic } from '@/ai/flows/interpret-profile-for-music';
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import moodsData from '@/config/moods.json';

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

  const [profileAnalysisResult, setProfileAnalysisResult] = useState<Awaited<ReturnType<typeof analyzeSocialProfile>> | null>(null);
  const [isProfileAnalysisLoading, setIsProfileAnalysisLoading] = useState(false);
  // const [activeSearchType, setActiveSearchType] = useState<'mood' | 'profile' | 'structured_mood' | null>(null); // Removed unused variable
  const [currentMoodDescriptionForDisplay, setCurrentMoodDescriptionForDisplay] = useState<string | undefined>(undefined);


  const handleAnalyzeProfile = useCallback(async (url: string) => {
    if (!url) {
      toast({ title: "No URL", description: "Please enter a social profile URL.", variant: "destructive" });
      return;
    }
    setIsProfileAnalysisLoading(true);
    setProfileAnalysisResult(null);
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
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: string }).message === 'string') {
        message = (error as { message: string }).message;
      }
      
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
    console.log("page.tsx: handleSearchSubmit called with formValues:", JSON.stringify(formValuesFromForm, null, 2), "searchType:", searchType);
    setIsLoadingSearch(true);
    setRecommendedSongs([]);
    setCurrentOffset(0);
    setTotalSongsAvailable(0);
    setShowResults(false);
    setAiInterpretation(null);
    setCurrentFullFormValues(formValuesFromForm); 
    // setActiveSearchType(searchType); // Removed assignment to unused variable
    setCurrentMoodDescriptionForDisplay(formValuesFromForm.moodDescription || formValuesFromForm.moodComposerParams?.selectedMoodName?.replace(/_/g, ' '));


    let finalAiOutput: AIOutput | null = null;

    try {
      if (searchType === 'profile' && formValuesFromForm.socialProfileUrl) {
        console.log("page.tsx: Social profile path. URL:", formValuesFromForm.socialProfileUrl);
        let currentAnalysis = profileAnalysisResult;

        if (!currentAnalysis || formValuesFromForm.socialProfileUrl !== currentAnalysis.sourceUrl) {
            setIsProfileAnalysisLoading(true); 
            try {
                console.log("page.tsx: Social profile - Analyzing profile URL:", formValuesFromForm.socialProfileUrl);
                currentAnalysis = await analyzeSocialProfile({ socialProfileUrl: formValuesFromForm.socialProfileUrl });
                setProfileAnalysisResult(currentAnalysis); 
                console.log("page.tsx: Social profile - Analysis result:", JSON.stringify(currentAnalysis));
            } catch(profileError) {
                let message = 'Failed to analyze social profile during search.';
                 if (profileError instanceof Error) {
                    message = profileError.message;
                 } else if (typeof profileError === 'string') {
                    message = profileError;
                 } else if (typeof profileError === 'object' && profileError !== null && 'message' in profileError && typeof (profileError as { message: string }).message === 'string') {
                    message = (profileError as { message: string }).message;
                 }
                console.error("page.tsx: Social profile - Error analyzing profile:", message, profileError);
                toast({ title: "Profile Analysis Error", description: message, variant: "destructive" });
                currentAnalysis = { sourceUrl: formValuesFromForm.socialProfileUrl, keywords: ['dummy', 'keyword'], location: 'Dummy Location', languages: ['dummy_lang'] }; 
            } finally {
                setIsProfileAnalysisLoading(false);
            }
        }

        const profileInterpretInput: InterpretProfileForMusicInput = {
          analysis: currentAnalysis || { sourceUrl: formValuesFromForm.socialProfileUrl, keywords: [], location: '', languages: [] },
          songName: formValuesFromForm.songName,
          instrumentTags: formValuesFromForm.instrumentTags,
        };
        console.log("page.tsx: Calling interpretProfileAnalysisForMusic with input:", JSON.stringify(profileInterpretInput, null, 2));
        finalAiOutput = await interpretProfileAnalysisForMusic(profileInterpretInput);
        console.log("page.tsx: Social profile - finalAiOutput from interpretProfileAnalysisForMusic:", JSON.stringify(finalAiOutput));

      } else if (searchType === 'mood' || searchType === 'structured_mood') {
        console.log("page.tsx: Unified Mood path (mood or structured_mood).");
        
        const aiInput: Partial<InterpretMusicalIntentInput> = {
            moodDescription: formValuesFromForm.moodDescription,
            songName: formValuesFromForm.songName,
            instrumentTags: formValuesFromForm.instrumentTags,
        };

        if (formValuesFromForm.moodComposerParams) {
            const moodProfile = moodsData.find(m => m.name === formValuesFromForm.moodComposerParams?.selectedMoodName);
            aiInput.moodComposerSelections = {
                selectedMoodDisplayName: moodProfile?.displayName,
                energy: formValuesFromForm.moodComposerParams.energy,
                valence: formValuesFromForm.moodComposerParams.valence,
                tempo: formValuesFromForm.moodComposerParams.tempo ? Number(formValuesFromForm.moodComposerParams.tempo) : undefined,
                languages: formValuesFromForm.moodComposerParams.languages,
                associatedKeywords: moodProfile?.search_keywords || [],
            };
        }
        
        console.log("page.tsx: Calling interpretMusicalIntent with input:", JSON.stringify(aiInput, null, 2));
        finalAiOutput = await interpretMusicalIntent(aiInput as InterpretMusicalIntentInput);
        console.log("page.tsx: Unified Mood - finalAiOutput from interpretMusicalIntent:", JSON.stringify(finalAiOutput));

      } else {
        toast({ title: "Invalid Search", description: "Please provide input for the selected search method.", variant: "destructive" });
        console.warn("page.tsx: Invalid search type or missing primary input. searchType:", searchType, "formValues:", formValuesFromForm);
        setIsLoadingSearch(false);
        setShowResults(true); 
        return;
      }

      if (!finalAiOutput || !finalAiOutput.fallbackSearchQuery || finalAiOutput.fallbackSearchQuery.trim() === "") {
          console.warn("page.tsx: AI output was null or did not contain a fallbackSearchQuery. Constructing a generic fallback.", finalAiOutput);
          let fallback = "popular music";
          if (formValuesFromForm.moodDescription && formValuesFromForm.moodDescription.trim() !== "") {
              fallback = `music for ${formValuesFromForm.moodDescription.trim()}`;
          } else if (formValuesFromForm.moodComposerParams?.selectedMoodName) {
              const moodProfile = moodsData.find(m => m.name === formValuesFromForm.moodComposerParams?.selectedMoodName);
              fallback = `music for ${moodProfile?.displayName || formValuesFromForm.moodComposerParams.selectedMoodName.replace(/_/g, ' ')}`;
          } else if (formValuesFromForm.songName && formValuesFromForm.songName.trim() !== "") {
              fallback = `music like ${formValuesFromForm.songName.trim()}`;
          } else if (formValuesFromForm.instrumentTags && formValuesFromForm.instrumentTags.trim() !== "") {
              fallback = `music with ${formValuesFromForm.instrumentTags.trim()}`;
          }
          
          if (finalAiOutput) {
            finalAiOutput.fallbackSearchQuery = fallback;
          } else {
            finalAiOutput = { fallbackSearchQuery: fallback };
          }
      }

      console.log("page.tsx: Final AI Output before loading songs:", JSON.stringify(finalAiOutput));
      setAiInterpretation(finalAiOutput);

      if (finalAiOutput?.fallbackSearchQuery) {
        console.log("page.tsx: AI output has fallbackSearchQuery. Calling loadSongs.");
        await loadSongs(finalAiOutput, formValuesFromForm, 0, true);
      } else {
        console.error("page.tsx: UNEXPECTED - finalAiOutput is null or missing fallbackSearchQuery after fallback logic.");
        toast({
          title: 'Could not interpret intent',
          description: "The AI could not determine a search query. Please try rephrasing or adding more details.",
          variant: 'destructive',
        });
        setRecommendedSongs([]);
        setTotalSongsAvailable(0);
        setShowResults(true); 
      }
    } catch (error) {
      let message = 'Could not process your request. Please try again.';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: string }).message === 'string') {
        message = (error as { message: string }).message;
      }

      console.error('page.tsx: Error in search submission or AI interpretation pipeline:', message, error);
      toast({
        title: 'Error Processing Request',
        description: message,
        variant: 'destructive',
      });
      setRecommendedSongs([]);
      setTotalSongsAvailable(0);
      setShowResults(true); 
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
    console.log("page.tsx: loadSongs - START. AI output:", JSON.stringify(aiOutputToUse), "Form values:", JSON.stringify(formValuesToUse, null, 2), "Offset:", offsetToLoad, "IsNewSearch:", isNewSearch);

    try {
      const { songs: newSongs, total: totalFromServer } = await fetchSpotifyTracksAction(
        aiOutputToUse,
        formValuesToUse, 
        SONGS_PER_PAGE,
        offsetToLoad
      );
      console.log("page.tsx: loadSongs - Received from action. New songs count:", newSongs.length, "Total from server:", totalFromServer);

      setRecommendedSongs(prev => {
        if (isNewSearch) {
          return newSongs;
        } else {
          const existingIds = new Set(prev.map(s => s.id));
          const uniqueNewSongs = newSongs.filter(s => !existingIds.has(s.id));
          return [...prev, ...uniqueNewSongs];
        }
      });
      setTotalSongsAvailable(totalFromServer); 
      setCurrentOffset(offsetToLoad + newSongs.length);
      console.log("page.tsx: loadSongs - State updated. Recommended songs count:", isNewSearch ? newSongs.length : recommendedSongs.length + newSongs.filter(s => !recommendedSongs.find(rs => rs.id === s.id)).length );
      
      if (newSongs.length === 0 && isNewSearch) {
        toast({ title: "No songs found for this vibe", description: "Try adjusting your mood or filters!", variant: "default"});
      }
    } catch (error) {
      let message = 'Could not fetch song recommendations. Please try again.';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: string }).message === 'string') {
        message = (error as { message: string }).message;
      }
      
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
      console.log("page.tsx: loadSongs FINALLY block. isLoadingMore (after):", isLoadingMore, "showResults set to true.");
    }
  };
  
  const handleLoadMore = () => {
    if (!aiInterpretation || !currentFullFormValues) {
      toast({ title: "Cannot load more", description: "Search context is missing.", variant: "destructive" });
      console.warn("page.tsx: handleLoadMore - Cannot load more, context missing. AI Interpretation:", !!aiInterpretation, "Form Values:", !!currentFullFormValues);
      return;
    }
    if (recommendedSongs.length >= totalSongsAvailable && totalSongsAvailable > 0) { 
      console.log("page.tsx: handleLoadMore - All songs loaded or total is zero.");
      toast({ title: "All songs loaded", description: "You've reached the end of the results for this vibe!", variant: "default" });
      return;
    }
    const nextOffset = recommendedSongs.length;
    console.log("page.tsx: handleLoadMore - Loading next batch of songs. Next offset to request:", nextOffset);
    loadSongs(aiInterpretation, currentFullFormValues, nextOffset, false);
  };

  useEffect(() => {
    console.log("page.tsx: Scroll useEffect triggered. showResults:", showResults, "isLoadingSearch:", isLoadingSearch, "recommendedSongs.length:", recommendedSongs.length, "currentOffset:", currentOffset);
    if (showResults && !isLoadingSearch && recommendedSongs.length > 0 && currentOffset === recommendedSongs.length && currentOffset <= SONGS_PER_PAGE ) { 
      console.log("page.tsx: Scroll condition MET for new search. Scrolling to results.");
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
