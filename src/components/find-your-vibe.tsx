
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { interpretMusicalIntent, InterpretMusicalIntentInput } from '@/ai/flows/interpret-musical-intent';
import { analyzeAudioSnippet } from '@/ai/flows/analyze-audio-snippet';
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action'; // Import the server action
import type { Song, InterpretMusicalIntentOutput as AIOutput, Genre } from '@/types';
import { Loader2, Mic, AlertTriangle, StopCircle, UploadCloud } from 'lucide-react';

const formSchema = z.object({
  songName: z.string().optional(),
  artistName: z.string().optional(),
  moodDescription: z.string().optional(),
  instrumentTags: z.string().optional(),
  genre: z.string().optional(),
  songLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

const genres: Genre[] = [
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'hip-hop', label: 'Hip Hop' },
  { value: 'classical', label: 'Classical' },
  { value: 'r-n-b', label: 'R&B' },
  { value: 'country', label: 'Country' },
  { value: 'folk', label: 'Folk' },
  { value: 'metal', label: 'Metal' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'blues', label: 'Blues' },
  { value: 'other', label: 'Other' },
];

interface FindYourVibeProps {
  onResultsFetched: (aiInterpretation: AIOutput | null, songs: Song[]) => void;
  setIsLoadingGlobal: (loading: boolean) => void;
}

export function FindYourVibe({ onResultsFetched, setIsLoadingGlobal }: FindYourVibeProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSnippet, setIsProcessingSnippet] = useState(false);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [recordedFileName, setRecordedFileName] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      songName: '',
      artistName: '',
      moodDescription: '',
      instrumentTags: '',
      genre: '',
      songLink: '',
    },
  });

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 15) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

  const handleRecordSnippet = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ title: 'Error', description: 'Audio recording is not supported by your browser.', variant: 'destructive' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setAudioDataUri(null); 
      setRecordedFileName(null);
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioDataUri(base64Audio);
          setRecordedFileName(`recording-${Date.now()}.webm`);
          processAudioSnippet(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop()); 
      };
      mediaRecorderRef.current.start();
      toast({ title: 'Recording Started', description: 'Recording for up to 15 seconds...' });
    } catch (err) {
      toast({ title: 'Microphone Error', description: 'Could not access microphone. Please check permissions.', variant: 'destructive' });
      console.error('Microphone access error:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      toast({ title: 'Recording Stopped', description: 'Processing audio snippet...' });
    }
  };
  
  const processAudioSnippet = async (dataUri: string) => {
    setIsProcessingSnippet(true);
    try {
      const result = await analyzeAudioSnippet({ audioDataUri: dataUri });
      if (result.songName) form.setValue('songName', result.songName);
      if (result.artistName) form.setValue('artistName', result.artistName);
      toast({
        title: 'Snippet Analyzed',
        description: `Identified: ${result.songName || 'Unknown Song'} by ${result.artistName || 'Unknown Artist'}. Confidence: ${result.confidence.toFixed(2)}`,
      });
    } catch (error: any) {
      console.error('Error analyzing audio snippet:', error);
      toast({
        title: 'Snippet Analysis Failed',
        description: error.message || 'Could not analyze the audio snippet. Please try again.',
        variant: 'destructive',
      });
      setAudioDataUri(null); 
      setRecordedFileName(null);
    } finally {
      setIsProcessingSnippet(false);
    }
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setIsLoadingGlobal(true);
    onResultsFetched(null, []); // Clear previous results

    const aiInput: InterpretMusicalIntentInput = {
      songName: values.songName || '',
      artistName: values.artistName || '', 
      moodDescription: values.moodDescription || '',
      instrumentTags: values.instrumentTags || '',
      genre: values.genre === 'no_preference_selected' ? '' : values.genre || '',
      songLink: values.songLink || '',
      audioSnippet: audioDataUri || undefined,
    };

    try {
      const aiInterpretation = await interpretMusicalIntent(aiInput);
      
      let songs: Song[] = [];
      if (aiInterpretation) {
        // Pass both AI interpretation and relevant form values to the action
        songs = await fetchSpotifyTracksAction(aiInterpretation, { songName: values.songName, artistName: values.artistName });
        if (songs.length === 0 && (values.songName || values.artistName || values.genre || values.moodDescription)) {
           toast({
            title: 'No exact matches found',
            description: "Couldn't find exact matches. Broadening search based on AI interpretation.",
            variant: 'default',
          });
        }
      } else {
         toast({
            title: 'Could not interpret intent',
            description: "The AI could not fully interpret your request. Please try rephrasing.",
            variant: 'destructive',
          });
      }
      
      onResultsFetched(aiInterpretation, songs);

      if (songs.length > 0 || aiInterpretation) {
        setTimeout(() => {
            const resultsSection = document.getElementById('sonic-matches');
            resultsSection?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }

    } catch (error: any) {
      console.error('Error in submission process:', error);
      toast({
        title: 'Error Finding Songs',
        description: error.message || 'Could not fetch recommendations. Please try again.',
        variant: 'destructive',
      });
      onResultsFetched(null, []); 
    } finally {
      setIsLoading(false);
      setIsLoadingGlobal(false);
    }
  }

  return (
    <section className="py-8 md:py-12 w-full bg-gradient-to-br from-background to-card">
      <div className="container mx-auto">
        <Card className="max-w-2xl mx-auto bg-card/80 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-primary-foreground">Find Your Vibe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="songName" className="text-foreground">Song Name</Label>
                  <Input id="songName" placeholder="e.g., Bohemian Rhapsody" {...form.register('songName')} className="bg-input placeholder:text-muted-foreground/70" />
                </div>
                <div>
                  <Label htmlFor="artistName" className="text-foreground">Artist Name (Optional)</Label>
                  <Input id="artistName" placeholder="e.g., Queen" {...form.register('artistName')} className="bg-input placeholder:text-muted-foreground/70" />
                </div>
              </div>

              <div>
                <Label htmlFor="moodDescription" className="text-foreground">Feeling/Mood Description</Label>
                <Textarea
                  id="moodDescription"
                  placeholder="e.g., Energetic and upbeat, perfect for a workout"
                  {...form.register('moodDescription')}
                  className="bg-input placeholder:text-muted-foreground/70 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="instrumentTags" className="text-foreground">Key Instruments (comma-separated, Optional)</Label>
                  <Input id="instrumentTags" placeholder="e.g., guitar, piano, synth" {...form.register('instrumentTags')} className="bg-input placeholder:text-muted-foreground/70" />
                </div>
                <div>
                  <Label htmlFor="genre" className="text-foreground">Genre</Label>
                  <Controller
                    control={form.control}
                    name="genre"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ''} >
                        <SelectTrigger id="genre" className="bg-input placeholder:text-muted-foreground/70">
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_preference_selected">No Preference</SelectItem>
                          {genres.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="songLink" className="text-foreground">Song Link (Spotify, YouTube, Apple Music - Optional)</Label>
                <Input id="songLink" type="url" placeholder="https://open.spotify.com/track/..." {...form.register('songLink')} className="bg-input placeholder:text-muted-foreground/70"/>
                {form.formState.errors.songLink && <p className="text-sm text-destructive mt-1">{form.formState.errors.songLink.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Record Snippet (Optional)</Label>
                <div className="flex items-center space-x-3">
                  <Button type="button" variant="outline" onClick={handleRecordSnippet} disabled={isProcessingSnippet || isLoading} className="text-accent border-accent hover:bg-accent/10 hover:text-accent-foreground">
                    {isRecording ? <StopCircle className="mr-2 h-5 w-5 animate-pulse" /> : <Mic className="mr-2 h-5 w-5" />}
                    {isRecording ? `Stop Recording (${15 - recordingTime}s)` : 'Record Snippet'}
                  </Button>
                  {isProcessingSnippet && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
                  {recordedFileName && !isProcessingSnippet && !isRecording && (
                    <div className="flex items-center text-sm text-green-400 bg-green-500/10 px-3 py-1.5 rounded-md">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      <span>{recordedFileName} ready</span>
                    </div>
                  )}
                </div>
                {isRecording && (
                   <div className="w-full bg-muted rounded-full h-2.5 dark:bg-gray-700 mt-2">
                     <div className="bg-accent h-2.5 rounded-full" style={{ width: `${(recordingTime / 15) * 100}%` }}></div>
                   </div>
                )}
              </div>

              <Button type="submit" disabled={isLoading || isRecording || isProcessingSnippet} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6 shadow-lg hover:shadow-primary/40 transition-all duration-300">
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoading ? 'Discovering...' : 'Find Similar Songs'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
