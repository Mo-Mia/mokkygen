import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, Filter } from 'lucide-react';
import { MODELS } from '../lib/constants';

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

const getProviderDomain = (provider: string) => {
  const map: Record<string, string> = {
    'openai': 'openai.com',
    'google': 'google.com',
    'sourceful': 'sourceful.com',
    'black-forest-labs': 'blackforestlabs.ai',
    'bytedance-seed': 'bytedance.com'
  };
  return map[provider] || 'example.com';
};

export function ModelSelector({ selectedModel, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);

  const selected = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  const filteredModels = MODELS.filter(m => {
    if (freeOnly && !m.isFree) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.provider.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full text-left px-3 py-2.5 rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors flex flex-col gap-1"
      >
        <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Selected Model</span>
        <div className="flex items-start justify-between w-full gap-2 mt-1">
          <img 
            src={`https://www.google.com/s2/favicons?domain=${getProviderDomain(selected.provider)}&sz=64`}
            alt={selected.provider}
            className="w-4 h-4 rounded object-contain shrink-0 mt-0.5"
          />
          <span className="font-medium text-left leading-tight break-words flex-1 text-white/90">{selected.name}</span>
          <span className="shrink-0 text-xs text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">
            {selected.isFree ? 'Free' : `$${selected.inputCost}/M`}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 md:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-xl font-serif italic text-white">Select Image Model</h2>
                  <p className="text-xs text-white/40 mt-1">Choose an AI model for your next masterpiece.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search models..." 
                      className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-48"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setFreeOnly(!freeOnly)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${freeOnly ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Free Only</span>
                  </button>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 md:p-6">
                <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 pb-2 text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5 mb-4">
                  <div>Model Name</div>
                  <div>Tokens</div>
                  <div>Input ($/M)</div>
                  <div>Output ($/M)</div>
                  <div>Context</div>
                  <div>Released</div>
                </div>

                <div className="space-y-2">
                  {filteredModels.length === 0 ? (
                    <div className="text-center py-12 text-white/40 italic font-serif">No models found matching your criteria.</div>
                  ) : (
                    filteredModels.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => { onSelect(m.id); setIsOpen(false); }}
                        className={`group w-full text-left grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 lg:gap-4 px-4 py-3 sm:py-4 rounded-xl border transition-all items-center ${selectedModel === m.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedModel === m.id ? (
                            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border border-indigo-500/50 bg-indigo-500/20">
                              <Check className="w-3 h-3 text-indigo-400" />
                            </div>
                          ) : (
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${getProviderDomain(m.provider)}&sz=64`}
                              alt={m.provider}
                              className="w-5 h-5 rounded object-contain shrink-0 grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white/90">{m.name}</span>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{m.provider}</span>
                          </div>
                        </div>

                        <div className="text-xs text-white/60 flex justify-between lg:block">
                          <span className="lg:hidden text-[10px] uppercase text-white/40 tracking-wider">Tokens:</span>
                          {m.tokens}
                        </div>
                        <div className="text-xs font-mono text-emerald-400 flex justify-between lg:block">
                          <span className="lg:hidden text-[10px] uppercase text-white/40 tracking-wider font-sans">Input:</span>
                          {m.isFree ? 'Free' : `$${typeof m.inputCost === 'number' ? m.inputCost.toFixed(2) : m.inputCost}`}
                        </div>
                        <div className="text-xs font-mono text-emerald-400 flex justify-between lg:block">
                          <span className="lg:hidden text-[10px] uppercase text-white/40 tracking-wider font-sans">Output:</span>
                          {m.isFree ? 'Free' : `$${typeof m.outputCost === 'number' ? m.outputCost.toFixed(2) : m.outputCost}`}
                        </div>
                        <div className="text-xs text-white/60 font-mono flex justify-between lg:block">
                          <span className="lg:hidden text-[10px] uppercase text-white/40 tracking-wider font-sans">Context:</span>
                          {m.context}
                        </div>
                        <div className="text-xs text-white/60 flex justify-between lg:block">
                          <span className="lg:hidden text-[10px] uppercase text-white/40 tracking-wider font-sans">Released:</span>
                          {m.released}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
