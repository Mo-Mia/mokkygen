import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ImagePlus, Plus, Trash2, Type } from 'lucide-react';
import type { ImageGenerationSettings, ImageModelCapabilities, ReferenceImageInput } from '../lib/modelCapabilities';

const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;

interface AdvancedControlsProps {
  selectedModelIds: string[];
  mode: 'single' | 'compare';
  settings: ImageGenerationSettings;
  onChange: (settings: ImageGenerationSettings) => void;
  capabilities: ImageModelCapabilities;
  disabled?: boolean;
}

function fileSize(sizeBytes: number): string {
  if (sizeBytes > 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdvancedControls({ selectedModelIds, mode, settings, onChange, capabilities, disabled }: AdvancedControlsProps) {
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasAnyControls =
    capabilities.supportedAspectRatios.length > 0 ||
    capabilities.supportedImageSizes.length > 0 ||
    capabilities.supportsReferenceImages ||
    capabilities.supportsSeed ||
    capabilities.supportsTemperature ||
    capabilities.supportsFontInputs;

  const summary = useMemo(() => {
    const parts = [
      settings.aspectRatio ? `Ratio ${settings.aspectRatio}` : null,
      settings.imageSize ? `Size ${settings.imageSize}` : null,
      settings.referenceImages.length > 0 ? `${settings.referenceImages.length} reference${settings.referenceImages.length === 1 ? '' : 's'}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Defaults';
  }, [settings]);

  const update = (patch: Partial<ImageGenerationSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const addFiles = async (files: FileList | File[]) => {
    setWarning(null);
    const existing = settings.referenceImages;
    const remaining = Math.max(0, capabilities.maxReferenceImages - existing.length);
    const nextFiles = Array.from(files).slice(0, remaining);
    const accepted: ReferenceImageInput[] = [];

    if (nextFiles.length === 0) {
      setWarning(`Reference image limit reached for this model (${capabilities.maxReferenceImages}).`);
      return;
    }

    for (const file of nextFiles) {
      if (!file.type.startsWith('image/')) {
        setWarning('Only image files can be used as references.');
        continue;
      }
      if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
        setWarning(`"${file.name}" is larger than 5 MB. Use a smaller image for v0.4.`);
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type,
        dataUrl,
        sizeBytes: file.size,
      });
    }

    if (accepted.length > 0) {
      update({ referenceImages: [...existing, ...accepted].slice(0, capabilities.maxReferenceImages) });
    }
  };

  const addFontRow = () => {
    update({ fontInputs: [...settings.fontInputs, { id: crypto.randomUUID(), fontUrl: '', text: '' }].slice(0, 2) });
  };

  const updateFontRow = (id: string, patch: { fontUrl?: string; text?: string }) => {
    update({ fontInputs: settings.fontInputs.map((row) => (row.id === id ? { ...row, ...patch } : row)) });
  };

  const removeFontRow = (id: string) => {
    update({ fontInputs: settings.fontInputs.filter((row) => row.id !== id) });
  };

  return (
    <section className="shrink-0 rounded-xl border border-white/10 bg-[#0d0d0d]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Advanced controls</div>
          <div className="mt-1 truncate text-[11px] text-white/35">{summary}</div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="grid gap-4 border-t border-white/5 p-4">
          {mode === 'compare' && <p className="text-xs text-white/45">Compare Mode only shows controls supported by all selected models.</p>}
          {!hasAnyControls && <p className="rounded border border-white/10 bg-white/5 p-3 text-xs text-white/45">No shared advanced controls are available for the current {mode === 'compare' ? `${selectedModelIds.length} selected models` : 'model'}.</p>}

          {capabilities.supportedAspectRatios.length > 0 && (
            <label className="grid gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Aspect ratio</span>
              <select disabled={disabled} value={settings.aspectRatio ?? capabilities.defaultAspectRatio} onChange={(event) => update({ aspectRatio: event.target.value as ImageGenerationSettings['aspectRatio'] })} className="rounded border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white/75 focus:border-indigo-500 focus:outline-none">
                {capabilities.supportedAspectRatios.map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}
                  </option>
                ))}
              </select>
            </label>
          )}

          {capabilities.supportedImageSizes.length > 0 && (
            <label className="grid gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Image size</span>
              <select disabled={disabled} value={settings.imageSize ?? capabilities.defaultImageSize} onChange={(event) => update({ imageSize: event.target.value as ImageGenerationSettings['imageSize'] })} className="rounded border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white/75 focus:border-indigo-500 focus:outline-none">
                {capabilities.supportedImageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          )}

          {capabilities.supportsReferenceImages && (
            <div className="grid gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Reference images</div>
                <p className="mt-1 text-xs text-white/45">Reference images are sent to OpenRouter with your prompt. They are not uploaded to MokkyGen servers. Max 5 MB each.</p>
              </div>
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  addFiles(event.dataTransfer.files);
                }}
                className="rounded border border-dashed border-white/15 bg-white/[0.03] p-3"
              >
                <button type="button" disabled={disabled || settings.referenceImages.length >= capabilities.maxReferenceImages} onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
                  <ImagePlus className="h-4 w-4" />
                  Add image ({settings.referenceImages.length}/{capabilities.maxReferenceImages})
                </button>
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
              </div>
              {warning && <div className="rounded border border-amber-500/25 bg-amber-500/10 p-2 text-xs text-amber-100">{warning}</div>}
              {settings.referenceImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {settings.referenceImages.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded border border-white/10 bg-black/30">
                      <img src={image.dataUrl} alt={image.name} className="h-20 w-full object-cover" />
                      <div className="flex items-center justify-between gap-2 p-2">
                        <div className="min-w-0">
                          <div className="truncate text-[10px] text-white/65">{image.name}</div>
                          <div className="text-[9px] text-white/35">{fileSize(image.sizeBytes)}</div>
                        </div>
                        <button type="button" onClick={() => update({ referenceImages: settings.referenceImages.filter((item) => item.id !== image.id) })} className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-white">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {capabilities.supportsSeed && (
            <label className="grid gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Seed</span>
              <input type="number" value={settings.seed ?? ''} onChange={(event) => update({ seed: event.target.value ? Number(event.target.value) : null })} className="rounded border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white/75 focus:border-indigo-500 focus:outline-none" />
            </label>
          )}

          {capabilities.supportsTemperature && (
            <label className="grid gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Temperature</span>
              <input type="number" min="0" max="2" step="0.1" value={settings.temperature ?? ''} onChange={(event) => update({ temperature: event.target.value ? Number(event.target.value) : null })} className="rounded border border-white/10 bg-[#151515] px-3 py-2 text-sm text-white/75 focus:border-indigo-500 focus:outline-none" />
            </label>
          )}

          {capabilities.supportsFontInputs && (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    <Type className="h-3.5 w-3.5" />
                    Font inputs
                  </div>
                  <p className="mt-1 text-xs text-white/45">Use hosted font URLs only. Mention the same text in your main prompt for best results.</p>
                </div>
                <button type="button" disabled={settings.fontInputs.length >= 2} onClick={addFontRow} className="rounded border border-white/10 bg-white/5 p-2 text-white/55 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {settings.fontInputs.map((row) => (
                <div key={row.id} className="grid gap-2 rounded border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[1fr_1fr_auto]">
                  <input value={row.fontUrl} onChange={(event) => updateFontRow(row.id, { fontUrl: event.target.value })} placeholder="Font URL" className="min-w-0 rounded border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white/75 focus:border-indigo-500 focus:outline-none" />
                  <input value={row.text} onChange={(event) => updateFontRow(row.id, { text: event.target.value })} placeholder="Text to render" className="min-w-0 rounded border border-white/10 bg-[#151515] px-3 py-2 text-xs text-white/75 focus:border-indigo-500 focus:outline-none" />
                  <button type="button" onClick={() => removeFontRow(row.id)} className="rounded border border-white/10 bg-white/5 p-2 text-white/55 hover:bg-white/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
