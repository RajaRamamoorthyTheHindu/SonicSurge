
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
import type { AnalyzeSocialProfileOutput } from '@/types'; // Corrected import for ProfileAnalysisOutput
import { MoodComposer } from '@/components/mood-composer';
import type { MoodInput } from '@/ai/flows/interpret-musical-intent'; // Kept for MoodComposer type

// Schema remains the same, all fields are technically optional at Zod level
// for the schema itself, but form logic dictates requirements.
const formSchema = z.object({
  moodDescription: z.string().optional(),
  socialProfileUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  songName: z.string().optional(),
  instrumentTags: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema> & {
  moodComposerParams?: MoodInput | null;
  audioDataUri?: string | null; // Added to carry audio data
};

interface FindYourVibeProps {
  onSearchInitiated: (
    formValues: FormValues,
    searchType: 'mood' | 'profile' | 'structured_mood',
    audioDataUri?: string | null // Pass audio data uri
  ) => Promise<void>;
  isParentSearching: boolean;
  profileAnalysis?: AnalyzeSocialProfileOutput | null;
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
  const [moodComposerParams, setMoodComposerParams] = useState<MoodInput | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<string | undefined>(undefined);
  // Removed activeTab state, as tabs are removed.
  // Removed audio recording related states and functions as per previous request to remove snippet recorder

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moodDescription: '',
      socialProfileUrl: '',
      songName: '',
      instrumentTags: '',
    },
    reValidateMode: 'onChange',
  });

  // Effect to log form state changes for debugging button disable logic
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log("FindYourVibe: Form value changed, or type event:", name, type, JSON.stringify(value));
      // Manually trigger re-evaluation for isDiscoverButtonDisabled if needed
      // For example, by updating a dummy state variable, though react-hook-form's watch should handle it.
    });
    return () => subscription.unsubscribe();
  }, [form.watch, form]);


  useEffect(() => {
    console.log("FindYourVibe: Rerender triggered. isSubmittingForm:", isSubmittingForm, "isParentSearching:", isParentSearching, "moodComposerParams:", JSON.stringify(moodComposerParams));
    // This effect will log when these specific props/states change
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
    // Pass null for audioDataUri as snippet recorder is removed
    const submissionValues: FormValues = { ...values, moodComposerParams, audioDataUri: null };

    const hasSocialProfileUrl = values.socialProfileUrl && values.socialProfileUrl.trim() !== '';
    const hasMoodComposerInteraction = moodComposerParams && (
        moodComposerParams.selectedMoodName ||
        moodComposerParams.energy !== undefined ||
        moodComposerParams.valence !== undefined ||
        (moodComposerParams.tempo !== undefined && String(moodComposerParams.tempo).trim() !== '') ||
        (moodComposerParams.languages && moodComposerParams.languages.length > 0)
    );
    const hasMoodDescription = values.moodDescription && values.moodDescription.trim() !== '';

    // Determine searchType based on filled fields
    if (hasSocialProfileUrl) {
      searchType = 'profile';
      console.log("FindYourVibe onSubmit - Determined searchType: profile (social URL provided)");
    } else if (hasMoodComposerInteraction) {
      searchType = 'structured_mood';
      console.log("FindYourVibe onSubmit - Determined searchType: structured_mood (mood composer interacted)");
    } else if (hasMoodDescription) {
      searchType = 'mood';
      console.log("FindYourVibe onSubmit - Determined searchType: mood (free-text moodDescription only)");
    } else {
      // This case should ideally be prevented by the disabled state of the submit button
      form.setError("moodDescription", { type: "manual", message: "Please describe your vibe or use advanced options." });
      setIsSubmittingForm(false);
      console.log("FindYourVibe onSubmit - FORM ERROR SET: No primary input provided. This should be rare if button disable logic is correct.");
      return;
    }

    console.log("FindYourVibe onSubmit - Before calling onSearchInitiated. SearchType:", searchType, "SubmissionValues:", JSON.stringify(submissionValues));
    try {
      // Pass null for audioDataUri
      await onSearchInitiated(submissionValues, searchType, null);
      console.log("FindYourVibe onSubmit - onSearchInitiated completed successfully.");
    } catch (e) {
      const error = e as Error;
      console.error("FindYourVibe onSubmit - Error caught during/after onSearchInitiated call:", error.message, error);
      // Error display is handled by page.tsx via toast
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
    console.log("--- isDiscoverButtonDisabled Check START ---");
    console.log(`States: isSubmittingForm=${isSubmittingForm}, isParentSearching=${isParentSearching}`);
    
    const watchedMoodDescription = form.watch('moodDescription') || '';
    const watchedSocialProfileUrl = form.watch('socialProfileUrl') || ''; // This will be disabled, so effectively always empty for submission logic
    
    console.log(`MoodComposerParams: ${JSON.stringify(moodComposerParams)}`);
    console.log(`Watched Values: moodDescription='${watchedMoodDescription}', socialProfileUrl='${watchedSocialProfileUrl}'`);

    if (isSubmittingForm || isParentSearching) {
      console.log("isDiscoverButtonDisabled FINAL: Result=true. Reason: Form is submitting or parent is searching.");
      console.log("--- isDiscoverButtonDisabled Check END ---");
      return true;
    }

    // Primary condition for enabling the button is the free-text moodDescription
    const moodDescriptionProvided = watchedMoodDescription.trim() !== '';

    // Advanced options conditions (Social Profile URL is disabled, so it won't enable the button)
    const socialProfileUrlProvided = false; // Since it's disabled
    const moodComposerInteracted = moodComposerParams && (
      moodComposerParams.selectedMoodName ||
      moodComposerParams.energy !== undefined ||
      moodComposerParams.valence !== undefined ||
      (moodComposerParams.tempo !== undefined && String(moodComposerParams.tempo).trim() !== '') ||
      (moodComposerParams.languages && moodComposerParams.languages.length > 0)
    );
    
    const advancedTextInAccordion = form.getValues('moodDescription'); // If moodDescription was moved into accordion
    const advancedTextProvided = advancedTextInAccordion ? advancedTextInAccordion.trim() !== '' : false;


    let isDisabled = true;
    let reason = "";

    if (moodDescriptionProvided) {
        isDisabled = false;
        reason = "Primary Mood Description provided.";
    } else if (socialProfileUrlProvided) { // This branch is effectively dead due to disabled input
        isDisabled = false;
        reason = "Social Profile URL provided.";
    } else if (moodComposerInteracted) {
        isDisabled = false;
        reason = "Mood Composer interacted.";
    } else {
        isDisabled = true;
        reason = "No primary input: Mood Description is empty, Social Profile URL is disabled, and Mood Composer not interacted with.";
    }
    
    console.log(`Intermediate checks: moodDescriptionProvided=${moodDescriptionProvided}, socialProfileUrlProvided=${socialProfileUrlProvided}, moodComposerInteracted=${!!moodComposerInteracted}, advancedTextProvided=${advancedTextProvided}`);
    console.log(`isDiscoverButtonDisabled FINAL: Result=${isDisabled}. Reason: ${reason}`);
    console.log("--- isDiscoverButtonDisabled Check END ---");
    return isDisabled;
  };
  
  // Keying the form with activeTab to ensure it resets when tab changes
  // This part is removed as tabs are no longer used.
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
                  
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2 flex items-center"><Palette className="mr-2 h-4 w-4 text-primary/80" />Or, refine with Mood Composer:</h3>
                    <MoodComposer onParamsChange={handleMoodComposerChange} />
                  </div>
                  
                  <hr className="border-border/50" />

                  <div>
                     <h3 className="text-sm font-medium text-foreground mb-2 flex items-center"><User className="mr-2 h-4 w-4 text-primary/80" />Or, find by Social Profile:</h3>
                    <div className="form-field-spacing">
                      <Label htmlFor="socialProfileUrl" className="form-label">
                        Social Profile URL <span className="form-optional-label">(disabled)</span>
                      </Label>
                      <div className="flex space-x-2">
                        <Input
                          id="socialProfileUrl"
                          placeholder="e.g., https://linkedin.com/in/username"
                          {...form.register('socialProfileUrl')}
                          className="form-input-field flex-grow"
                          disabled // Disable the input field
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleAnalyzeProfileClick} 
                          disabled // Disable the analyze button
                        >
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
                  {/* This section is now an Accordion */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="song-filters">
                      <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline py-2 data-[state=closed]:border-b-0">
                        <Settings2 className="mr-2 h-4 w-4 text-primary/80" />Optional Song Filters
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 animate-accordion-down space-y-6">
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
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
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
