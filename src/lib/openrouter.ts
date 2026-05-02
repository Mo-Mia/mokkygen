import { IMAGE_MODEL_GUIDES } from './promptWizard';
import {
  clampSettingsForCapabilities,
  getImageModelCapabilities,
  type FontInput,
  type ImageGenerationSettings,
  type ImageModelCapabilities,
} from './modelCapabilities';

const OR_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODALITIES: OpenRouterModality[] = ['image', 'text'];

export type OpenRouterModality = 'image' | 'text';

export interface OpenRouterErrorDetails {
  endpoint: string;
  model?: string;
  status?: number;
  message: string;
  code?: string | number;
  type?: string;
  requestedModalities?: OpenRouterModality[];
  finalModalities?: OpenRouterModality[];
  fallbackModalities?: OpenRouterModality[];
  fallbackUsed?: boolean;
  originalErrorMessage?: string;
  finalErrorMessage?: string;
  requestedImageConfig?: Record<string, unknown>;
  finalImageConfig?: Record<string, unknown>;
  referenceImageCount?: number;
  droppedSettings?: string[];
  advancedSettingsFallbackUsed?: boolean;
}

export class OpenRouterApiError extends Error {
  details: OpenRouterErrorDetails;

  constructor(details: OpenRouterErrorDetails) {
    super(details.message);
    this.name = 'OpenRouterApiError';
    this.details = details;
  }
}

export interface OpenRouterKeyResponse {
  data: OpenRouterKeyInfo;
}

export interface OpenRouterKeyInfo {
  label?: string;
  limit: number | null;
  limit_reset: string | null;
  limit_remaining: number | null;
  include_byok_in_limit?: boolean;
  usage: number;
  usage_daily: number;
  usage_weekly: number;
  usage_monthly: number;
  byok_usage?: number;
  byok_usage_daily?: number;
  byok_usage_weekly?: number;
  byok_usage_monthly?: number;
  is_free_tier: boolean;
}

export interface CreditDisplay {
  title: string;
  detail: string;
  usageMonthly: string;
  resetLabel?: string;
  isLow: boolean;
  isUnlimited: boolean;
  isFreeTier: boolean;
  remaining: number | null;
}

export interface ORGenerationParams {
  model: string;
  prompt: string;
  modalities?: OpenRouterModality[];
  settings?: ImageGenerationSettings;
  capabilities?: ImageModelCapabilities;
}

export interface ORGenerationResult {
  id: string;
  model: string;
  content: string;
  imageUrl?: string;
  durationMs: number;
  cost?: number;
  providerName?: string;
  generationTime?: number;
  createdAt?: number;
  requestedModalities?: OpenRouterModality[];
  fallbackModalities?: OpenRouterModality[];
  modalityFallbackUsed?: boolean;
  advancedSettingsFallbackUsed?: boolean;
  droppedSettings?: string[];
}

export interface ORGenerationMetadata {
  id?: string;
  cost?: number;
  providerName?: string;
  generationTime?: number;
  createdAt?: number;
}

export type WizardMode = 'improve' | 'photorealistic' | 'cinematic' | 'detail' | 'simplify' | 'explain';

export interface PromptWizardParams {
  wizardModel: string;
  prompt: string;
  imageModel: string;
  mode: WizardMode;
}

export interface PromptWizardResult {
  mode: WizardMode;
  improvedPrompt?: string;
  negativePrompt?: string;
  reasoning?: string;
  modelTips: string[];
  variants: { label: string; prompt: string }[];
  warnings: string[];
  rawText?: string;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function resetLabel(limitReset: string | null): string | undefined {
  if (!limitReset) return undefined;
  const normalised = limitReset.toLowerCase();
  if (normalised.includes('month')) return 'Monthly';
  if (normalised.includes('week')) return 'Weekly';
  if (normalised.includes('day')) return 'Daily';
  return titleCase(limitReset);
}

export function computeCreditDisplay(info: OpenRouterKeyInfo): CreditDisplay {
  const reset = resetLabel(info.limit_reset);
  const usageMonthly = `Used this month: ${formatMoney(info.usage_monthly ?? 0)}`;

  if (info.limit === null) {
    return {
      title: 'Unlimited key',
      detail: usageMonthly,
      usageMonthly,
      resetLabel: reset,
      isLow: false,
      isUnlimited: true,
      isFreeTier: info.is_free_tier,
      remaining: null,
    };
  }

  const remaining = info.limit_remaining ?? Math.max(0, info.limit - (info.usage ?? 0));
  const title = `Balance: ${formatMoney(remaining)} / ${formatMoney(info.limit)}${reset ? ` (${reset})` : ''}`;

  return {
    title,
    detail: usageMonthly,
    usageMonthly,
    resetLabel: reset,
    isLow: remaining < 1,
    isUnlimited: false,
    isFreeTier: info.is_free_tier,
    remaining,
  };
}

async function parseErrorResponse(resp: Response, endpoint: string, model?: string, extra?: Partial<OpenRouterErrorDetails>): Promise<OpenRouterApiError> {
  const body = await resp.json().catch(() => null);
  const error = body?.error ?? body;
  const message = error?.message || `OpenRouter request failed (${resp.status})`;

  return new OpenRouterApiError({
    endpoint,
    model,
    status: resp.status,
    message,
    code: error?.code,
    type: error?.type,
    ...extra,
  });
}

export function isGuardrailOrNoEndpointError(error: unknown): boolean {
  const message = error instanceof OpenRouterApiError ? error.details.message : error instanceof Error ? error.message : String(error);
  return /no endpoints available|guardrail|data policy|privacy|provider privacy|settings\/privacy/i.test(message);
}

function isModalityMismatchError(error: unknown): boolean {
  const message = error instanceof OpenRouterApiError ? error.details.message : error instanceof Error ? error.message : String(error);
  return /requested output modalities|support.*modalit|modalities:\s*image,\s*text/i.test(message);
}

export function technicalDetails(error: unknown): OpenRouterErrorDetails | undefined {
  if (error instanceof OpenRouterApiError) return error.details;
  if (error instanceof Error) {
    return {
      endpoint: 'unknown',
      message: error.message,
    };
  }
  return undefined;
}

export async function getKeyInfo(apiKey: string): Promise<OpenRouterKeyInfo> {
  const endpoint = `${OR_BASE}/key`;
  const resp = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!resp.ok) {
    throw await parseErrorResponse(resp, endpoint);
  }

  const data = (await resp.json()) as OpenRouterKeyResponse;
  return data.data;
}

export function extractImageUrl(message: any, content: string): string | undefined {
  const imageFromArray = message?.images?.find((image: any) => image?.imageUrl?.url || image?.image_url?.url);
  const structuredUrl = imageFromArray?.imageUrl?.url || imageFromArray?.image_url?.url;
  if (structuredUrl) return structuredUrl;

  const mdImgRegex = /!\[.*?\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/;
  const mdMatch = content.match(mdImgRegex);
  if (mdMatch) return mdMatch[1];

  const urlRegex = /(?:https?:\/\/|data:image\/)[^\s"'<>()]+/;
  const urlMatch = content.match(urlRegex);
  if (urlMatch) return urlMatch[0].replace(/[.,;:!?]$/, '');

  return undefined;
}

function cleanFontInputs(fontInputs: FontInput[]): Array<{ font_url: string; text: string }> {
  return fontInputs
    .slice(0, 2)
    .map((fontInput) => ({ font_url: fontInput.fontUrl.trim(), text: fontInput.text.trim() }))
    .filter((fontInput) => fontInput.font_url && fontInput.text);
}

function buildImageConfig(settings: ImageGenerationSettings, capabilities: ImageModelCapabilities): Record<string, unknown> | undefined {
  if (!capabilities.supportsImageConfig) return undefined;

  const imageConfig: Record<string, unknown> = {};
  if (settings.aspectRatio && capabilities.supportedAspectRatios.includes(settings.aspectRatio)) {
    imageConfig.aspect_ratio = settings.aspectRatio;
  }
  if (settings.imageSize && capabilities.supportedImageSizes.includes(settings.imageSize)) {
    imageConfig.image_size = settings.imageSize;
  }
  if (capabilities.supportsFontInputs) {
    const fontInputs = cleanFontInputs(settings.fontInputs);
    if (fontInputs.length > 0) imageConfig.font_inputs = fontInputs;
  }

  return Object.keys(imageConfig).length > 0 ? imageConfig : undefined;
}

function buildMessages(prompt: string, settings: ImageGenerationSettings, capabilities: ImageModelCapabilities) {
  const referenceImages = capabilities.supportsReferenceImages ? settings.referenceImages.slice(0, capabilities.maxReferenceImages) : [];
  if (referenceImages.length === 0) {
    return [{ role: 'user', content: prompt }];
  }

  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...referenceImages.map((image) => ({
          type: 'image_url',
          image_url: { url: image.dataUrl },
        })),
      ],
    },
  ];
}

function buildAdvancedPayload(params: ORGenerationParams, capabilities: ImageModelCapabilities, settings: ImageGenerationSettings, omit: string[] = []) {
  const requestedSettings = clampSettingsForCapabilities(settings, capabilities);
  const effectiveSettings: ImageGenerationSettings = {
    ...requestedSettings,
    aspectRatio: omit.includes('aspect_ratio') || omit.includes('image_config') ? undefined : requestedSettings.aspectRatio,
    imageSize: omit.includes('image_size') || omit.includes('image_config') ? undefined : requestedSettings.imageSize,
    referenceImages: omit.includes('reference_images') ? [] : requestedSettings.referenceImages,
    fontInputs: omit.includes('font_inputs') || omit.includes('image_config') ? [] : requestedSettings.fontInputs,
    seed: omit.includes('seed') ? null : requestedSettings.seed,
    temperature: omit.includes('temperature') ? null : requestedSettings.temperature,
  };
  const imageConfig = omit.includes('image_config') ? undefined : buildImageConfig(effectiveSettings, capabilities);
  const payload: Record<string, unknown> = {
    model: params.model,
    messages: buildMessages(params.prompt, effectiveSettings, capabilities),
  };

  if (imageConfig) payload.image_config = imageConfig;
  if (capabilities.supportsSeed && effectiveSettings.seed !== null && effectiveSettings.seed !== undefined) payload.seed = effectiveSettings.seed;
  if (capabilities.supportsTemperature && effectiveSettings.temperature !== null && effectiveSettings.temperature !== undefined) payload.temperature = effectiveSettings.temperature;

  return {
    payload,
    imageConfig,
    referenceImageCount: capabilities.supportsReferenceImages ? effectiveSettings.referenceImages.length : 0,
  };
}

function isAdvancedSettingsError(error: unknown): boolean {
  const message = error instanceof OpenRouterApiError ? error.details.message : error instanceof Error ? error.message : String(error);
  return /image_config|aspect_ratio|image_size|font_inputs|seed|temperature|image_url|image input|reference/i.test(message);
}

function advancedFallbackForError(error: unknown): string[] {
  const message = error instanceof OpenRouterApiError ? error.details.message : error instanceof Error ? error.message : String(error);
  if (/image_size|resolution|size/i.test(message)) return ['image_size'];
  if (/aspect_ratio|aspect ratio|ratio/i.test(message)) return ['aspect_ratio'];
  if (/font_inputs|font/i.test(message)) return ['font_inputs'];
  if (/image_url|image input|reference/i.test(message)) return ['reference_images'];
  if (/image_config/i.test(message)) return ['image_config'];
  if (/seed/i.test(message)) return ['seed'];
  if (/temperature/i.test(message)) return ['temperature'];
  return ['image_config'];
}

async function requestImageCompletion(
  apiKey: string,
  endpoint: string,
  params: ORGenerationParams,
  modalities: OpenRouterModality[],
  startedAt: number,
  capabilities: ImageModelCapabilities,
  settings: ImageGenerationSettings,
  fallbackInfo?: {
    requestedModalities?: OpenRouterModality[];
    fallbackModalities?: OpenRouterModality[];
    droppedSettings?: string[];
    advancedSettingsFallbackUsed?: boolean;
    originalErrorMessage?: string;
  }
): Promise<ORGenerationResult> {
  const built = buildAdvancedPayload(params, capabilities, settings, fallbackInfo?.droppedSettings ?? []);
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MokkyGen',
    },
    body: JSON.stringify({
      ...built.payload,
      modalities,
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw await parseErrorResponse(resp, endpoint, params.model, {
      requestedModalities: fallbackInfo?.requestedModalities ?? modalities,
      finalModalities: modalities,
      fallbackModalities: fallbackInfo?.fallbackModalities,
      fallbackUsed: Boolean(fallbackInfo),
      requestedImageConfig: buildImageConfig(clampSettingsForCapabilities(settings, capabilities), capabilities),
      finalImageConfig: built.imageConfig,
      referenceImageCount: built.referenceImageCount,
      droppedSettings: fallbackInfo?.droppedSettings,
      advancedSettingsFallbackUsed: fallbackInfo?.advancedSettingsFallbackUsed ?? false,
      originalErrorMessage: fallbackInfo?.originalErrorMessage,
    });
  }

  const data = await resp.json();
  const message = data.choices?.[0]?.message ?? {};
  const content = typeof message.content === 'string' ? message.content : message.content ? JSON.stringify(message.content) : '';
  const imageUrl = extractImageUrl(message, content);

  return {
    id: data.id,
    model: params.model,
    content: content || (imageUrl ? '' : 'OpenRouter returned no text content with this image.'),
    imageUrl,
    durationMs: Math.round(performance.now() - startedAt),
    createdAt: Date.now(),
    requestedModalities: fallbackInfo?.requestedModalities ?? modalities,
    fallbackModalities: fallbackInfo?.fallbackModalities,
    modalityFallbackUsed: Boolean(fallbackInfo?.fallbackModalities),
    advancedSettingsFallbackUsed: fallbackInfo?.advancedSettingsFallbackUsed,
    droppedSettings: fallbackInfo?.droppedSettings,
  };
}

export async function generateImage(apiKey: string, params: ORGenerationParams): Promise<ORGenerationResult> {
  const endpoint = `${OR_BASE}/chat/completions`;
  const startedAt = performance.now();
  const capabilities = params.capabilities ?? getImageModelCapabilities(params.model);
  const settings = clampSettingsForCapabilities(
    params.settings ?? {
      aspectRatio: undefined,
      imageSize: undefined,
      seed: null,
      temperature: null,
      referenceImages: [],
      fontInputs: [],
    },
    capabilities
  );
  const requestedModalities = params.modalities ?? capabilities.preferredModalities ?? DEFAULT_MODALITIES;

  try {
    return await requestImageCompletion(apiKey, endpoint, params, requestedModalities, startedAt, capabilities, settings);
  } catch (error) {
    if (!isModalityMismatchError(error) || requestedModalities.length === 1 && requestedModalities[0] === 'image') {
      if (error instanceof OpenRouterApiError) {
        error.details.requestedModalities = requestedModalities;
        error.details.finalModalities = requestedModalities;
        error.details.fallbackUsed = false;
      }
      if (!isAdvancedSettingsError(error)) throw error;

      const droppedSettings = advancedFallbackForError(error);
      try {
        return await requestImageCompletion(apiKey, endpoint, params, requestedModalities, startedAt, capabilities, settings, {
          requestedModalities,
          droppedSettings,
          advancedSettingsFallbackUsed: true,
          originalErrorMessage: error instanceof OpenRouterApiError ? error.details.message : error instanceof Error ? error.message : String(error),
        });
      } catch (fallbackError) {
        if (fallbackError instanceof OpenRouterApiError) {
          fallbackError.details.finalErrorMessage = fallbackError.details.message;
        }
        throw fallbackError;
      }
    }

    const fallbackModalities: OpenRouterModality[] = ['image'];
    try {
      return await requestImageCompletion(apiKey, endpoint, params, fallbackModalities, startedAt, capabilities, settings, {
        requestedModalities,
        fallbackModalities,
      });
    } catch (fallbackError) {
      if (isAdvancedSettingsError(fallbackError)) {
        const droppedSettings = advancedFallbackForError(fallbackError);
        try {
          return await requestImageCompletion(apiKey, endpoint, params, fallbackModalities, startedAt, capabilities, settings, {
            requestedModalities,
            fallbackModalities,
            droppedSettings,
            advancedSettingsFallbackUsed: true,
            originalErrorMessage: fallbackError instanceof OpenRouterApiError ? fallbackError.details.message : fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
        } catch (advancedFallbackError) {
          if (advancedFallbackError instanceof OpenRouterApiError) {
            advancedFallbackError.details.finalErrorMessage = advancedFallbackError.details.message;
          }
          throw advancedFallbackError;
        }
      }
      if (fallbackError instanceof OpenRouterApiError) {
        fallbackError.details.requestedModalities = requestedModalities;
        fallbackError.details.finalModalities = fallbackModalities;
        fallbackError.details.fallbackModalities = fallbackModalities;
        fallbackError.details.fallbackUsed = true;
        fallbackError.details.originalErrorMessage = error instanceof OpenRouterApiError ? error.details.message : error instanceof Error ? error.message : String(error);
      }
      throw fallbackError;
    }
  }
}

export async function getGenerationMetadata(apiKey: string, generationId: string): Promise<ORGenerationMetadata | undefined> {
  const endpoint = `${OR_BASE}/generation?id=${encodeURIComponent(generationId)}`;
  const resp = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!resp.ok) {
    throw await parseErrorResponse(resp, endpoint);
  }

  const data = await resp.json();
  const generation = data.data ?? {};
  const createdAt = generation.created_at ? Date.parse(generation.created_at) : undefined;

  return {
    id: generation.id,
    cost: typeof generation.total_cost === 'number' ? generation.total_cost : undefined,
    providerName: generation.provider_name,
    generationTime: generation.generation_time,
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
  };
}

export async function fetchOpenRouterImageModels(apiKey?: string): Promise<unknown> {
  const endpoint = `${OR_BASE}/models?output_modalities=image`;
  const resp = await fetch(endpoint, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });

  if (!resp.ok) {
    throw await parseErrorResponse(resp, endpoint);
  }

  return resp.json();
}

function wizardInstruction(mode: WizardMode): string {
  switch (mode) {
    case 'improve':
      return 'Rewrite the prompt into a stronger image generation prompt tailored to the selected image model.';
    case 'photorealistic':
      return 'Preserve the scene but optimise it for realistic photography with practical camera, lens, lighting, and composition language where useful.';
    case 'cinematic':
      return 'Preserve the scene but add cinematic camera, lens, lighting, and composition language.';
    case 'detail':
      return 'Enrich the prompt with more descriptive detail without changing the core subject.';
    case 'simplify':
      return 'Make the prompt shorter, clearer, and more direct while retaining the core idea.';
    case 'explain':
      return 'Explain how to prompt this image model effectively. Suggest what the user should try. Do not modify the prompt itself if it is empty.';
  }
}

function firstJsonObject(text: string): string | undefined {
  const start = text.indexOf('{');
  if (start === -1) return undefined;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return text.slice(start, i + 1);
  }

  return undefined;
}

export function extractWizardJson(content: string): unknown | undefined {
  const trimmed = content.trim();
  const candidates = [
    trimmed,
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(),
    firstJsonObject(trimmed),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next extraction strategy.
    }
  }

  return undefined;
}

function safeWizardResult(mode: WizardMode, parsed: any, rawText: string): PromptWizardResult {
  const result: PromptWizardResult = {
    mode,
    improvedPrompt: typeof parsed?.improvedPrompt === 'string' ? parsed.improvedPrompt : undefined,
    negativePrompt: typeof parsed?.negativePrompt === 'string' ? parsed.negativePrompt : undefined,
    reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning : undefined,
    modelTips: Array.isArray(parsed?.modelTips) ? parsed.modelTips.filter((tip: unknown) => typeof tip === 'string') : [],
    variants: Array.isArray(parsed?.variants)
      ? parsed.variants
          .filter((variant: any) => typeof variant?.label === 'string' && typeof variant?.prompt === 'string')
          .map((variant: any) => ({ label: variant.label, prompt: variant.prompt }))
      : [],
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.filter((warning: unknown) => typeof warning === 'string') : [],
    rawText,
  };

  if (!result.reasoning && rawText) {
    result.reasoning = 'The wizard returned unstructured text, so MokkyGen preserved the useful response instead of failing.';
  }
  if (!result.improvedPrompt && mode !== 'explain' && rawText) {
    result.improvedPrompt = rawText.trim();
  }

  return result;
}

export async function improvePrompt(apiKey: string, params: PromptWizardParams): Promise<PromptWizardResult> {
  const { wizardModel, prompt, imageModel, mode } = params;
  const modelInfo = IMAGE_MODEL_GUIDES[imageModel] || IMAGE_MODEL_GUIDES.default;
  const endpoint = `${OR_BASE}/chat/completions`;

  const systemPrompt = `You are the MokkyGen Prompt Wizard.
The user wants to generate an image using this model: ${imageModel}.
This model is known for: ${modelInfo.strengths}.
Its ideal prompt style is: ${modelInfo.promptStyle}.

Your task: ${wizardInstruction(mode)}

Constraints:
- Preserve the user's core idea.
- Do not invent people, brands, copyrighted characters, celebrities, or private details unless asked.
- Do not over-stuff with meaningless quality words.
- Make prompts practical.
- Keep output concise.
- Use British or South African English.
- Output JSON only if possible, shaped like:
{
  "mode": "${mode}",
  "improvedPrompt": "string",
  "negativePrompt": "string",
  "reasoning": "string",
  "modelTips": ["string"],
  "variants": [{"label": "label", "prompt": "variant prompt"}],
  "warnings": ["string"]
}`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MokkyGen Prompt Wizard',
    },
    body: JSON.stringify({
      model: wizardModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current prompt: "${prompt}"\nMode: ${mode}` },
      ],
      stream: false,
    }),
  });

  if (!resp.ok) {
    throw await parseErrorResponse(resp, endpoint, wizardModel);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = extractWizardJson(content);
  return safeWizardResult(mode, parsed, content);
}
