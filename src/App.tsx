import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Download, History, Image as ImageIcon, Loader2, Maximize2, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  computeCreditDisplay,
  generateImage,
  getGenerationMetadata,
  getKeyInfo,
  OpenRouterKeyInfo,
  ORGenerationResult,
  technicalDetails,
  type OpenRouterErrorDetails,
} from './lib/openrouter';
import { MODELS, STYLES, THEMES, type ImageModel } from './lib/constants';
import { ModelSelector } from './components/ModelSelector';
import { PromptWizard } from './components/PromptWizard';
import { ImageViewer, type ViewableImage } from './components/ImageViewer';
import { TechnicalDetails } from './components/TechnicalDetails';
import { migrateJson, writeJson } from './lib/storage';

const HISTORY_KEY = 'mokkygen_gen_history';
const API_KEY = 'mokkygen_api_key';
const MAX_HISTORY = 50;

interface GenHistory extends ORGenerationResult {
  prompt: string;
  modelName: string;
  timestamp: number;
}

type ActiveTab = 'create' | 'history';
type GenerationMode = 'single' | 'compare';
type CompareStatus = 'idle' | 'loading' | 'success' | 'error';

interface CompareResult {
  model: ImageModel;
  status: CompareStatus;
  result?: GenHistory;
  error?: string;
  errorDetails?: OpenRouterErrorDetails;
}

function getModel(modelId: string): ImageModel {
  return MODELS.find((item) => item.id === modelId) || MODELS[0];
}

function historyFromResult(result: ORGenerationResult, prompt: string): GenHistory {
  const modelInfo = getModel(result.model);
  return {
    ...result,
    prompt,
    modelName: modelInfo.name,
    timestamp: result.createdAt ?? Date.now(),
  };
}

function friendlyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'OpenRouter request failed.';
}

function formatDuration(durationMs?: number): string {
  if (durationMs === undefined) return '';
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function toViewable(item: GenHistory): ViewableImage {
  return {
    imageUrl: item.imageUrl,
    modelName: item.modelName,
    prompt: item.prompt,
    timestamp: item.timestamp,
    durationMs: item.durationMs,
    cost: item.cost,
  };
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => {
    const stored = localStorage.getItem(API_KEY);
    if (stored) return stored;
    const old = localStorage.getItem('or_api_key');
    if (old) {
      localStorage.setItem(API_KEY, old);
      return old;
    }
    return '';
  });
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [keyInfo, setKeyInfo] = useState<OpenRouterKeyInfo | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  const [model, setModel] = useState(MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('single');
  const [compareModelIds, setCompareModelIds] = useState<string[]>([MODELS[0].id, MODELS[1].id]);
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<OpenRouterErrorDetails | undefined>();
  const [genHistory, setGenHistory] = useState<GenHistory[]>(() => migrateJson<GenHistory[]>(HISTORY_KEY, 'or_gen_history', []).slice(0, MAX_HISTORY));
  const [activeTab, setActiveTab] = useState<ActiveTab>('create');
  const [viewerItem, setViewerItem] = useState<ViewableImage | null>(null);

  const selectedModel = getModel(model);
  const creditDisplay = useMemo(() => (keyInfo ? computeCreditDisplay(keyInfo) : null), [keyInfo]);
  const hasPaidCompareModels = compareModelIds.some((id) => !getModel(id).isFree);
  const compareLowBalance = creditDisplay?.remaining !== null && creditDisplay?.remaining !== undefined && creditDisplay.remaining < 1;

  const setHistoryCapped = (updater: (previous: GenHistory[]) => GenHistory[]) => {
    setGenHistory((previous) => updater(previous).slice(0, MAX_HISTORY));
  };

  const refreshKeyInfo = async (key = apiKey) => {
    if (!key) {
      setIsKeyValid(false);
      setKeyInfo(null);
      return;
    }

    setKeyLoading(true);
    try {
      const info = await getKeyInfo(key);
      setKeyInfo(info);
      setIsKeyValid(true);
      setError(null);
      setErrorDetails(undefined);
    } catch (err) {
      setIsKeyValid(false);
      setKeyInfo(null);
      setError('OpenRouter API key could not be validated. Check the key and try again.');
      setErrorDetails(technicalDetails(err));
    } finally {
      setKeyLoading(false);
    }
  };

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY, apiKey);
      refreshKeyInfo(apiKey);
    } else {
      setIsKeyValid(false);
      setKeyInfo(null);
    }
  }, [apiKey]);

  useEffect(() => {
    writeJson(HISTORY_KEY, genHistory.slice(0, MAX_HISTORY));
  }, [genHistory]);

  const updateGenerationMetadata = async (generationId: string) => {
    try {
      const metadata = await getGenerationMetadata(apiKey, generationId);
      if (metadata) {
        setHistoryCapped((previous) =>
          previous.map((item) =>
            item.id === generationId
              ? {
                  ...item,
                  cost: metadata.cost ?? item.cost,
                  providerName: metadata.providerName ?? item.providerName,
                  generationTime: metadata.generationTime ?? item.generationTime,
                  createdAt: metadata.createdAt ?? item.createdAt,
                }
              : item
          )
        );
        setCompareResults((previous) =>
          previous.map((item) =>
            item.result?.id === generationId
              ? {
                  ...item,
                  result: {
                    ...item.result,
                    cost: metadata.cost ?? item.result.cost,
                    providerName: metadata.providerName ?? item.result.providerName,
                    generationTime: metadata.generationTime ?? item.result.generationTime,
                    createdAt: metadata.createdAt ?? item.result.createdAt,
                  },
                }
              : item
          )
        );
      }
    } catch (err) {
      console.warn('Generation metadata lookup failed', err);
    } finally {
      refreshKeyInfo();
    }
  };

  const handleGenerate = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (generationMode === 'compare') {
      await handleCompareGenerate();
      return;
    }
    if (!apiKey || !isKeyValid) {
      setError('Please provide a valid OpenRouter API key first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }

    setError(null);
    setErrorDetails(undefined);
    setIsGenerating(true);

    try {
      const result = await generateImage(apiKey, {
        model,
        prompt,
        modalities: selectedModel.preferredModalities,
      });
      const newGen = historyFromResult(result, prompt);
      setHistoryCapped((previous) => [newGen, ...previous]);
      refreshKeyInfo();
      window.setTimeout(() => updateGenerationMetadata(result.id), 2500);
    } catch (err) {
      setError(friendlyError(err));
      setErrorDetails(technicalDetails(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompareGenerate = async () => {
    if (!apiKey || !isKeyValid) {
      setError('Please provide a valid OpenRouter API key first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (compareModelIds.length === 0) {
      setError('Select at least one model to compare.');
      return;
    }

    setError(null);
    setErrorDetails(undefined);
    const selectedModels = compareModelIds.map(getModel);
    setCompareResults(selectedModels.map((item) => ({ model: item, status: 'loading' })));
    setIsGenerating(true);

    await Promise.all(
      selectedModels.map(async (item) => {
        try {
          const result = await generateImage(apiKey, {
            model: item.id,
            prompt,
            modalities: item.preferredModalities,
          });
          const historyItem = historyFromResult(result, prompt);
          setCompareResults((previous) => previous.map((entry) => (entry.model.id === item.id ? { model: item, status: 'success', result: historyItem } : entry)));
          setHistoryCapped((previous) => [historyItem, ...previous]);
          window.setTimeout(() => updateGenerationMetadata(result.id), 2500);
        } catch (err) {
          setCompareResults((previous) =>
            previous.map((entry) =>
              entry.model.id === item.id
                ? {
                    model: item,
                    status: 'error',
                    error: friendlyError(err),
                    errorDetails: technicalDetails(err),
                  }
                : entry
            )
          );
        }
      })
    );

    refreshKeyInfo();
    setIsGenerating(false);
  };

  const appendToPrompt = (text: string) => {
    setPrompt((previous) => {
      const separator = previous.endsWith(',') || previous.trim() === '' ? ' ' : ', ';
      return previous.trim() + separator + text;
    });
  };

  const toggleCompareModel = (modelId: string) => {
    setCompareModelIds((previous) => {
      if (previous.includes(modelId)) return previous.filter((id) => id !== modelId);
      if (previous.length >= 4) return previous;
      return [...previous, modelId];
    });
  };

  const ErrorToast = () =>
    error ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="z-50 max-w-full rounded border border-red-500/30 bg-[#1a0000] px-4 py-3 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500"></div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-red-200">{error}</span>
            <TechnicalDetails details={errorDetails} />
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[10px] font-bold uppercase text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      </motion.div>
    ) : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-[#e0e0e0] selection:bg-indigo-500/30">
      <header className="flex min-h-16 shrink-0 flex-col gap-3 border-b border-white/10 bg-[#0a0a0a] px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500">
            <span className="text-xs font-bold italic text-white">OR</span>
          </div>
          <h1 className="text-xl font-serif italic tracking-tight text-white">
            Mokky<span className="text-xs font-sans not-italic uppercase tracking-widest text-indigo-400 opacity-80">Gen</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          {creditDisplay && (
            <div className={`rounded border px-3 py-2 text-xs ${creditDisplay.isLow ? 'border-amber-500/35 bg-amber-500/10 text-amber-100' : 'border-white/10 bg-white/5 text-white/75'}`}>
              <div className="font-mono font-semibold">{creditDisplay.title}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-widest text-white/40">{creditDisplay.usageMonthly}</div>
              {creditDisplay.isLow && <div className="mt-1 text-[10px] text-amber-200">Low balance. Paid models may fail.</div>}
            </div>
          )}
          <div className="relative">
            <input
              type="password"
              placeholder="OpenRouter API Key"
              className="w-48 rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-9 text-xs text-white/70 focus:border-indigo-500 focus:outline-none"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            {keyLoading ? (
              <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-indigo-300" />
            ) : isKeyValid ? (
              <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-emerald-400" />
            ) : (
              <button onClick={() => refreshKeyInfo()} className="absolute right-2 top-2 text-[10px] font-bold uppercase text-indigo-300">
                Update
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('create')} className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'create' ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300' : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'}`}>
              Create
            </button>
            <button onClick={() => setActiveTab('history')} className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300' : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'}`}>
              Gallery
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {activeTab === 'create' ? (
          <>
            <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/10 bg-[#080808] p-4 lg:w-80 lg:p-6">
              <section>
                <span className="mb-3 block text-[11px] uppercase tracking-[0.2em] text-white/40">Generation Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['single', 'compare'] as GenerationMode[]).map((mode) => (
                    <button key={mode} onClick={() => setGenerationMode(mode)} className={`rounded border px-3 py-2 text-xs font-bold uppercase tracking-widest ${generationMode === mode ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'}`}>
                      {mode === 'single' ? 'Single Model' : 'Compare Models'}
                    </button>
                  ))}
                </div>
              </section>

              {generationMode === 'single' ? (
                <section>
                  <span className="mb-3 block text-[11px] uppercase tracking-[0.2em] text-white/40">Image Model</span>
                  <ModelSelector selectedModel={model} onSelect={setModel} />
                </section>
              ) : (
                <section>
                  <span className="mb-3 block text-[11px] uppercase tracking-[0.2em] text-white/40">Compare Models ({compareModelIds.length}/4)</span>
                  <div className="mb-3 rounded border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                    Compare mode sends the same prompt to each selected model. This may use more OpenRouter credits.
                    {hasPaidCompareModels && <div className="mt-2 font-semibold">Selected paid models may use credits.</div>}
                    {compareLowBalance && <div className="mt-2 font-semibold">Balance is below $1.00. Paid models may fail.</div>}
                  </div>
                  <div className="grid gap-2">
                    {MODELS.map((item) => {
                      const selected = compareModelIds.includes(item.id);
                      const disabled = !selected && compareModelIds.length >= 4;
                      return (
                        <button key={item.id} disabled={disabled} onClick={() => toggleCompareModel(item.id)} className={`rounded border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selected ? 'border-indigo-500/50 bg-indigo-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm text-white/85">{item.name}</span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono ${item.isFree ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{item.isFree ? 'Free' : 'Paid'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <label className="mb-3 block text-[11px] uppercase tracking-[0.2em] text-white/40">Styles</label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((item) => (
                    <button key={item} onClick={() => appendToPrompt(item)} className="truncate rounded border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/70 hover:border-indigo-500/50">
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <label className="mb-3 block text-[11px] uppercase tracking-[0.2em] text-white/40">Themes</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((item) => (
                    <button key={item} onClick={() => appendToPrompt(item)} className="truncate rounded border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[10px] text-white/70 hover:border-indigo-500/50">
                      {item}
                    </button>
                  ))}
                </div>
              </section>

              <div className="mt-auto rounded border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-white/45">
                <div className="flex items-center justify-between">
                  <span>Generation History</span>
                  <span className="font-mono text-indigo-300">{genHistory.length}/50</span>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed">
                  <span className="font-semibold text-white/55">Free model limits:</span> `:free` variants are limited to 20 requests/minute. Keys with less than 10 purchased credits may have much lower daily free-model limits; keys with at least 10 credits may have higher daily limits.
                </p>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-hidden p-4 md:p-8">
              <form onSubmit={handleGenerate} className="flex shrink-0 flex-col rounded-xl border border-white/10 bg-[#0a0a0a] p-4 shadow-2xl transition-colors focus-within:border-indigo-500/50 md:p-6">
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the scene you want to bring to life..." className="h-24 w-full resize-none border-none bg-transparent text-lg font-serif italic text-white placeholder:text-white/20 focus:outline-none focus:ring-0" disabled={isGenerating} />
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
                  <div className="hidden text-[10px] uppercase text-white/40 sm:block">Shift + Enter for new line</div>
                  <button type="submit" disabled={isGenerating || !prompt.trim()} className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isGenerating ? 'Generating...' : generationMode === 'compare' ? 'Compare' : 'Generate'}
                  </button>
                </div>
              </form>

              <PromptWizard apiKey={apiKey} isKeyValid={isKeyValid} currentPrompt={prompt} selectedImageModel={model} onReplacePrompt={setPrompt} onAppendPrompt={appendToPrompt} />

              <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-xl border border-white/5 bg-[#080808]">
                <AnimatePresence>
                  {error && (
                    <div className="absolute bottom-4 right-4 z-50 max-w-[90%] md:bottom-8 md:right-8">
                      <ErrorToast />
                    </div>
                  )}
                </AnimatePresence>

                {generationMode === 'compare' ? (
                  <div className="h-full overflow-y-auto p-4">
                    {compareResults.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center text-white/25">
                        <div>
                          <Sparkles className="mx-auto mb-4 h-10 w-10" />
                          <p className="font-serif italic text-xl">Compare selected models with one prompt.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {compareResults.map((entry) => (
                          <div key={entry.model.id} className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a]">
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 p-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm text-white/85">{entry.model.name}</div>
                                <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/35">
                                  <span>{entry.model.isFree ? 'Free' : 'Paid'}</span>
                                  <span>{entry.status}</span>
                                  {entry.result?.modalityFallbackUsed && <span className="text-amber-300">Used image-only mode</span>}
                                </div>
                              </div>
                              <button onClick={() => setModel(entry.model.id)} className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase text-white/55 hover:bg-white/10">
                                Set Main
                              </button>
                            </div>
                            <div className="flex flex-1 items-center justify-center bg-[#111] p-3">
                              {entry.status === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-indigo-300" />}
                              {entry.status === 'error' && (
                                <div className="text-xs text-red-200">
                                  <AlertCircle className="mb-3 h-6 w-6 text-red-400" />
                                  <p>{entry.error}</p>
                                  <TechnicalDetails details={entry.errorDetails} />
                                </div>
                              )}
                              {entry.result?.imageUrl && (
                                <button onClick={() => setViewerItem(toViewable(entry.result!))} className="h-full w-full">
                                  <img src={entry.result.imageUrl} alt={entry.result.prompt} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                </button>
                              )}
                              {entry.result && !entry.result.imageUrl && <pre className="max-h-full overflow-auto whitespace-pre-wrap text-xs text-white/55">{entry.result.content}</pre>}
                            </div>
                          {entry.result && (
                            <div className="flex items-center justify-between gap-2 border-t border-white/5 p-3 text-[10px] uppercase tracking-widest text-white/40">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(entry.result.durationMs)}
                                </span>
                                {entry.result.cost !== undefined && <span className="font-mono text-emerald-300">${entry.result.cost.toFixed(4)}</span>}
                                {entry.result.imageUrl && (
                                  <button onClick={() => setViewerItem(toViewable(entry.result!))} className="flex items-center gap-1 text-indigo-300 hover:text-indigo-200">
                                    <Maximize2 className="h-3 w-3" />
                                    View
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {isGenerating ? (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex items-center justify-center bg-[#080808]">
                        <div className="px-4 text-center opacity-70">
                          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-t-2 border-indigo-500"></div>
                          <p className="font-serif italic text-xl text-white">Generating your image...</p>
                        </div>
                      </motion.div>
                    ) : genHistory.length > 0 ? (
                      <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center p-4">
                        <button onClick={() => genHistory[0].imageUrl && setViewerItem(toViewable(genHistory[0]))} className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-[#1a1a1a] shadow-inner">
                          {genHistory[0].imageUrl ? (
                            <>
                              <img src={genHistory[0].imageUrl} alt="Generated" loading="lazy" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                              <span className="absolute right-4 top-4 rounded bg-black/60 p-2 text-white/70 opacity-0 transition-opacity hover:text-white group-hover:opacity-100">
                                <Maximize2 className="h-4 w-4" />
                              </span>
                            </>
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center overflow-auto break-words bg-[#1e1e1e] p-8 text-center font-mono text-sm text-white/90">
                              <ImageIcon className="mb-4 h-8 w-8 text-white/30" />
                              <span className="mb-2 block text-xs uppercase tracking-widest text-white/50">Text Output / URL Extractor Fallback</span>
                              <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-black/50 p-4 text-left">{genHistory[0].content}</div>
                            </div>
                          )}
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center opacity-20">
                        <div className="px-4 text-center">
                          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20">
                            <ImageIcon className="h-5 w-5 text-white/50" />
                          </div>
                          <p className="font-serif italic text-xl">The canvas awaits...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto bg-[#080808] p-4 md:p-8">
            {error && (
              <div className="mb-6">
                <ErrorToast />
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {genHistory.length === 0 ? (
                <div className="col-span-full py-24 text-center text-white/30">
                  <History className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="font-serif italic text-xl">No generation history found.</p>
                </div>
              ) : (
                genHistory.map((gen, index) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} key={`${gen.id}-${index}`} className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0a] shadow-xl transition-colors hover:border-white/20">
                    <button onClick={() => gen.imageUrl && setViewerItem(toViewable(gen))} className="relative flex aspect-square flex-col items-center justify-center bg-[#111] p-4">
                      {gen.imageUrl ? <img src={gen.imageUrl} alt="Generated" loading="lazy" className="h-full w-full rounded-lg object-contain" referrerPolicy="no-referrer" /> : <div className="line-clamp-6 h-full w-full overflow-hidden break-all p-4 text-left font-mono text-xs text-white/40">{gen.content}</div>}
                      {gen.imageUrl && (
                        <span className="absolute right-4 top-4 rounded-lg border border-indigo-500/50 bg-indigo-600 p-2 text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                          <Maximize2 className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                    <div className="flex flex-1 flex-col border-t border-white/5 p-4">
                      <p className="mb-4 line-clamp-2 flex-1 font-serif text-xs italic text-white/80" title={gen.prompt}>
                        "{gen.prompt}"
                      </p>
                      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 text-[10px] uppercase tracking-widest text-white/40">
                        <span className="truncate" title={gen.modelName}>
                          {gen.modelName}
                        </span>
                        <div className="flex shrink-0 items-center gap-2 pl-2">
                          {gen.durationMs !== undefined && <span>{formatDuration(gen.durationMs)}</span>}
                          {gen.cost !== undefined && <span className="font-mono font-semibold text-emerald-400">${gen.cost.toFixed(4)}</span>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-white/5 bg-[#050505] px-6 text-[10px] uppercase tracking-[0.1em] text-white/30">
        <div className="flex gap-4">
          <span>Session: {isKeyValid ? 'Active' : 'Inactive'}</span>
          {isGenerating && <span className="text-indigo-400">Processing...</span>}
        </div>
        <div className="flex min-w-0 gap-4">
          <span className="truncate">Model: {activeTab === 'create' ? selectedModel.name : 'Gallery View'}</span>
          <span className="hidden text-indigo-400/50 md:inline">Engine: OpenRouter</span>
        </div>
      </footer>

      <ImageViewer item={viewerItem} onClose={() => setViewerItem(null)} />
    </div>
  );
}
