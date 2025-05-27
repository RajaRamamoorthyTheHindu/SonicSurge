
// src/hooks/use-media-query.ts
'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // Initialize state to a default value, or undefined if you prefer to handle the initial render without a match.
  // Setting to false initially means it assumes non-matching until useEffect runs.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure window is defined (runs only on client-side)
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    // Update state to current match status
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listener for changes
    const listener = () => {
      setMatches(media.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query, matches]); // matches dependency ensures re-check if query changes or for initial setup if desired

  return matches;
}
