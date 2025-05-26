
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
import { fetchSpotifyTracksAction } from '@/actions/fetch-spotify-tracks-action';
import type { Song, InterpretMusicalIntentOutput as AIOutput, Genre } from '@/types';
import { Loader2, Mic, StopCircle, UploadCloud, Music2 } from 'lucide-react';

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
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 14) { // Stop at 14 to trigger stopRecording before it hits 15 exactly
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
    if (!values.songName && !values.artistName && !values.moodDescription && !values.instrumentTags && !values.genre && !values.songLink && !audioDataUri) {
      toast({
        title: 'No Input Provided',
        description: 'Please provide some information to find your vibe.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setIsLoadingGlobal(true);
    onResultsFetched(null, []);

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
        songs = await fetchSpotifyTracksAction(aiInterpretation, { songName: values.songName, artistName: values.artistName });
        if (songs.length === 0 && (values.songName || values.artistName || values.genre || values.moodDescription)) {
           toast({
            title: 'No matches found',
            description: "Couldn't find specific matches based on your input. Try broadening your search.",
            variant: 'default', // Changed from destructive to default for less alarming message
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
    <section className="w-full">
      <Card className="max-w-2xl mx-auto apple-card apple-subtle-shadow">
        <CardHeader className="pb-4 pt-2"> {/* Reduced padding for header to be more compact */}
          <CardTitle className="text-2xl font-semibold text-center text-foreground">Find Your Vibe</CardTitle>
        </CardHeader>
        <CardContent className="pt-4"> {/* Adjusted padding */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <Label htmlFor="songName" className="text-sm font-medium text-foreground/80 mb-1 block">Song Name</Label>
                <Input id="songName" placeholder="e.g., Levitating" {...form.register('songName')} className="apple-input" />
              </div>
              <div>
                <Label htmlFor="artistName" className="text-sm font-medium text-foreground/80 mb-1 block">Artist Name</Label>
                <Input id="artistName" placeholder="e.g., Dua Lipa" {...form.register('artistName')} className="apple-input" />
              </div>
            </div>

            <div>
              <Label htmlFor="moodDescription" className="text-sm font-medium text-foreground/80 mb-1 block">Mood / Vibe</Label>
              <Textarea
                id="moodDescription"
                placeholder="e.g., Upbeat, good for a party"
                {...form.register('moodDescription')}
                className="apple-input min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <Label htmlFor="instrumentTags" className="text-sm font-medium text-foreground/80 mb-1 block">Key Instruments</Label>
                <Input id="instrumentTags" placeholder="e.g., synth, bass, drums" {...form.register('instrumentTags')} className="apple-input" />
              </div>
              <div>
                <Label htmlFor="genre" className="text-sm font-medium text-foreground/80 mb-1 block">Genre</Label>
                <Controller
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''} >
                      <SelectTrigger id="genre" className="apple-input">
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
              <Label htmlFor="songLink" className="text-sm font-medium text-foreground/80 mb-1 block">Song Link (Optional)</Label>
              <Input id="songLink" type="url" placeholder="Paste a Spotify, YouTube, or Apple Music link" {...form.register('songLink')} className="apple-input"/>
              {form.formState.errors.songLink && <p className="text-xs text-destructive mt-1">{form.formState.errors.songLink.message}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">Record Snippet (Optional)</Label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handleRecordSnippet}
                  disabled={isProcessingSnippet || isLoading}
                  className={`apple-record-button ${isRecording ? 'recording animate-pulse' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 ease-in-out`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <StopCircle className="h-7 w-7 text-white" /> : <Mic className="h-7 w-7 text-white" />}
                </button>
                <div className="flex-grow">
                  {isRecording && (
                     <div className="w-full bg-muted rounded-full h-2">
                       <div className="bg-primary h-2 rounded-full" style={{ width: `${(recordingTime / 15) * 100}%` }}></div>
                     </div>
                  )}
                   {isProcessingSnippet && <div className="flex items-center space-x-2 text-sm text-foreground/80"><Loader2 className="h-4 w-4 animate-spin text-primary" /> <span>Processing...</span></div>}
                   {recordedFileName && !isProcessingSnippet && !isRecording && (
                    <div className="flex items-center text-xs text-green-500 dark:text-green-400 bg-green-500/10 dark:bg-green-400/10 px-2.5 py-1 rounded-md">
                      <UploadCloud className="mr-1.5 h-4 w-4" />
                      <span>{recordedFileName} ready</span>
                    </div>
                  )}
                  {!isRecording && !isProcessingSnippet && !recordedFileName && <p className="text-xs text-muted-foreground">Tap to record (max 15s)</p>}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isLoading || isRecording || isProcessingSnippet} className="w-full apple-button text-base py-3 font-semibold">
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Music2 className="mr-2 h-5 w-5" />}
              {isLoading ? 'Discovering...' : 'Discover'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
