
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Search, ChevronDown, Settings2, Music4, Palette, User, Filter } from 'lucide-react';
import type { ProfileAnalysisOutput } from '@/types';
import { MoodComposer } from '@/components/mood-composer';
import type { MoodInput } from '@/lib/music/buildRecommendationParams'; // Kept for MoodComposer type

// Schema remains the same, all fields are technically optional at Zod level
const formSchema = z.object({
  moodDescription: z.string().optional(),
  socialProfileUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
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
  profileAnalysis?: ProfileAnalysisOutput | null; // Kept for display if social URL is used
  profileAnalysisLoading?: boolean; // Kept for social URL analyze button
  onAnalyzeProfile?: (url: string) => void; // Kept for social URL analyze button
}

export function FindYourVibe({
  onSearchInitiated,
  isParentSearching,
  profileAnalysis,
  profileAnalysisLoading,
  onAnalyzeProfile,
}: FindYourVibeProps) {
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [moodComposerParams, setMoodComposerParams] = useState<MoodInput | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | undefined>(undefined);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moodDescription: '',
      socialProfileUrl: '',
      songName: '',
      instrumentTags: '',
    },
  });

  useEffect(() => {
    console.log("FindYourVibe: Rerender triggered. isSubmittingForm:", isSubmittingForm, "isParentSearching:", isParentSearching, "moodComposerParams:", JSON.stringify(moodComposerParams));
  }, [isSubmittingForm, isParentSearching, moodComposerParams]);

  const handleMoodComposerChange = useCallback((params: MoodInput | null) => {
    console.log("FindYourVibe: MoodComposer params changed:", JSON.stringify(params));
    setMoodComposerParams(params);
  }, []);

  async function onSubmit(values: FormValues) {
    console.log("FindYourVibe onSubmit - VERY START. Click detected. Values:", JSON.stringify(values));
    setIsSubmittingForm(true);
    console.log("FindYourVibe onSubmit - isSubmittingForm set to true. MoodComposerParams:", JSON.stringify(moodComposerParams));

    let searchType: 'mood' | 'profile' | 'structured_mood';
    const submissionValues: FormValues = { ...values, moodComposerParams };

    const hasSocialProfileUrl = values.socialProfileUrl && values.socialProfileUrl.trim() !== '';
    const hasMoodComposerInteraction = moodComposerParams && (
        moodComposerParams.selectedMoodName ||
        moodComposerParams.energy !== undefined || // Assuming 0.5 is default, so any value means interaction
        moodComposerParams.valence !== undefined ||
        (moodComposerParams.tempo !== undefined && String(moodComposerParams.tempo).trim() !== '') ||
        (moodComposerParams.languages && moodComposerParams.languages.length > 0)
    );
    const hasMoodDescription = values.moodDescription && values.moodDescription.trim() !== '';

    if (hasSocialProfileUrl) {
      searchType = 'profile';
      console.log("FindYourVibe onSubmit - Determined searchType: profile");
    } else if (hasMoodComposerInteraction) {
      searchType = 'structured_mood';
      console.log("FindYourVibe onSubmit - Determined searchType: structured_mood");
    } else if (hasMoodDescription) {
      searchType = 'mood';
      console.log("FindYourVibe onSubmit - Determined searchType: mood (free-text only)");
    } else {
      form.setError("moodDescription", { type: "manual", message: "Please describe your vibe, or use advanced options." });
      setIsSubmittingForm(false);
      console.log("FindYourVibe onSubmit - FORM ERROR SET: No primary input provided.");
      return;
    }

    console.log("FindYourVibe onSubmit - Before calling onSearchInitiated. SearchType:", searchType, "SubmissionValues:", JSON.stringify(submissionValues));
    try {
      await onSearchInitiated(submissionValues, searchType);
      console.log("FindYourVibe onSubmit - onSearchInitiated completed successfully.");
    } catch (e) {
      const error = e as Error;
      console.error("FindYourVibe onSubmit - Error caught during/after onSearchInitiated call:", error.message, error);
    } finally {
      setIsSubmittingForm(false);
      console.log("FindYourVibe onSubmit - FINALLY block, isSubmittingForm set to false.");
    }
  }

  const handleAnalyzeProfileClick = () => {
    const url = form.getValues("socialProfileUrl");
    if (url && onAnalyzeProfile) {
      console.log("FindYourVibe: handleAnalyzeProfileClick - URL:", url);
      onAnalyzeProfile(url);
    } else if (!url) {
      form.setError("socialProfileUrl", { type: "manual", message: "Please enter a URL to analyze." });
      console.log("FindYourVibe: handleAnalyzeProfileClick - No URL provided.");
    }
  };

  const isDiscoverButtonDisabled = () => {
    const currentMoodDescription = form.watch('moodDescription') || '';
    const currentSocialProfileUrl = form.watch('socialProfileUrl') || '';

    let reason = "";
    let isDisabled = true;

    // console.log("--- isDiscoverButtonDisabled Check START ---");
    // console.log(`States: isSubmittingForm=${isSubmittingForm}, isParentSearching=${isParentSearching}`);
    // console.log(`MoodComposerParams: ${JSON.stringify(moodComposerParams)}`);
    // console.log(`Watched Values: moodDescription='${currentMoodDescription}', socialProfileUrl='${currentSocialProfileUrl}'`);

    if (isSubmittingForm || isParentSearching) {
      reason = "Form is currently submitting or parent is searching.";
      isDisabled = true;
    } else {
      const moodDescriptionProvided = currentMoodDescription.trim() !== '';
      const socialProfileUrlProvided = currentSocialProfileUrl.trim() !== '';
      const moodComposerInteracted = moodComposerParams && (
        moodComposerParams.selectedMoodName ||
        moodComposerParams.energy !== undefined ||
        moodComposerParams.valence !== undefined ||
        (moodComposerParams.tempo !== undefined && String(moodComposerParams.tempo).trim() !== '') ||
        (moodComposerParams.languages && moodComposerParams.languages.length > 0)
      );

      isDisabled = !(moodDescriptionProvided || socialProfileUrlProvided || moodComposerInteracted);
      if (isDisabled) {
        reason = "No primary input: Mood Description is empty, Social Profile URL is empty, and Mood Composer has not been meaningfully interacted with.";
      } else {
        reason = "Conditions met: Mood Description, Social Profile URL, or Mood Composer has input.";
      }
    }
    // console.log(`isDiscoverButtonDisabled FINAL: Result=${isDisabled}. Reason: ${reason}`);
    // console.log("--- isDiscoverButtonDisabled Check END ---");
    return isDisabled;
  };

  return (
    <section className="w-full">
      <Card className="max-w-2xl mx-auto form-container-card subtle-shadow">
        <CardHeader className="pb-4 pt-1 px-0 md:px-0">
          <CardTitle className="form-card-title">How are you feeling today?</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0 md:px-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            {/* Primary Mood/Vibe Input */}
            <div className="form-field-spacing">
              <Label htmlFor="moodDescription" className="form-label">
                Mood / Vibe <span className="form-optional-label">(required for basic search)</span>
              </Label>
              <Textarea
                id="moodDescription"
                placeholder="e.g. lazy Sunday afternoon, road-trip energy, mellow evening walk"
                {...form.register('moodDescription')}
                className="form-textarea-field"
              />
              {form.formState.errors.moodDescription && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.moodDescription.message}</p>}
            </div>

            {/* Advanced Options Accordion */}
            <Accordion type="single" collapsible className="w-full mb-6" value={activeAccordion} onValueChange={setActiveAccordion}>
              <AccordionItem value="advanced-options">
                <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline py-3 data-[state=closed]:border-b data-[state=closed]:border-border">
                  <Filter className="mr-2 h-4 w-4 text-primary" /> Advanced Options
                </AccordionTrigger>
                <AccordionContent className="pt-4 animate-accordion-down space-y-6">
                  
                  {/* Mood Composer */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2 flex items-center"><Palette className="mr-2 h-4 w-4 text-primary/80" />Or, refine with Mood Composer:</h3>
                    <MoodComposer onParamsChange={handleMoodComposerChange} />
                  </div>
                  
                  <hr className="border-border/50" />

                  {/* Social Profile URL */}
                  <div>
                     <h3 className="text-sm font-medium text-foreground mb-2 flex items-center"><User className="mr-2 h-4 w-4 text-primary/80" />Or, find by Social Profile:</h3>
                    <div className="form-field-spacing">
                      <Label htmlFor="socialProfileUrl" className="form-label">
                        Social Profile URL <span className="form-optional-label">(optional)</span>
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
                      <div className="mb-1 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                        <p className="font-medium text-foreground">Profile Insights:</p>
                        {profileAnalysis.location && <p><strong>Location:</strong> {profileAnalysis.location}</p>}
                        {profileAnalysis.languages && profileAnalysis.languages.length > 0 && <p><strong>Languages:</strong> {profileAnalysis.languages.join(', ')}</p>}
                        {profileAnalysis.keywords && profileAnalysis.keywords.length > 0 && <p><strong>Keywords:</strong> {profileAnalysis.keywords.slice(0,5).join(', ')}{profileAnalysis.keywords.length > 5 ? '...' : ''}</p>}
                         {(!profileAnalysis.location && (!profileAnalysis.languages || profileAnalysis.languages.length === 0) && (!profileAnalysis.keywords || profileAnalysis.keywords.length === 0)) && (
                            <p className="text-muted-foreground">No specific insights extracted. AI will use the URL for general context.</p>
                         )}
                      </div>
                    )}
                  </div>

                  <hr className="border-border/50" />
                  
                  {/* Additional Song/Instrument Filters */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2 flex items-center"><Settings2 className="mr-2 h-4 w-4 text-primary/80" />Additional Filters:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
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
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="pt-2">
              <Button type="submit" disabled={isDiscoverButtonDisabled()} className="discover-button">
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
