
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Search, ChevronDown, ChevronUp, Settings2, Edit3, Music4 } from 'lucide-react';
import type { ProfileAnalysisOutput } from '@/types';
import { MoodComposer } from '@/components/mood-composer';
import type { MoodInput } from '@/lib/music/buildRecommendationParams';

const formSchema = z.object({
  moodDescription: z.string().optional(),
  socialProfileUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional(),
  songName: z.string().optional(),
  instrumentTags: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema> & {
  moodComposerParams?: MoodInput | null;
};

interface FindYourVibeProps {
  onSearchInitiated: (
    formValues: FormValues,
    searchType: 'mood' | 'profile' | 'structured_mood'
  ) => Promise<void>;
  isParentSearching: boolean;
  profileAnalysis?: ProfileAnalysisOutput | null;
  profileAnalysisLoading?: boolean;
  onAnalyzeProfile?: (url: string) => void;
}

export function FindYourVibe({
  onSearchInitiated,
  isParentSearching,
  profileAnalysis,
  profileAnalysisLoading,
  onAnalyzeProfile,
}: FindYourVibeProps) {
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [showAdvancedSongFilters, setShowAdvancedSongFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'mood' | 'profile'>('mood');
  const [moodComposerParams, setMoodComposerParams] = useState<MoodInput | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moodDescription: '',
      socialProfileUrl: '',
      songName: '',
      instrumentTags: '',
    },
  });
  
  const handleMoodComposerChange = useCallback((params: MoodInput | null) => {
    setMoodComposerParams(params);
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmittingForm(true);
    let searchType: 'mood' | 'profile' | 'structured_mood' = activeTab;

    const submissionValues: FormValues = { ...values, moodComposerParams };

    if (activeTab === 'mood') {
      if (moodComposerParams && moodComposerParams.selectedMoodName) {
        searchType = 'structured_mood';
      } else if (values.moodDescription && values.moodDescription.trim() !== '') {
        searchType = 'mood';
      } else {
        form.setError("moodDescription", { type: "manual", message: "Please select a mood profile or provide a mood description." });
        setIsSubmittingForm(false);
        return;
      }
    } else if (activeTab === 'profile') {
      if (!values.socialProfileUrl || values.socialProfileUrl.trim() === '') {
        form.setError("socialProfileUrl", {type: "manual", message: "Social profile URL is required for this search type."});
        setIsSubmittingForm(false);
        return;
      }
      searchType = 'profile';
    }

    try {
      await onSearchInitiated(submissionValues, searchType);
    } catch {
      // Errors are handled by the parent in page.tsx
    } finally {
      setIsSubmittingForm(false);
    }
  }

  const handleAnalyzeProfileClick = () => {
    const url = form.getValues("socialProfileUrl");
    if (url && onAnalyzeProfile) {
      onAnalyzeProfile(url);
    } else if (!url) {
      form.setError("socialProfileUrl", { type: "manual", message: "Please enter a URL to analyze." });
    }
  };
  
  const isDiscoverButtonDisabled = () => {
    if (isSubmittingForm || isParentSearching) return true;
    if (activeTab === 'mood') {
      return !( (moodComposerParams && moodComposerParams.selectedMoodName) || (form.getValues('moodDescription') || '').trim() !== '' );
    }
    if (activeTab === 'profile') {
      return !(form.getValues('socialProfileUrl') || '').trim();
    }
    return true;
  };

  // Ensure all JavaScript logic above is correctly terminated before returning JSX.
  return (
    <section className="w-full">
      <Card className="max-w-2xl mx-auto form-container-card subtle-shadow">
        <CardHeader className="pb-4 pt-1 px-0 md:px-0">
          <CardTitle className="form-card-title">How are you feeling today?</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0 md:px-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'mood' | 'profile')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="mood" className="gap-2"><Music4 className="h-4 w-4" /> By Mood</TabsTrigger>
              <TabsTrigger value="profile" className="gap-2"><Settings2 className="h-4 w-4" /> By Social Profile</TabsTrigger>
            </TabsList>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
              <TabsContent value="mood" className="mt-0">
                <div className="form-field-spacing">
                  <MoodComposer onParamsChange={handleMoodComposerChange} />
                </div>
                <Accordion type="single" collapsible className="w-full mb-6">
                  <AccordionItem value="advanced-mood-text">
                    <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline py-3">
                      Advanced: Use Free-Text Vibe Description
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <Label htmlFor="moodDescription" className="form-label">
                        Describe Your Vibe <span className="form-optional-label">(if not using profiles above)</span>
                      </Label>
                      <Textarea
                        id="moodDescription"
                        placeholder="e.g. lazy Sunday afternoon, road-trip energy, mellow evening walk"
                        {...form.register('moodDescription')}
                        className="form-textarea-field"
                      />
                      {form.formState.errors.moodDescription && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.moodDescription.message}</p>}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="profile" className="mt-0">
                <div className="form-field-spacing">
                  <Label htmlFor="socialProfileUrl" className="form-label">
                    Social Profile URL <span className="text-primary text-sm">(required for this tab)</span>
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="socialProfileUrl"
                      placeholder="e.g., https://linkedin.com/in/username"
                      {...form.register('socialProfileUrl')}
                      className="form-input-field flex-grow"
                    />
                    <Button type="button" variant="outline" onClick={handleAnalyzeProfileClick} disabled={profileAnalysisLoading || !form.watch("socialProfileUrl")}>
                      {profileAnalysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                    </Button>
                  </div>
                  {form.formState.errors.socialProfileUrl && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.socialProfileUrl.message}</p>}
                </div>
                {profileAnalysis && (
                  <div className="mb-6 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                    <p className="font-medium text-foreground">Profile Insights:</p>
                    {profileAnalysis.location && <p><strong>Location:</strong> {profileAnalysis.location}</p>}
                    {profileAnalysis.languages && profileAnalysis.languages.length > 0 && <p><strong>Languages:</strong> {profileAnalysis.languages.join(', ')}</p>}
                    {profileAnalysis.keywords && profileAnalysis.keywords.length > 0 && <p><strong>Keywords:</strong> {profileAnalysis.keywords.slice(0,5).join(', ')}{profileAnalysis.keywords.length > 5 ? '...' : ''}</p>}
                     {(!profileAnalysis.location && (!profileAnalysis.languages || profileAnalysis.languages.length === 0) && (!profileAnalysis.keywords || profileAnalysis.keywords.length === 0)) && (
                        <p className="text-muted-foreground">No specific insights extracted. AI will use the URL for general context.</p>
                     )}
                  </div>
                )}
              </TabsContent>

              <div className="form-field-spacing">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvancedSongFilters(!showAdvancedSongFilters)}
                  className="w-full themed-input flex items-center justify-center text-sm font-medium hover:bg-muted/80"
                  aria-expanded={showAdvancedSongFilters}
                >
                  {showAdvancedSongFilters ? 'Hide Song Filters' : 'Advanced Song Filters'}
                  {showAdvancedSongFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {showAdvancedSongFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 animate-accordion-down mb-6">
                  <div className="form-field-spacing">
                    <Label htmlFor="songName" className="form-label">
                      Specific Song <span className="form-optional-label">(optional)</span>
                    </Label>
                    <Input id="songName" placeholder="e.g., Levitating" {...form.register('songName')} className="form-input-field" />
                  </div>
                  <div className="form-field-spacing">
                    <Label htmlFor="instrumentTags" className="form-label">
                      Key Instruments <span className="form-optional-label">(optional)</span>
                    </Label>
                    <Input id="instrumentTags" placeholder="e.g. guitar, saxophone" {...form.register('instrumentTags')} className="form-input-field" />
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <Button type="submit" disabled={isDiscoverButtonDisabled()} className="discover-button">
                  {(isSubmittingForm || isParentSearching) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                  {(isSubmittingForm || isParentSearching) ? 'Searching...' : 'Find my vibe'}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
