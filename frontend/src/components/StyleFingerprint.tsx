'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fingerprint, RefreshCw, Zap, Clock, Activity, Volume2, Palette,
  BarChart2, ChevronDown, Loader2, AlertCircle, Check
} from 'lucide-react';
import api from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface FingerprintData {
  videos_analysed: number;
  total_duration: number;
  avg_shot_length: number;
  beat_sync_score: number;
  motion_energy: number;
  silence_ratio: number;
  avg_saturation: number;
  avg_brightness: number;
  pacing_score: number;
  colour_mood_score: number;
  colour_palette: string[];
  cut_timeline: number[];
  style_tags: string[];
}

interface StyleFingerprintProps {
  /** When used on dashboard: undefined — fetches via authenticated API */
  fingerprintData?: FingerprintData | null;
  /** When used on public portfolio page: pass the subdomain to fetch publicly */
  subdomain?: string;
  /** Whether this is in edit/dashboard mode (shows compute button) */
  editable?: boolean;
  /** Portfolio title for attribution */
  portfolioTitle?: string;
}

/* ─── Tag colour mapping ────────────────────────────────────────────────── */
const TAG_COLOURS: Record<string, string> = {
  'Muted tones':        'border-zinc-600 text-zinc-300',
  'Vibrant':            'border-violet-500/50 text-violet-300',
  'Rhythm-synced':      'border-indigo-500/50 text-indigo-300',
  'Narrative':          'border-amber-500/40 text-amber-300',
  'Fast-cut':           'border-red-500/40 text-red-300',
  'High motion':        'border-green-500/40 text-green-300',
  'Slow burn':          'border-sky-500/40 text-sky-300',
  'Intentional pauses': 'border-zinc-500/60 text-zinc-400',
};

/* ─── Dimension bar ─────────────────────────────────────────────────────── */
function DimensionBar({
  label,
  value,
  maxLabel,
  colour,
  delay = 0,
}: {
  label: string;
  value: number; // 0–100
  maxLabel: string;
  colour: string;
  delay?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-28 shrink-0 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      <div className="flex-1 h-[3px] bg-zinc-900 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay }}
          className={`h-full rounded-full ${colour}`}
        />
      </div>
      <span className="w-20 text-right text-[11px] font-mono text-zinc-600 tracking-widest">
        {maxLabel}
      </span>
    </div>
  );
}

/* ─── Pacing chart ──────────────────────────────────────────────────────── */
function PacingChart({ bins }: { bins: number[] }) {
  if (!bins.length) return null;
  const max = Math.max(...bins, 1);
  return (
    <div className="flex items-end gap-1 h-16">
      {bins.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ duration: 0.8, delay: i * 0.03, ease: 'easeOut' }}
          className="flex-1 bg-indigo-500/60 rounded-t-sm min-h-[2px]"
        />
      ))}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export default function StyleFingerprint({
  fingerprintData: propData,
  subdomain,
  editable = false,
  portfolioTitle,
}: StyleFingerprintProps) {
  const [fingerprint, setFingerprint] = useState<FingerprintData | null>(propData || null);
  const [isOpen, setIsOpen] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [computeMsg, setComputeMsg] = useState('');
  const [error, setError] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /* Fetch fingerprint on open */
  const fetchFingerprint = async () => {
    setIsFetching(true);
    setError('');
    try {
      let res;
      if (subdomain) {
        // Public page
        const { data } = await api.get(`/portfolios/fingerprint/${subdomain}`);
        res = data.fingerprint;
      } else if (editable) {
        // Dashboard
        const { data } = await api.get('/portfolio/fingerprint');
        res = data.fingerprint;
      }
      setFingerprint(res || null);
    } catch {
      setError('Could not load fingerprint data.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !fingerprint) {
      await fetchFingerprint();
    }
  };

  /* Trigger computation */
  const handleCompute = async () => {
    setIsComputing(true);
    setComputeMsg('');
    setError('');
    try {
      const { data } = await api.post('/portfolio/fingerprint/compute');
      setComputeMsg(`Analysing ${data.videos_queued} video${data.videos_queued !== 1 ? 's' : ''}…`);
      // Poll every 8s for up to 2 mins
      let attempts = 0;
      pollingRef.current = setInterval(async () => {
        attempts++;
        await fetchFingerprint();
        if (fingerprint || attempts >= 15) {
          clearInterval(pollingRef.current!);
          setIsComputing(false);
          setComputeMsg('');
        }
      }, 8000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to start analysis.');
      setIsComputing(false);
    }
  };

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  /* Auto-fetch if prop data changes */
  useEffect(() => {
    if (propData !== undefined) setFingerprint(propData);
  }, [propData]);

  const fp = fingerprint;

  return (
    <div className="border-t border-zinc-900 mt-0">
      {/* ── Toggle header ── */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  fp ? 'bg-indigo-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
            Style Fingerprint
          </span>
          {fp?.style_tags?.length ? (
            <span className="text-[9px] font-mono text-indigo-400 tracking-widest">
              {fp.style_tags.length} tag{fp.style_tags.length > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
        </motion.div>
      </button>

      {/* ── Expanded panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-1 space-y-5">

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <p className="text-[11px] font-mono">{error}</p>
                </div>
              )}

              {/* Loading state */}
              {isFetching && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest">
                    Loading signal data…
                  </span>
                </div>
              )}

              {/* No fingerprint yet — compute CTA */}
              {!isFetching && !fp && (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1 tracking-tight">No fingerprint yet</p>
                    <p className="text-[11px] text-zinc-600 font-light max-w-xs leading-relaxed">
                      Run an analysis to extract your visual style signal from your uploaded videos — cut pacing, colour mood, motion energy &amp; more.
                    </p>
                  </div>
                  {editable && (
                    <button
                      onClick={handleCompute}
                      disabled={isComputing}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-[0.15em] rounded-lg transition disabled:opacity-60"
                    >
                      {isComputing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      {isComputing ? (computeMsg || 'Analysing…') : 'Compute My Fingerprint'}
                    </button>
                  )}
                  {isComputing && (
                    <p className="text-[10px] text-zinc-600 font-mono animate-pulse">{computeMsg}</p>
                  )}
                </div>
              )}

              {/* Fingerprint Data */}
              {!isFetching && fp && (
                <div className="space-y-4">
                  {/* Header row: tags + recompute */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {fp.style_tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2.5 py-1 border rounded-full text-[10px] font-bold uppercase tracking-[0.12em] ${TAG_COLOURS[tag] || 'border-zinc-700 text-zinc-400'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {editable && (
                      <button
                        onClick={handleCompute}
                        disabled={isComputing}
                        title="Recompute fingerprint"
                        className="w-8 h-8 shrink-0 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-white hover:border-zinc-600 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* KPI row */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: <Clock className="w-3.5 h-3.5" />, label: 'Avg shot', value: `${fp.avg_shot_length}s`, sub: fp.avg_shot_length > 4 ? 'Considered pacing' : fp.avg_shot_length < 1.5 ? 'Rapid fire' : 'Dynamic pacing' },
                      { icon: <Zap className="w-3.5 h-3.5" />, label: 'Beat sync', value: `${fp.beat_sync_score}%`, sub: fp.beat_sync_score > 75 ? 'High rhythm align' : 'Moderate sync' },
                      { icon: <Activity className="w-3.5 h-3.5" />, label: 'Motion', value: `${fp.motion_energy}%`, sub: fp.motion_energy > 65 ? 'High energy' : fp.motion_energy < 25 ? 'Slow burn' : 'Low to medium' },
                      { icon: <Volume2 className="w-3.5 h-3.5" />, label: 'Silence', value: `${fp.silence_ratio}%`, sub: fp.silence_ratio > 35 ? 'Intentional pauses' : 'Tight audio flow' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-zinc-950 border border-zinc-900 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-indigo-500 mb-1.5">
                          {kpi.icon}
                          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">{kpi.label}</span>
                        </div>
                        <p className="text-xl font-black text-white tracking-tighter">{kpi.value}</p>
                        <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{kpi.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Colour palette + Pacing chart */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Palette */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Palette className="w-3 h-3 text-zinc-600" />
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">Colour palette</span>
                      </div>
                      <div className="flex gap-1.5">
                        {(fp.colour_palette || []).slice(0, 6).map((hex, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.06, duration: 0.3 }}
                            className="flex-1 h-10 rounded-md border border-white/5"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                      <p className="text-[9px] text-zinc-700 font-mono mt-2">
                        {fp.avg_saturation < 35 ? 'Low saturation · Muted' : fp.avg_saturation > 60 ? 'High saturation · Vibrant' : 'Medium saturation · Balanced'}
                      </p>
                    </div>

                    {/* Pacing chart */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <BarChart2 className="w-3 h-3 text-zinc-600" />
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">Pacing (cut frequency)</span>
                      </div>
                      <PacingChart bins={fp.cut_timeline} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] font-mono text-zinc-700">0s</span>
                        <span className="text-[8px] font-mono text-zinc-700">{Math.round(fp.total_duration / 2)}s</span>
                        <span className="text-[8px] font-mono text-zinc-700">{Math.round(fp.total_duration)}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Style dimensions */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Activity className="w-3 h-3 text-zinc-600" />
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">Style dimensions</span>
                    </div>
                    <DimensionBar label="Pacing" value={fp.pacing_score} maxLabel="Slow" colour="bg-indigo-500" delay={0} />
                    <DimensionBar label="Colour mood" value={fp.colour_mood_score} maxLabel="Muted" colour="bg-violet-500" delay={0.1} />
                    <DimensionBar label="Motion level" value={fp.motion_energy} maxLabel={`${fp.motion_energy}%`} colour="bg-emerald-500" delay={0.2} />
                    <DimensionBar label="Beat sync" value={fp.beat_sync_score} maxLabel={`${fp.beat_sync_score}%`} colour="bg-green-400" delay={0.3} />
                    <DimensionBar label="Silence use" value={fp.silence_ratio} maxLabel={`${fp.silence_ratio}%`} colour="bg-amber-500" delay={0.4} />
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
                    <Check className="w-3 h-3 text-indigo-500" />
                    <span>{fp.videos_analysed} video{fp.videos_analysed !== 1 ? 's' : ''} analysed · {Math.round(fp.total_duration)}s total runtime</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
