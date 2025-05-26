'use client';

import { useState } from 'react';
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


  const handleResultsFetched = (interpretation: AIOutput | null, songs: Song[]) => {
    setAiInterpretation(interpretation);
    setRecommendedSongs(songs);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        <FindYourVibe onResultsFetched={handleResultsFetched} setIsLoadingGlobal={setIsLoadingGlobal} />
        {isLoadingGlobal && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-xl">Finding your sonic matches...</p>
          </div>
        )}
        {(!isLoadingGlobal && (aiInterpretation || recommendedSongs.length > 0)) && (
          <SonicMatches aiInterpretation={aiInterpretation} songs={recommendedSongs} />
        )}
      </main>
      <Footer />
    </div>
  );
}
