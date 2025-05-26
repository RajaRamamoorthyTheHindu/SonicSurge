
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';

const formSchema = z.object({
  moodDescription: z.string().min(1, { message: 'Please describe the mood or vibe.' }),
  songName: z.string().optional(),
  artistName: z.string().optional(),
  instrumentTags: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

interface FindYourVibeProps {
  onSearchInitiated: (formValues: FormValues) => Promise<void>;
  isParentSearching: boolean;
}

export function FindYourVibe({ onSearchInitiated, isParentSearching }: FindYourVibeProps) {
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      moodDescription: '',
      songName: '',
      artistName: '',
      instrumentTags: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmittingForm(true);
    try {
      await onSearchInitiated(values);
    } catch (error) {
       // Errors are handled by the parent in page.tsx
    } finally {
      setIsSubmittingForm(false);
    }
  }
  
  const discoverButtonDisabled = isSubmittingForm || isParentSearching;

  return (
    <section className="w-full">
      <Card className="max-w-2xl mx-auto form-container-card subtle-shadow">
        <CardHeader className="pb-4 pt-1 px-0 md:px-0">
          <CardTitle className="form-card-title">What kind of vibe are you looking for?</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-0 md:px-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
            <div className="form-field-spacing">
              <Label htmlFor="moodDescription" className="form-label">
                Mood / Vibe <span className="text-primary text-sm">(required)</span>
              </Label>
              <Textarea
                id="moodDescription"
                placeholder="e.g. lazy Sunday afternoon, road-trip energy, mellow evening walk"
                {...form.register('moodDescription')}
                className="form-textarea-field"
              />
              {form.formState.errors.moodDescription && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.moodDescription.message}</p>}
            </div>

            <div className="form-field-spacing">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full themed-input flex items-center justify-center text-base font-medium hover:bg-muted/80"
                aria-expanded={showAdvancedFilters}
              >
                {showAdvancedFilters ? 'Hide Advanced Filters' : 'Advanced Filters'}
                {showAdvancedFilters ? <ChevronUp className="ml-2 h-5 w-5" /> : <ChevronDown className="ml-2 h-5 w-5" />}
              </Button>
            </div>

            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 animate-accordion-down">
                <div className="form-field-spacing md:col-span-1">
                  <Label htmlFor="songName" className="form-label">
                    Song Name <span className="form-optional-label">(optional)</span>
                  </Label>
                  <Input id="songName" placeholder="e.g., Levitating" {...form.register('songName')} className="form-input-field" />
                </div>

                <div className="form-field-spacing md:col-span-1">
                  <Label htmlFor="artistName" className="form-label">
                    Artist Name <span className="form-optional-label">(optional)</span>
                  </Label>
                  <Input id="artistName" placeholder="e.g. Billie Eilish" {...form.register('artistName')} className="form-input-field" />
                </div>
                
                <div className="form-field-spacing md:col-span-2"> {/* Changed to col-span-2 to take full width */}
                  <Label htmlFor="instrumentTags" className="form-label">
                    Key Instruments <span className="form-optional-label">(optional)</span>
                  </Label>
                  <Input id="instrumentTags" placeholder="e.g. guitar, saxophone" {...form.register('instrumentTags')} className="form-input-field" />
                </div>
              </div>
            )}
            
            <div className="pt-4">
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
