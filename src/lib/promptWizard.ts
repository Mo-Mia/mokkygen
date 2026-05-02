export const WIZARD_MODELS = [
  { id: 'minimax/minimax-m2.5:free', label: 'MiniMax M2.5 (Default)' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (Fallback)' },
  { id: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air (Fast)' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super (Deep)' },
];

export const IMAGE_MODEL_GUIDES: Record<string, { strengths: string, promptStyle: string }> = {
  'openai/gpt-5.4-image-2': {
    strengths: 'instruction following, prompt accuracy, coherent photorealistic scenes, detailed composition, text/layout handling',
    promptStyle: 'clear natural language, explicit subject, environment, lighting, camera/composition, constraints, and what to avoid'
  },
  'google/gemini-3.1-flash-image-preview': {
    strengths: 'fast iteration, strong semantic understanding, visual reasoning, edits, scene relationships',
    promptStyle: 'describe intent, object relationships, composition, reference constraints, and desired mood'
  },
  'sourceful/riverflow-v2-pro': {
    strengths: 'stylised and production-ready creative outputs',
    promptStyle: 'concise but visually specific prompts with subject, medium, style, palette, and composition'
  },
  'sourceful/riverflow-v2-fast': {
    strengths: 'quick drafts and fast iteration',
    promptStyle: 'short, direct, clear prompts'
  },
  'sourceful/riverflow-v2-max-preview': {
    strengths: 'high quality preview outputs for polished creative image generation',
    promptStyle: 'visually specific prompts with subject, style, palette, lighting, and composition'
  },
  'sourceful/riverflow-v2-standard-preview': {
    strengths: 'balanced preview outputs for general creative image generation',
    promptStyle: 'clear prompts with subject, medium, setting, and visual finish'
  },
  'sourceful/riverflow-v2-fast-preview': {
    strengths: 'fast preview outputs for quick iteration',
    promptStyle: 'short, direct prompts with the main subject and style clearly stated'
  },
  'black-forest-labs/flux.2-klein-4b': {
    strengths: 'fast lightweight image generation',
    promptStyle: 'compact prompts with clear subject and style'
  },
  'bytedance/seedream-4.5': {
    strengths: 'creative scene generation and polished images',
    promptStyle: 'descriptive natural language with clear subject, setting, style and quality target'
  },
  'black-forest-labs/flux.2-max': {
    strengths: 'high quality creative and photorealistic image generation',
    promptStyle: 'visually rich prompts, composition, lighting, camera details'
  },
  'black-forest-labs/flux.2-flex': {
    strengths: 'flexible style control',
    promptStyle: 'specify style, medium, colour palette, and desired finish'
  },
  'black-forest-labs/flux.2-pro': {
    strengths: 'polished high quality outputs',
    promptStyle: 'clear descriptive prompts with subject, environment, lighting and composition'
  },
  'google/gemini-3.0-pro-image-preview': {
    strengths: 'high quality semantic image generation and reasoning',
    promptStyle: 'descriptive and structured with clear constraints'
  },
  'openai/gpt-5-image-mini': {
    strengths: 'efficient OpenAI image generation',
    promptStyle: 'clear, plain-language instructions'
  },
  'openai/gpt-5-image': {
    strengths: 'strong general image generation, prompt following and composition',
    promptStyle: 'detailed natural language with subject, scene, style, lighting and constraints'
  },
  'google/gemini-2.5-flash-image': {
    strengths: 'fast image generation and iteration',
    promptStyle: 'clear scene description, object relationships and intended style'
  },
  default: {
    strengths: 'general image generation',
    promptStyle: 'clear natural language with subject, setting, visual style, lighting, composition, and practical constraints'
  }
};
