'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FindYourVibe } from '@/components/find-your-vibe';
import { SonicMatches } from '@/components/sonic-matches';
import type { Song, InterpretMusicalIntentOutput as AIOutput } from '@/types';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [aiInterpretation, setAiInterpretation] = useState<AIOutput | null>(null);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleResultsFetched = (interpretation: AIOutput | null, songs: Song[]) => {
    setAiInterpretation(interpretation);
    setRecommendedSongs(songs);
    if (interpretation || songs.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false); // Explicitly hide if no results and no interpretation
    }
  };
  
  // Scroll to results when they are shown
  useEffect(() => {
    if (showResults) {
      const resultsSection = document.getElementById('sonic-matches');
      resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showResults]);


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12"> {/* Added container and padding */}
        <div className="animate-fade-in">
          <FindYourVibe onResultsFetched={handleResultsFetched} setIsLoadingGlobal={setIsLoadingGlobal} />
        </div>
        
        {isLoadingGlobal && (
          <div className="flex flex-col justify-center items-center py-10 mt-8 space-y-3 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> {/* Thinner spinner as per Apple style */}
            <p className="text-lg font-semibold text-foreground">Finding your vibe…</p>
          </div>
        )}

        {showResults && !isLoadingGlobal && (
          <div className="mt-12 md:mt-16 animate-slide-up">
             <SonicMatches aiInterpretation={aiInterpretation} songs={recommendedSongs} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
