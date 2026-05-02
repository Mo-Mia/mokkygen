import { useState } from 'react';
import { Copy, Download, ExternalLink, Share2, X } from 'lucide-react';
import { downloadImage, shareImage, copyText } from '../lib/media';

export interface ViewableImage {
  imageUrl?: string;
  modelName: string;
  prompt: string;
  timestamp: number;
  durationMs?: number;
  cost?: number;
}

interface ImageViewerProps {
  item: ViewableImage | null;
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function ImageViewer({ item, onClose }: ImageViewerProps) {
  const [message, setMessage] = useState<string | null>(null);
  if (!item || !item.imageUrl) return null;

  const handleResult = async (action: Promise<{ message: string }>) => {
    const result = await action;
    setMessage(result.message);
    window.setTimeout(() => setMessage(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/95 text-white">
      <div className="flex min-h-14 items-center justify-between border-b border-white/10 px-4 md:px-6">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{item.modelName}</div>
          <div className="text-[11px] text-white/45">{formatDate(item.timestamp)}</div>
        </div>
        <button onClick={onClose} className="rounded p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close viewer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-[45vh] flex-1 items-center justify-center bg-black p-3 lg:min-h-0">
          <img src={item.imageUrl} alt={item.prompt} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
        </div>

        <aside className="max-h-[45vh] overflow-y-auto border-t border-white/10 bg-[#080808] p-4 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
          <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
            {item.durationMs !== undefined && (
              <div className="rounded border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/35">Duration</div>
                <div className="mt-1 font-mono text-white/80">{(item.durationMs / 1000).toFixed(1)}s</div>
              </div>
            )}
            {item.cost !== undefined && (
              <div className="rounded border border-white/10 bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-white/35">Cost</div>
                <div className="mt-1 font-mono text-emerald-300">${item.cost.toFixed(4)}</div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-white/35">Prompt</div>
            <p className="rounded border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-white/80">{item.prompt}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleResult(downloadImage(item.imageUrl!, item.modelName))} className="flex items-center justify-center gap-2 rounded bg-indigo-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-indigo-500">
              <Download className="h-4 w-4" />
              Download
            </button>
            <button onClick={() => handleResult(shareImage(item.imageUrl!, item.prompt, item.modelName))} className="flex items-center justify-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/75 hover:bg-white/10">
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button onClick={() => handleResult(copyText(item.imageUrl!))} className="flex items-center justify-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/75 hover:bg-white/10">
              <Copy className="h-4 w-4" />
              URL
            </button>
            <button onClick={() => handleResult(copyText(item.prompt))} className="flex items-center justify-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/75 hover:bg-white/10">
              <Copy className="h-4 w-4" />
              Prompt
            </button>
            <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center justify-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/75 hover:bg-white/10">
              <ExternalLink className="h-4 w-4" />
              Open image in new tab
            </a>
          </div>

          {message && <div className="mt-4 rounded border border-white/10 bg-white/5 p-2 text-xs text-white/70">{message}</div>}
        </aside>
      </div>
    </div>
  );
}
