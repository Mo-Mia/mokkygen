import type { OpenRouterModality } from './openrouter';

export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
  tokens: string;
  inputCost: number;
  outputCost: number;
  context: string;
  released: string;
  preferredModalities?: OpenRouterModality[];
}

export const MODELS: ImageModel[] = [
  { id: 'openai/gpt-5.4-image-2', name: 'GPT-5.4 Image 2', provider: 'openai', isFree: false, tokens: '2.14B', inputCost: 8, outputCost: 15, context: '272,000', released: 'Apr 21, 2026' },
  { id: 'google/gemini-3.1-flash-image-preview', name: 'Nano Banana 2 (Gemini 3.1 Flash Image)', provider: 'google', isFree: false, tokens: '7.27B', inputCost: 0.50, outputCost: 3, context: '65,536', released: 'Feb 26, 2026' },
  { id: 'sourceful/riverflow-v2-pro', name: 'Riverflow V2 Pro', provider: 'sourceful', isFree: true, tokens: '34.9M', inputCost: 0, outputCost: 0, context: '8,192', released: 'Feb 2, 2026' },
  { id: 'sourceful/riverflow-v2-fast', name: 'Riverflow V2 Fast', provider: 'sourceful', isFree: true, tokens: '69.1M', inputCost: 0, outputCost: 0, context: '8,192', released: 'Feb 2, 2026' },
  { id: 'black-forest-labs/flux.2-klein-4b', name: 'FLUX.2 Klein 4B', provider: 'black-forest-labs', isFree: true, tokens: '21.3M', inputCost: 0, outputCost: 0, context: '40,960', released: 'Jan 15, 2026' },
  { id: 'bytedance/seedream-4.5', name: 'Seedream 4.5', provider: 'bytedance-seed', isFree: true, tokens: '4.51B', inputCost: 0, outputCost: 0, context: '4,096', released: 'Dec 23, 2025' },
  { id: 'black-forest-labs/flux.2-max', name: 'FLUX.2 Max', provider: 'black-forest-labs', isFree: true, tokens: '31.8M', inputCost: 0, outputCost: 0, context: '46,864', released: 'Dec 16, 2025' },
  { id: 'sourceful/riverflow-v2-max-preview', name: 'Riverflow V2 Max Preview', provider: 'sourceful', isFree: true, tokens: '4.32M', inputCost: 0, outputCost: 0, context: '8,192', released: 'Dec 9, 2025' },
  { id: 'sourceful/riverflow-v2-standard-preview', name: 'Riverflow V2 Standard Preview', provider: 'sourceful', isFree: true, tokens: '8.09M', inputCost: 0, outputCost: 0, context: '8,192', released: 'Dec 9, 2025' },
  { id: 'sourceful/riverflow-v2-fast-preview', name: 'Riverflow V2 Fast Preview', provider: 'sourceful', isFree: true, tokens: '17.8M', inputCost: 0, outputCost: 0, context: '8,192', released: 'Dec 9, 2025' },
  { id: 'black-forest-labs/flux.2-flex', name: 'FLUX.2 Flex', provider: 'black-forest-labs', isFree: true, tokens: '9.65M', inputCost: 0, outputCost: 0, context: '67,344', released: 'Nov 25, 2025' },
  { id: 'black-forest-labs/flux.2-pro', name: 'FLUX.2 Pro', provider: 'black-forest-labs', isFree: true, tokens: '49.2M', inputCost: 0, outputCost: 0, context: '46,864', released: 'Nov 25, 2025' },
  { id: 'google/gemini-3.0-pro-image-preview', name: 'Nano Banana Pro (Gemini 3 Pro Image)', provider: 'google', isFree: false, tokens: '2.89B', inputCost: 2, outputCost: 12, context: '65,536', released: 'Nov 20, 2025' },
  { id: 'openai/gpt-5-image-mini', name: 'GPT-5 Image Mini', provider: 'openai', isFree: false, tokens: '271M', inputCost: 2.50, outputCost: 2, context: '400,000', released: 'Oct 16, 2025' },
  { id: 'openai/gpt-5-image', name: 'GPT-5 Image', provider: 'openai', isFree: false, tokens: '104M', inputCost: 10, outputCost: 10, context: '400,000', released: 'Oct 14, 2025' },
  { id: 'google/gemini-2.5-flash-image', name: 'Nano Banana (Gemini 2.5 Flash Image)', provider: 'google', isFree: false, tokens: '9.92B', inputCost: 0.30, outputCost: 2.50, context: '32,768', released: 'Oct 7, 2025' }
];

export const THEMES = [
  'Cyberpunk', 'Steampunk', 'Minimalist', 'Fantasy', 'Sci-Fi', 'Vaporwave', 'Gothic', 'Art Deco'
];

export const STYLES = [
  'Photorealistic', 'Digital Art', 'Anime', 'Oil Painting', 'Watercolor', '3D Render', 'Sketch', 'Cinematic'
];

export const LIGHTING = [
  'Neon', 'Golden Hour', 'Cinematic Lighting', 'Volumetric', 'Studio Lighting', 'Dark and Moody', 'Bioluminescent'
];
