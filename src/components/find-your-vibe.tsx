
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Keep for structure, but use custom classes
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { InterpretMusicalIntentInput } from '@/ai/flows/interpret-musical-intent';
import { analyzeAudioSnippet } from '@/ai/flows/analyze-audio-snippet';
import type { Genre } from '@/types';
import { Loader2, Mic, StopCircle, UploadCloud, Search } from 'lucide-react';

const formSchema = z.object({
  moodDescription: z.string().min(1, { message: 'Please describe the mood or vibe.' }),
  songName: z.string().optional(),
  artistName: z.string().optional(),
  instrumentTags: z.string().optional(),
  genre: z.string().optional(),
  songLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

export type FormValues = z.infer<typeof formSchema>;

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
  onSearchInitiated: (aiInput: InterpretMusicalIntentInput, formValues: FormValues) => Promise<void>;
  isParentSearching: boolean;
}

export function FindYourVibe({ onSearchInitiated, isParentSearching }: FindYourVibeProps) {
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingSnippet, setIsProcessingSnippet] = useState(false);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [recordedFileName, setRecordedFileName] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0); // 0 to 10 seconds

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moodDescription: '',
      songName: '',
      artistName: '',
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
          if (prev >= 9) { // 0-9 is 10 seconds. Stop at 9 to make it 10 seconds total.
            stopRecording();
            return 10;
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Common format
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
      // Optionally, start a timer to automatically stop after 10 seconds if not already handled by useEffect
      // setTimeout(() => stopRecording(), 10000); // Ensure it stops after 10s
      toast({ title: 'Recording Started', description: 'Recording for up to 10 seconds...' });
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
    setIsSubmittingForm(true);

    const aiInput: InterpretMusicalIntentInput = {
      songName: values.songName || '',
      artistName: values.artistName || '',
      moodDescription: values.moodDescription, // This is now required
      instrumentTags: values.instrumentTags || '',
      genre: values.genre === 'no_preference_selected' || !values.genre ? '' : values.genre,
      songLink: values.songLink || '',
      audioSnippet: audioDataUri || undefined,
    };

    try {
      await onSearchInitiated(aiInput, values);
    } catch (error) {
       // Errors are handled by the parent (Home component)
    } finally {
      setIsSubmittingForm(false);
    }
  }
  
  const discoverButtonDisabled = isSubmittingForm || isParentSearching || isRecording || isProcessingSnippet;

  return (
    <section className="w-full">
      <Card className="max-w-2xl mx-auto form-container-card shadow-subtle">
        <CardHeader className="pb-2 pt-0 px-0 md:px-0">
          <CardTitle className="text-lg md:text-xl font-semibold text-center text-foreground">What kind of vibe are you looking for?</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0 md:px-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            {/* Mood / Vibe (Required) */}
            <div className="form-field-spacing">
              <Label htmlFor="moodDescription" className="form-label">
                Mood / Vibe <span className="text-primary text-sm">*</span>
              </Label>
              <Textarea
                id="moodDescription"
                placeholder="e.g. lazy Sunday afternoon, road-trip energy, mellow evening walk"
                {...form.register('moodDescription')}
                className="form-textarea-field"
              />
              {form.formState.errors.moodDescription && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.moodDescription.message}</p>}
            </div>

            {/* Song Name (Optional) */}
            <div className="form-field-spacing">
              <Label htmlFor="songName" className="form-label">
                Song Name <span className="form-optional-label">(optional)</span>
              </Label>
              <Input id="songName" placeholder="e.g., Levitating" {...form.register('songName')} className="form-input-field" />
            </div>

            {/* Artist Name (Optional) */}
            <div className="form-field-spacing">
              <Label htmlFor="artistName" className="form-label">
                Artist Name <span className="form-optional-label">(optional)</span>
              </Label>
              <Input id="artistName" placeholder="e.g., Dua Lipa" {...form.register('artistName')} className="form-input-field" />
            </div>
            
            {/* Key Instruments (Optional) */}
            <div className="form-field-spacing">
              <Label htmlFor="instrumentTags" className="form-label">
                Key Instruments <span className="form-optional-label">(optional)</span>
              </Label>
              <Input id="instrumentTags" placeholder="e.g., guitar, piano, saxophone" {...form.register('instrumentTags')} className="form-input-field" />
            </div>

            {/* Genre (Optional) */}
            <div className="form-field-spacing">
              <Label htmlFor="genre" className="form-label">
                Genre <span className="form-optional-label">(optional)</span>
              </Label>
              <Controller
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} >
                    <SelectTrigger id="genre" className="form-select-trigger">
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

            {/* Song Link (Optional) */}
            <div className="form-field-spacing">
              <Label htmlFor="songLink" className="form-label">
                Song Link <span className="form-optional-label">(optional)</span>
              </Label>
              <Input id="songLink" type="url" placeholder="Paste a Spotify, YouTube, or Apple Music link" {...form.register('songLink')} className="form-input-field"/>
              {form.formState.errors.songLink && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.songLink.message}</p>}
            </div>

            {/* Record Snippet (Optional) */}
            <div className="form-field-spacing">
              <Label className="form-label">Record Snippet <span className="form-optional-label">(optional)</span></Label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={handleRecordSnippet}
                  disabled={isProcessingSnippet || isSubmittingForm || isParentSearching}
                  className={`record-button-light ${isRecording ? 'recording animate-pulse' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 ease-in-out`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? <StopCircle className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </button>
                <div className="flex-grow">
                  {isRecording && (
                     <div className="w-full bg-muted rounded-full h-2.5">
                       <div className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${(recordingTime / 10) * 100}%` }}></div>
                     </div>
                  )}
                   {isProcessingSnippet && <div className="flex items-center space-x-2 text-sm text-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /> <span>Processing...</span></div>}
                   {recordedFileName && !isProcessingSnippet && !isRecording && (
                    <div className="flex items-center text-xs text-green-600 bg-green-500/10 px-2.5 py-1 rounded-md">
                      <UploadCloud className="mr-1.5 h-4 w-4" />
                      <span>{recordedFileName} ready</span>
                    </div>
                  )}
                  {!isRecording && !isProcessingSnippet && !recordedFileName && <p className="text-sm text-muted-foreground">Tap to hum or sing a 10 second snippet</p>}
                </div>
              </div>
            </div>
            
            <div className="pt-4"> {/* Add some top padding before the button */}
              <Button type="submit" disabled={discoverButtonDisabled} className="discover-button">
                {(isSubmittingForm || isParentSearching) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                {(isSubmittingForm || isParentSearching) ? 'Searching...' : 'Find my vibe'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
