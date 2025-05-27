
import { config } from 'dotenv';
config();

import '@/ai/flows/interpret-musical-intent';
import '@/ai/flows/analyze-audio-snippet';
import '@/ai/flows/analyze-social-profile'; // Ensured no .ts extension
import '@/ai/flows/interpret-profile-for-music';
