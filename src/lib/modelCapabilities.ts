import type { OpenRouterModality } from './openrouter';

export type AspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'
  | '1:4'
  | '4:1'
  | '1:8'
  | '8:1';

export type ImageSize = '0.5K' | '1K' | '2K' | '4K';

export interface ReferenceImageInput {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
}

export interface FontInput {
  id: string;
  fontUrl: string;
  text: string;
}

export interface ImageGenerationSettings {
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  seed?: number | null;
  temperature?: number | null;
  referenceImages: ReferenceImageInput[];
  fontInputs: FontInput[];
}

export interface PersistedImageGenerationSettings {
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  seed?: number | null;
  temperature?: number | null;
  fontInputs?: FontInput[];
}

export interface ImageModelCapabilities {
  preferredModalities: OpenRouterModality[];
  supportsImageConfig: boolean;
  supportedAspectRatios: AspectRatio[];
  defaultAspectRatio: AspectRatio;
  supportedImageSizes: ImageSize[];
  defaultImageSize: ImageSize;
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
  supportsSeed: boolean;
  supportsTemperature: boolean;
  supportsFontInputs: boolean;
  notes?: string[];
}

const COMMON_RATIOS: AspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const GEMINI_31_RATIOS: AspectRatio[] = [...COMMON_RATIOS, '1:4', '4:1', '1:8', '8:1'];

export const DEFAULT_GENERATION_SETTINGS: ImageGenerationSettings = {
  aspectRatio: '1:1',
  imageSize: '1K',
  seed: null,
  temperature: null,
  referenceImages: [],
  fontInputs: [],
};

const conservative: ImageModelCapabilities = {
  preferredModalities: ['image', 'text'],
  supportsImageConfig: false,
  supportedAspectRatios: [],
  defaultAspectRatio: '1:1',
  supportedImageSizes: [],
  defaultImageSize: '1K',
  supportsReferenceImages: false,
  maxReferenceImages: 0,
  supportsSeed: false,
  supportsTemperature: false,
  supportsFontInputs: false,
  notes: ['Unknown model capabilities. Advanced controls are hidden until tested.'],
};

const textAndImageBase: ImageModelCapabilities = {
  ...conservative,
  preferredModalities: ['image', 'text'],
  supportsImageConfig: true,
  supportedAspectRatios: COMMON_RATIOS,
  supportedImageSizes: ['1K'],
};

const imageOnlyBase: ImageModelCapabilities = {
  ...conservative,
  preferredModalities: ['image'],
  supportsImageConfig: true,
  supportedAspectRatios: COMMON_RATIOS,
  supportedImageSizes: ['1K'],
};

const CAPABILITIES: Record<string, ImageModelCapabilities> = {
  'openai/gpt-5.4-image-2': {
    ...textAndImageBase,
    supportsReferenceImages: false,
    maxReferenceImages: 0,
  },
  'openai/gpt-5-image': {
    ...textAndImageBase,
    supportsReferenceImages: false,
    maxReferenceImages: 0,
  },
  'openai/gpt-5-image-mini': {
    ...textAndImageBase,
    supportsReferenceImages: false,
    maxReferenceImages: 0,
  },
  'google/gemini-3.1-flash-image-preview': {
    ...textAndImageBase,
    supportedAspectRatios: GEMINI_31_RATIOS,
    supportedImageSizes: ['0.5K', '1K', '2K', '4K'],
    supportsReferenceImages: true,
    maxReferenceImages: 4,
  },
  'google/gemini-3.0-pro-image-preview': {
    ...textAndImageBase,
    supportedImageSizes: ['1K'],
    supportsReferenceImages: true,
    maxReferenceImages: 4,
    notes: ['Higher image sizes are hidden until UAT confirms provider support.'],
  },
  'google/gemini-2.5-flash-image': {
    ...textAndImageBase,
    supportedImageSizes: ['1K'],
    supportsReferenceImages: true,
    maxReferenceImages: 4,
    notes: ['Higher image sizes are hidden until UAT confirms provider support.'],
  },
  'sourceful/riverflow-v2-pro': {
    ...imageOnlyBase,
    supportsFontInputs: true,
  },
  'sourceful/riverflow-v2-fast': {
    ...imageOnlyBase,
    supportsFontInputs: true,
  },
  'sourceful/riverflow-v2-max-preview': imageOnlyBase,
  'sourceful/riverflow-v2-standard-preview': imageOnlyBase,
  'sourceful/riverflow-v2-fast-preview': imageOnlyBase,
  'black-forest-labs/flux.2-klein-4b': imageOnlyBase,
  'black-forest-labs/flux.2-max': imageOnlyBase,
  'black-forest-labs/flux.2-flex': imageOnlyBase,
  'black-forest-labs/flux.2-pro': imageOnlyBase,
  'bytedance/seedream-4.5': imageOnlyBase,
};

function intersect<T>(sets: T[][]): T[] {
  if (sets.length === 0) return [];
  return sets[0].filter((value) => sets.every((set) => set.includes(value)));
}

export function getImageModelCapabilities(modelId: string): ImageModelCapabilities {
  return CAPABILITIES[modelId] ?? conservative;
}

export function getCommonCapabilities(modelIds: string[]): ImageModelCapabilities {
  const capabilities = modelIds.map(getImageModelCapabilities);
  if (capabilities.length === 0) return conservative;

  const supportedAspectRatios = intersect(capabilities.map((item) => item.supportedAspectRatios));
  const supportedImageSizes = intersect(capabilities.map((item) => item.supportedImageSizes));
  const preferredModalities = intersect(capabilities.map((item) => item.preferredModalities));

  return {
    preferredModalities: preferredModalities.length > 0 ? preferredModalities : ['image'],
    supportsImageConfig: capabilities.every((item) => item.supportsImageConfig),
    supportedAspectRatios,
    defaultAspectRatio: supportedAspectRatios.includes('1:1') ? '1:1' : supportedAspectRatios[0] ?? '1:1',
    supportedImageSizes,
    defaultImageSize: supportedImageSizes.includes('1K') ? '1K' : supportedImageSizes[0] ?? '1K',
    supportsReferenceImages: capabilities.every((item) => item.supportsReferenceImages),
    maxReferenceImages: capabilities.every((item) => item.supportsReferenceImages) ? Math.min(...capabilities.map((item) => item.maxReferenceImages)) : 0,
    supportsSeed: capabilities.every((item) => item.supportsSeed),
    supportsTemperature: capabilities.every((item) => item.supportsTemperature),
    supportsFontInputs: capabilities.every((item) => item.supportsFontInputs),
    notes: capabilities.flatMap((item) => item.notes ?? []),
  };
}

export function clampSettingsForCapabilities(settings: ImageGenerationSettings, capabilities: ImageModelCapabilities): ImageGenerationSettings {
  const aspectRatio = capabilities.supportedAspectRatios.includes(settings.aspectRatio as AspectRatio)
    ? settings.aspectRatio
    : capabilities.supportedAspectRatios.length > 0
      ? capabilities.defaultAspectRatio
      : undefined;
  const imageSize = capabilities.supportedImageSizes.includes(settings.imageSize as ImageSize)
    ? settings.imageSize
    : capabilities.supportedImageSizes.length > 0
      ? capabilities.defaultImageSize
      : undefined;

  return {
    aspectRatio,
    imageSize,
    seed: capabilities.supportsSeed ? settings.seed ?? null : null,
    temperature: capabilities.supportsTemperature ? settings.temperature ?? null : null,
    referenceImages: capabilities.supportsReferenceImages ? settings.referenceImages.slice(0, capabilities.maxReferenceImages) : [],
    fontInputs: capabilities.supportsFontInputs ? settings.fontInputs.slice(0, 2) : [],
  };
}

export function toPersistedSettings(settings: ImageGenerationSettings): PersistedImageGenerationSettings {
  return {
    aspectRatio: settings.aspectRatio,
    imageSize: settings.imageSize,
    seed: settings.seed ?? null,
    temperature: settings.temperature ?? null,
    fontInputs: settings.fontInputs,
  };
}

export function fromPersistedSettings(settings?: PersistedImageGenerationSettings): ImageGenerationSettings {
  return {
    ...DEFAULT_GENERATION_SETTINGS,
    ...settings,
    seed: settings?.seed ?? null,
    temperature: settings?.temperature ?? null,
    referenceImages: [],
    fontInputs: settings?.fontInputs ?? [],
  };
}
