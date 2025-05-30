
'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import moodsData from '@/config/moods.json';
import type { MoodComposerData } from '@/types'; // Using the centralized type

const moodComposerSchema = z.object({
  selectedMoodName: z.string().optional(),
  energySlider: z.number().min(0).max(100).optional(),
  valenceSlider: z.number().min(0).max(100).optional(),
  tempo: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(40).max(240).optional()
  ),
  languages: z.array(z.string()).optional(),
});

type MoodComposerFormValues = z.infer<typeof moodComposerSchema>;

interface MoodComposerProps {
  onParamsChange: (params: MoodComposerData | null) => void;
  initialValues?: Partial<MoodComposerData>;
}

// Keep this list relatively short and common for simplicity in UI.
const availableLanguages = [
  { id: 'Spanish', label: 'Spanish' },
  { id: 'French', label: 'French' },
  { id: 'German', label: 'German' },
  { id: 'Japanese', label: 'Japanese' },
  { id: 'Korean', label: 'Korean' },
  { id: 'Hindi', label: 'Hindi' },
  { id: 'Tamil', label: 'Tamil' },
];

export function MoodComposer({ onParamsChange, initialValues }: MoodComposerProps) {
  const [selectedMoodDisplayName, setSelectedMoodDisplayName] = useState<string | undefined>(undefined);

  const form = useForm<MoodComposerFormValues>({
    resolver: zodResolver(moodComposerSchema),
    defaultValues: {
      selectedMoodName: initialValues?.selectedMoodName || undefined,
      energySlider: initialValues?.energy !== undefined ? initialValues.energy * 100 : 50,
      valenceSlider: initialValues?.valence !== undefined ? initialValues.valence * 100 : 50,
      tempo: initialValues?.tempo || undefined,
      languages: initialValues?.languages || [],
    },
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const moodConfig = moodsData.find(m => m.name === watchedValues.selectedMoodName);
    
    if (watchedValues.selectedMoodName && moodConfig) {
      if (form.formState.dirtyFields.energySlider === undefined && moodConfig.defaults.target_energy !== undefined) {
        form.setValue('energySlider', moodConfig.defaults.target_energy * 100, { shouldDirty: false });
      }
      if (form.formState.dirtyFields.valenceSlider === undefined && moodConfig.defaults.target_valence !== undefined) {
         form.setValue('valenceSlider', moodConfig.defaults.target_valence * 100, { shouldDirty: false });
      }
      if (form.formState.dirtyFields.tempo === undefined && moodConfig.defaults.target_tempo !== undefined) {
        form.setValue('tempo', moodConfig.defaults.target_tempo, { shouldDirty: false });
      }
      setSelectedMoodDisplayName(moodConfig.displayName);
    } else if (!watchedValues.selectedMoodName) {
      setSelectedMoodDisplayName(undefined);
    }

    // Construct MoodComposerData for parent
    const hasInteracted = watchedValues.selectedMoodName || 
                         form.formState.dirtyFields.energySlider ||
                         form.formState.dirtyFields.valenceSlider ||
                         form.formState.dirtyFields.tempo ||
                         form.formState.dirtyFields.languages;

    if (hasInteracted) { 
      const params: MoodComposerData = {
        selectedMoodName: watchedValues.selectedMoodName,
        energy: watchedValues.energySlider !== undefined ? watchedValues.energySlider / 100 : undefined,
        valence: watchedValues.valenceSlider !== undefined ? watchedValues.valenceSlider / 100 : undefined,
        tempo: watchedValues.tempo,
        languages: watchedValues.languages,
      };
      onParamsChange(params);
    } else {
      onParamsChange(null); 
    }
  }, [
      watchedValues.selectedMoodName, 
      watchedValues.energySlider, 
      watchedValues.valenceSlider, 
      watchedValues.tempo, 
      watchedValues.languages, 
      onParamsChange, 
      form
    ]);
  
  // Clear selection function
  const handleClearMoodSelection = () => {
    form.reset({
      selectedMoodName: undefined, 
      energySlider: 50, 
      valenceSlider: 50,
      tempo: undefined,
      languages: [],
    });
    setSelectedMoodDisplayName(undefined);
    onParamsChange(null); 
  };


  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="selectedMoodName" className="form-label">
          Select a Mood Profile
        </Label>
        <div className="flex items-center space-x-2">
        <Controller
          name="selectedMoodName"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <SelectTrigger id="selectedMoodName" className="form-select-trigger flex-grow">
                <SelectValue placeholder="Start with a mood profile..." />
              </SelectTrigger>
              <SelectContent>
                {moodsData.map((mood) => (
                  <SelectItem key={mood.name} value={mood.name}>
                    {mood.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {watchedValues.selectedMoodName && (
            <Button type="button" variant="outline" size="sm" onClick={handleClearMoodSelection} className="px-3">
              Clear
            </Button>
          )}
        </div>
        {selectedMoodDisplayName && <p className="text-xs text-muted-foreground mt-1.5">Selected: {selectedMoodDisplayName}</p>}
      </div>

      <div>
        <Label htmlFor="energySlider" className="form-label">
          Energy: <span className="font-normal text-muted-foreground">({form.watch('energySlider') || 0})</span>
        </Label>
        <Controller
          name="energySlider"
          control={form.control}
          defaultValue={50}
          render={({ field }) => (
            <Slider
              id="energySlider"
              min={0}
              max={100}
              step={1}
              value={[field.value || 0]}
              onValueChange={(value) => field.onChange(value[0])}
              className="mt-1"
            />
          )}
        />
      </div>

      <div>
        <Label htmlFor="valenceSlider" className="form-label">
          Valence (Positiveness): <span className="font-normal text-muted-foreground">({form.watch('valenceSlider') || 0})</span>
        </Label>
        <Controller
          name="valenceSlider"
          control={form.control}
          defaultValue={50}
          render={({ field }) => (
            <Slider
              id="valenceSlider"
              min={0}
              max={100}
              step={1}
              value={[field.value || 0]}
              onValueChange={(value) => field.onChange(value[0])}
              className="mt-1"
            />
          )}
        />
      </div>
      
      <div className="form-field-spacing">
        <Label htmlFor="tempo" className="form-label">
          Target Tempo (BPM) <span className="form-optional-label">(optional)</span>
        </Label>
        <Input
          id="tempo"
          type="number"
          placeholder="e.g., 120"
          {...form.register('tempo')}
          className="form-input-field"
        />
        {form.formState.errors.tempo && <p className="text-xs text-destructive mt-1.5">{form.formState.errors.tempo.message}</p>}
      </div>

      <div>
        <Label className="form-label">
          Language Preferences <span className="form-optional-label">(optional)</span>
        </Label>
        <div className="mt-2 space-y-2">
          {availableLanguages.map((lang) => (
            <Controller
              key={lang.id}
              name="languages"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`lang-${lang.id}`}
                    checked={field.value?.includes(lang.id)}
                    onCheckedChange={(checked) => {
                      return checked
                        ? field.onChange([...(field.value || []), lang.id])
                        : field.onChange(
                            (field.value || []).filter(
                              (value) => value !== lang.id
                            )
                          );
                    }}
                  />
                  <Label htmlFor={`lang-${lang.id}`} className="text-sm font-normal">
                    {lang.label}
                  </Label>
                </div>
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
