
'use server';
/**
 * @fileOverview Analyzes an audio snippet to identify the song and extract relevant metadata.
 *
 * - analyzeAudioSnippet - A function that analyzes the audio snippet.
 * - AnalyzeAudioSnippetInput - The input type for the analyzeAudioSnippet function.
 * - AnalyzeAudioSnippetOutput - The return type for the analyzeAudioSnippet function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const AnalyzeAudioSnippetInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio snippet as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type AnalyzeAudioSnippetInput = z.infer<typeof AnalyzeAudioSnippetInputSchema>;

const AnalyzeAudioSnippetOutputSchema = z.object({
  songName: z.string().describe('The name of the song identified in the audio snippet.'),
  artistName: z.string().describe('The name of the artist of the song.'),
  albumName: z.string().optional().describe('The name of the album (if available).'),
  confidence: z
    .number()
    .describe(
      'A confidence score (0-1) indicating the accuracy of the audio fingerprinting identification.'
    ),
});
export type AnalyzeAudioSnippetOutput = z.infer<typeof AnalyzeAudioSnippetOutputSchema>;

export async function analyzeAudioSnippet(input: AnalyzeAudioSnippetInput): Promise<AnalyzeAudioSnippetOutput> {
  return analyzeAudioSnippetFlow(input);
}

const analyzeAudioSnippetPrompt = ai.definePrompt({
  name: 'analyzeAudioSnippetPrompt',
  input: {schema: AnalyzeAudioSnippetInputSchema},
  output: {schema: AnalyzeAudioSnippetOutputSchema},
  prompt: `You are an AI assistant specializing in audio fingerprinting and music identification.

  Analyze the provided audio snippet and extract the song name, artist name, and album name (if available).
  Also, provide a confidence score (0-1) indicating the accuracy of the identification.

  Audio Snippet: {{media url=audioDataUri}}

  Ensure that the output is properly formatted JSON.`,
});

const analyzeAudioSnippetFlow = ai.defineFlow(
  {
    name: 'analyzeAudioSnippetFlow',
    inputSchema: AnalyzeAudioSnippetInputSchema,
    outputSchema: AnalyzeAudioSnippetOutputSchema,
  },
  async input => {
    const {output} = await analyzeAudioSnippetPrompt(input);
    if (!output) {
        console.warn("AI prompt 'analyzeAudioSnippetPrompt' did not return a valid output structure for input:", input);
        // Return a default or throw
        return { 
            songName: 'Unknown Song', 
            artistName: 'Unknown Artist', 
            albumName: undefined, 
            confidence: 0 
        };
    }
    return output;
  }
);
