import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OpenRouterErrorDetails } from '../lib/openrouter';

interface TechnicalDetailsProps {
  details?: OpenRouterErrorDetails;
}

export function TechnicalDetails({ details }: TechnicalDetailsProps) {
  const [open, setOpen] = useState(false);
  if (!details) return null;

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/40 hover:text-white/70"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        Show technical details
      </button>
      {open && (
        <dl className="mt-2 grid gap-1 rounded bg-black/40 p-2 font-mono text-[10px] text-white/60">
          <div>
            <dt className="text-white/30">Endpoint</dt>
            <dd className="break-all">{details.endpoint}</dd>
          </div>
          {details.model && (
            <div>
              <dt className="text-white/30">Model</dt>
              <dd className="break-all">{details.model}</dd>
            </div>
          )}
          {details.status !== undefined && (
            <div>
              <dt className="text-white/30">Status</dt>
              <dd>{details.status}</dd>
            </div>
          )}
          <div>
            <dt className="text-white/30">Message</dt>
            <dd className="break-words">{details.message}</dd>
          </div>
          {details.code !== undefined && (
            <div>
              <dt className="text-white/30">Code</dt>
              <dd>{details.code}</dd>
            </div>
          )}
          {details.type && (
            <div>
              <dt className="text-white/30">Type</dt>
              <dd>{details.type}</dd>
            </div>
          )}
          {details.requestedModalities && (
            <div>
              <dt className="text-white/30">Requested modalities</dt>
              <dd>{details.requestedModalities.join(', ')}</dd>
            </div>
          )}
          {details.finalModalities && (
            <div>
              <dt className="text-white/30">Final modalities</dt>
              <dd>{details.finalModalities.join(', ')}</dd>
            </div>
          )}
          {details.fallbackModalities && (
            <div>
              <dt className="text-white/30">Fallback modalities</dt>
              <dd>{details.fallbackModalities.join(', ')}</dd>
            </div>
          )}
          {details.fallbackUsed !== undefined && (
            <div>
              <dt className="text-white/30">Fallback used</dt>
              <dd>{details.fallbackUsed ? 'yes' : 'no'}</dd>
            </div>
          )}
          {details.originalErrorMessage && (
            <div>
              <dt className="text-white/30">Original error</dt>
              <dd className="break-words">{details.originalErrorMessage}</dd>
            </div>
          )}
          {details.finalErrorMessage && (
            <div>
              <dt className="text-white/30">Final error</dt>
              <dd className="break-words">{details.finalErrorMessage}</dd>
            </div>
          )}
          {details.requestedImageConfig && (
            <div>
              <dt className="text-white/30">Requested image_config</dt>
              <dd className="break-words">{JSON.stringify(details.requestedImageConfig)}</dd>
            </div>
          )}
          {details.finalImageConfig && (
            <div>
              <dt className="text-white/30">Final image_config</dt>
              <dd className="break-words">{JSON.stringify(details.finalImageConfig)}</dd>
            </div>
          )}
          {details.referenceImageCount !== undefined && (
            <div>
              <dt className="text-white/30">Reference images</dt>
              <dd>{details.referenceImageCount}</dd>
            </div>
          )}
          {details.droppedSettings && details.droppedSettings.length > 0 && (
            <div>
              <dt className="text-white/30">Dropped settings</dt>
              <dd>{details.droppedSettings.join(', ')}</dd>
            </div>
          )}
          {details.advancedSettingsFallbackUsed !== undefined && (
            <div>
              <dt className="text-white/30">Advanced fallback used</dt>
              <dd>{details.advancedSettingsFallbackUsed ? 'yes' : 'no'}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
