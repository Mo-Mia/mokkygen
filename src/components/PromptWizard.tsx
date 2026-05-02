import React, { useState } from 'react';
import { improvePrompt, isGuardrailOrNoEndpointError, PromptWizardResult, technicalDetails, type OpenRouterErrorDetails, type WizardMode } from '../lib/openrouter';
import { WIZARD_MODELS } from '../lib/promptWizard';
import { Sparkles, Loader2, AlertCircle, Copy, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TechnicalDetails } from './TechnicalDetails';

interface PromptWizardProps {
  apiKey: string;
  isKeyValid: boolean;
  currentPrompt: string;
  selectedImageModel: string;
  onReplacePrompt: (prompt: string) => void;
  onAppendPrompt: (prompt: string) => void;
}

export function PromptWizard({
  apiKey,
  isKeyValid,
  currentPrompt,
  selectedImageModel,
  onReplacePrompt,
  onAppendPrompt
}: PromptWizardProps) {
  const [wizardModel, setWizardModel] = useState(() => {
    const stored = localStorage.getItem('mokkygen_wizard_model');
    if (stored) return stored;
    const old = localStorage.getItem('openview_wizard_model');
    if (old) {
      localStorage.setItem('mokkygen_wizard_model', old);
      return old;
    }
    return WIZARD_MODELS[0].id;
  });
  const [loadingMode, setLoadingMode] = useState<WizardMode | null>(null);
  const [result, setResult] = useState<PromptWizardResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<OpenRouterErrorDetails | undefined>();
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWizardModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setWizardModel(val);
    localStorage.setItem('mokkygen_wizard_model', val);
  };

  const handleRunWizard = async (mode: WizardMode) => {
    if (!isKeyValid || !apiKey) return;
    if (!currentPrompt.trim() && mode !== 'explain') {
      setError('Please enter a rough idea in the prompt box first.');
      return;
    }

    setLoadingMode(mode);
    setResult(null);
    setError(null);
    setErrorDetails(undefined);
    setFallbackUsed(false);

    try {
      let res: PromptWizardResult;
      let primaryError: unknown;
      try {
        res = await improvePrompt(apiKey, {
          wizardModel,
          prompt: currentPrompt,
          imageModel: selectedImageModel,
          mode
        });
      } catch (err: any) {
        primaryError = err;
        // Fallback logic
        console.warn('Primary wizard failed, trying fallback:', err);
        const fallbackModel = WIZARD_MODELS[1].id;
        
        if (wizardModel === fallbackModel) throw err; // Don't fallback to same model
        
        setFallbackUsed(true);
        res = await improvePrompt(apiKey, {
          wizardModel: fallbackModel,
          prompt: currentPrompt,
          imageModel: selectedImageModel,
          mode
        });
      }
      setResult(res);
      if (primaryError) {
        setErrorDetails(technicalDetails(primaryError));
      }
    } catch (err: any) {
      setError(
        isGuardrailOrNoEndpointError(err)
          ? 'This wizard model is not available under your current OpenRouter provider/privacy settings. Try another wizard model, or review your OpenRouter privacy settings.'
          : err.message || 'Wizard failed to generate a response.'
      );
      setErrorDetails(technicalDetails(err));
    } finally {
      setLoadingMode(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ActionButton = ({ mode, label, disabled }: { mode: WizardMode, label: string, disabled?: boolean }) => (
    <button
      onClick={() => handleRunWizard(mode)}
      disabled={disabled || loadingMode !== null || !isKeyValid}
      className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-indigo-500/10 text-white/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
    >
      {loadingMode === mode && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </button>
  );

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-xl p-4 shrink-0 flex flex-col gap-4 mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white/80">Prompt Wizard</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Model:</span>
          <select 
            value={wizardModel}
            onChange={handleWizardModelChange}
            className="bg-[#1a1a1a] border border-white/10 rounded text-[10px] text-white/60 p-1 focus:outline-none focus:border-indigo-500"
          >
            {WIZARD_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton mode="improve" label="Improve" disabled={!currentPrompt.trim()} />
        <ActionButton mode="photorealistic" label="Photorealistic" disabled={!currentPrompt.trim()} />
        <ActionButton mode="cinematic" label="Cinematic" disabled={!currentPrompt.trim()} />
        <ActionButton mode="detail" label="Add Detail" disabled={!currentPrompt.trim()} />
        <ActionButton mode="simplify" label="Simplify" disabled={!currentPrompt.trim()} />
        <ActionButton mode="explain" label="Explain Model" />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="text-red-400 text-xs flex items-center gap-2 bg-red-400/10 p-2 rounded border border-red-400/20"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{error}</p>
              <TechnicalDetails details={errorDetails} />
            </div>
          </motion.div>
        )}

        {result && !loadingMode && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex flex-col gap-4 bg-black/40 p-4 rounded-lg border border-white/5"
          >
            {fallbackUsed && (
              <div className="text-[10px] text-amber-500/80 italic flex items-center gap-1 -mb-2">
                <AlertCircle className="w-3 h-3" />
                Default model failed; used fallback model.
              </div>
            )}
            {fallbackUsed && errorDetails && <TechnicalDetails details={errorDetails} />}

            {result.reasoning && (
              <div className="text-xs text-white/60 italic">
                {result.reasoning}
              </div>
            )}

            {result.improvedPrompt && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Improved Prompt</span>
                <div className="bg-white/5 p-3 rounded text-sm text-white/90 font-serif border border-white/10 group relative">
                  {result.improvedPrompt}
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button 
                      onClick={() => handleCopy(result.improvedPrompt!)}
                      className="p-1.5 bg-black/50 hover:bg-black rounded text-white/60 hover:text-white transition-colors"
                      title="Copy string"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => onReplacePrompt(result.improvedPrompt!)}
                      className="p-1.5 flex items-center gap-1 bg-indigo-500/20 hover:bg-indigo-500/40 rounded text-indigo-300 transition-colors text-[10px] font-bold uppercase tracking-wider"
                    >
                      Replace
                    </button>
                    <button 
                      onClick={() => onAppendPrompt(result.improvedPrompt!)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white/70 transition-colors"
                      title="Append to current prompt"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {result.negativePrompt && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider">Negative Prompt (Things to avoid)</span>
                <p className="text-xs text-white/50">{result.negativePrompt}</p>
              </div>
            )}

            {result.modelTips && result.modelTips.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">Tips for {selectedImageModel.split('/')[1]}</span>
                <ul className="list-disc list-inside text-xs text-white/50 space-y-1">
                  {result.modelTips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.variants && result.variants.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Alternative Variants</span>
                <div className="grid gap-2">
                  {result.variants.map((v, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/5 p-2 rounded text-xs flex flex-col gap-1">
                      <span className="font-bold text-white/60">{v.label}</span>
                      <div className="text-white/80 font-serif italic">{v.prompt}</div>
                      <div className="flex gap-2 justify-end mt-1">
                        <button onClick={() => onReplacePrompt(v.prompt)} className="text-[10px] text-indigo-400 hover:text-indigo-300">Use this</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 p-2 rounded mt-2">
                <ul className="list-disc list-inside text-[10px] text-red-400/80 space-y-1">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="text-[9px] text-white/20 uppercase tracking-widest text-center">
        Uses your OpenRouter key. Prompts stay directly between you and openrouter.
      </div>
    </div>
  );
}
