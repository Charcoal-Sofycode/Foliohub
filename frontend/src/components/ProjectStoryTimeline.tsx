'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, FileText, Layout, Scissors, RefreshCw,
  CheckCircle2, Upload, X, Image as ImageIcon, Video,
  Plus, Loader2, Trash2, Save
} from 'lucide-react';
import api from '@/lib/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface MediaItem {
  type: 'image' | 'video';
  url: string;
  key: string;
}

interface RevisionEntry {
  round: number;
  note: string;
  media: MediaItem[];
}

interface Story {
  id: number;
  project_id: number;
  brief_note: string | null;
  brief_media: MediaItem[];
  storyboard_note: string | null;
  storyboard_media: MediaItem[];
  rough_cut_note: string | null;
  rough_cut_media: MediaItem[];
  revisions_note: string | null;
  revisions_data: RevisionEntry[];
  final_note: string | null;
  final_media: MediaItem[];
}

type StageKey = 'brief' | 'storyboard' | 'rough_cut' | 'revisions' | 'final';

/* ─── Stage definitions ─────────────────────────────────────────────────── */
const STAGES: {
  key: StageKey;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}[] = [
  {
    key: 'brief',
    label: 'Brief',
    icon: <FileText className="w-4 h-4" />,
    color: 'from-violet-500/20 to-violet-500/0',
    description: 'Client brief, creative direction & scope.',
  },
  {
    key: 'storyboard',
    label: 'Storyboard',
    icon: <Layout className="w-4 h-4" />,
    color: 'from-blue-500/20 to-blue-500/0',
    description: 'Shot list, mood board & visual references.',
  },
  {
    key: 'rough_cut',
    label: 'Rough Cut',
    icon: <Scissors className="w-4 h-4" />,
    color: 'from-amber-500/20 to-amber-500/0',
    description: 'First assembly cut & pacing review.',
  },
  {
    key: 'revisions',
    label: 'Revision Rounds',
    icon: <RefreshCw className="w-4 h-4" />,
    color: 'from-orange-500/20 to-orange-500/0',
    description: 'Client feedback & iterative revision notes.',
  },
  {
    key: 'final',
    label: 'Final Export',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'from-emerald-500/20 to-emerald-500/0',
    description: 'Approved deliverables & export specs.',
  },
];

/* ─── helpers ───────────────────────────────────────────────────────────── */
function stageNoteField(key: StageKey): keyof Story {
  const map: Record<StageKey, keyof Story> = {
    brief: 'brief_note',
    storyboard: 'storyboard_note',
    rough_cut: 'rough_cut_note',
    revisions: 'revisions_note',
    final: 'final_note',
  };
  return map[key];
}

function stageMediaField(key: StageKey): keyof Story {
  const map: Record<StageKey, keyof Story> = {
    brief: 'brief_media',
    storyboard: 'storyboard_media',
    rough_cut: 'rough_cut_media',
    revisions: 'revisions_data',
    final: 'final_media',
  };
  return map[key];
}

/* ─── MediaGrid ─────────────────────────────────────────────────────────── */
function MediaGrid({
  items,
  onDelete,
  readOnly,
}: {
  items: MediaItem[];
  onDelete?: (key: string) => void;
  readOnly?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50 aspect-video"
        >
          {item.type === 'image' ? (
            <img
              src={item.url}
              alt="Story asset"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={item.url}
              controls
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute top-1.5 left-1.5 bg-black/60 rounded-sm px-1.5 py-0.5 flex items-center gap-1">
            {item.type === 'image' ? (
              <ImageIcon className="w-2.5 h-2.5 text-zinc-400" />
            ) : (
              <Video className="w-2.5 h-2.5 text-zinc-400" />
            )}
          </div>
          {!readOnly && onDelete && (
            <button
              onClick={() => onDelete(item.key)}
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition
                         bg-red-600/80 hover:bg-red-600 rounded-sm p-1"
            >
              <Trash2 className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── RevisionEntryView ─────────────────────────────────────────────────── */
function RevisionList({
  entries,
  onDelete,
  readOnly,
}: {
  entries: RevisionEntry[];
  onDelete?: (round: number, key: string) => void;
  readOnly?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <div className="space-y-4 mt-3">
      {entries.map((rev) => (
        <div
          key={rev.round}
          className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/30"
        >
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Round {rev.round}
          </p>
          {rev.note && (
            <p className="text-sm text-zinc-300 font-light whitespace-pre-wrap mb-2">
              {rev.note}
            </p>
          )}
          <MediaGrid
            items={rev.media || []}
            onDelete={onDelete ? (key) => onDelete(rev.round, key) : undefined}
            readOnly={readOnly}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── StagePanel ─────────────────────────────────────────────────────────── */
function StagePanel({
  stage,
  story,
  projectId,
  onStoryUpdate,
  readOnly,
}: {
  stage: (typeof STAGES)[number];
  story: Story;
  projectId: number;
  onStoryUpdate?: (s: Story) => void;
  readOnly?: boolean;
}) {
  const noteField = stageNoteField(stage.key);
  const mediaField = stageMediaField(stage.key);

  const [note, setNote] = useState<string>(
    (story[noteField] as string | null) ?? ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const mediaItems: MediaItem[] =
    stage.key === 'revisions'
      ? (story.revisions_data ?? []).flatMap((r) => r.media ?? [])
      : ((story[mediaField] as MediaItem[]) ?? []);

  /* Save text note */
  const handleSaveNote = async () => {
    if (readOnly) return;
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        [noteField as string]: note,
      };
      const res = await api.put(`/projects/${projectId}/story`, payload);
      if (onStoryUpdate) onStoryUpdate(res.data);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  /* Upload media file */
  const handleUpload = useCallback(
    async (file: File) => {
      if (readOnly) return;
      setIsUploading(true);
      try {
        const fd = new FormData();
        fd.append('stage', stage.key);
        fd.append('file', file);
        await api.post(`/projects/${projectId}/story/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Refresh story
        const res = await api.get(`/projects/${projectId}/story`);
        if (onStoryUpdate) onStoryUpdate(res.data);
      } catch (e) {
        console.error('Upload failed', e);
      } finally {
        setIsUploading(false);
      }
    },
    [projectId, stage.key, onStoryUpdate, readOnly]
  );

  /* Delete media item */
  const handleDeleteMedia = async (key: string) => {
    if (readOnly) return;
    try {
      await api.delete(`/projects/${projectId}/story/media`, {
        params: { stage: stage.key, key },
      });
      const res = await api.get(`/projects/${projectId}/story`);
      if (onStoryUpdate) onStoryUpdate(res.data);
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleDeleteRevisionMedia = async (_round: number, key: string) => {
    await handleDeleteMedia(key);
  };

  /* Drag & drop */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-4">
      {/* Text note */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-600 mb-1.5 block">
          Notes
        </label>
        {readOnly ? (
          note ? (
            <p className="text-sm text-zinc-300 font-light whitespace-pre-wrap bg-zinc-900/20 p-3 rounded-lg border border-zinc-800/50">
              {note}
            </p>
          ) : (
            <p className="text-sm text-zinc-700 italic font-light">No notes for this stage.</p>
          )
        ) : (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={`Add ${stage.label.toLowerCase()} notes, context or references…`}
              className="w-full bg-zinc-900/40 border border-zinc-800 focus:border-zinc-600
                         rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700
                         resize-none outline-none transition-colors font-light"
            />
            <div className="flex justify-end mt-1.5">
              <button
                onClick={handleSaveNote}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px]
                           font-semibold uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700
                           text-zinc-300 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </button>
            </div>
          </>
        )}
      </div>

      {/* Media section */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.18em] font-semibold text-zinc-600 mb-1.5 block">
          Attachments
        </label>

        {!readOnly && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed
                        rounded-lg py-5 cursor-pointer transition-all duration-200 mb-4
                        ${isDragging
                          ? 'border-white/40 bg-white/5'
                          : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20 hover:bg-zinc-900/40'}`}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-zinc-600" />
            )}
            <p className="text-[11px] text-zinc-600 text-center">
              {isUploading
                ? 'Uploading…'
                : 'Drop screenshot or clip here, or click to browse'}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* Uploaded media */}
        {stage.key === 'revisions' ? (
          <RevisionList
            entries={story.revisions_data ?? []}
            onDelete={readOnly ? undefined : handleDeleteRevisionMedia}
            readOnly={readOnly}
          />
        ) : (
          mediaItems.length > 0 ? (
            <MediaGrid items={mediaItems} onDelete={readOnly ? undefined : handleDeleteMedia} readOnly={readOnly} />
          ) : (
            readOnly && <p className="text-[10px] text-zinc-700 italic">No attachments for this stage.</p>
          )
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ProjectStoryTimeline({
  projectId,
  projectTitle,
  initialStory,
  readOnly = false,
}: {
  projectId: number;
  projectTitle: string;
  initialStory?: any;
  readOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [story, setStory] = useState<Story | null>(initialStory || null);
  const [activeStage, setActiveStage] = useState<StageKey>('brief');
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const fetchedRef = useRef(!!initialStory);

  const handleToggle = async () => {
    if (!isOpen && !fetchedRef.current && !initialStory) {
      setIsLoadingStory(true);
      try {
        const res = await api.get(`/projects/${projectId}/story`);
        setStory(res.data);
        fetchedRef.current = true;
      } catch (e) {
        console.error('Failed to load story', e);
      } finally {
        setIsLoadingStory(false);
      }
    }
    setIsOpen((v) => !v);
  };

  /* Count how many stages have content */
  const completedCount = story
    ? STAGES.filter((s) => {
        const note = story[stageNoteField(s.key)] as string | null;
        const media =
          s.key === 'revisions'
            ? story.revisions_data?.length
            : (story[stageMediaField(s.key)] as MediaItem[])?.length;
        return (note && note.trim()) || (media && media > 0);
      }).length
    : 0;

  // If readOnly and NO content at all, don't even show the toggle
  if (readOnly && completedCount === 0 && fetchedRef.current) return null;

  return (
    <div className={`border-t border-zinc-900 mt-0 ${readOnly ? 'bg-black/20' : ''}`}>
      {/* Toggle header */}
      <button
        id={`story-toggle-${projectId}`}
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-6 py-3.5 text-left
                   hover:bg-zinc-900/40 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex gap-0.5">
            {STAGES.map((s, i) => {
              const hasContent = story && (() => {
                const note = story[stageNoteField(s.key)] as string | null;
                const mediaCount = s.key === 'revisions'
                  ? story.revisions_data?.length 
                  : (story[stageMediaField(s.key)] as MediaItem[])?.length;
                return (note && note.trim()) || (mediaCount && mediaCount > 0);
              })();
              
              return (
                <div
                  key={s.key}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    hasContent ? 'bg-white' : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11px] uppercase tracking-widest font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">
            Production Story
          </span>
          {story && completedCount > 0 && (
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
              {completedCount}/{STAGES.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoadingStory && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
          <ChevronDown
            className={`w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-all duration-300
                        ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="story-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-5 pt-1">
              {/* Stage tabs */}
              <div className="flex gap-1 flex-wrap mb-4 overflow-x-auto pb-2 hide-scrollbar">
                {STAGES.map((s, i) => {
                  const hasContent = story
                    ? (() => {
                        const note = story[stageNoteField(s.key)] as string | null;
                        const mediaCount =
                          s.key === 'revisions'
                            ? story.revisions_data?.length
                            : (story[stageMediaField(s.key)] as MediaItem[])?.length;
                        return (note && note.trim()) || (mediaCount && mediaCount > 0);
                      })()
                    : false;

                  // In readOnly, we might want to skip stages that are empty? 
                  // For now let's show all but highlight ones with content.
                  return (
                    <button
                      key={s.key}
                      id={`stage-tab-${projectId}-${s.key}`}
                      onClick={() => setActiveStage(s.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]
                                  font-semibold uppercase tracking-widest transition-all duration-200 whitespace-nowrap
                                  ${activeStage === s.key
                                    ? 'bg-white text-black'
                                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
                    >
                      {s.icon}
                      {s.label}
                      {hasContent && activeStage !== s.key && (
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active stage content */}
              <AnimatePresence mode="wait">
                {STAGES.filter((s) => s.key === activeStage).map((s) => (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-xl bg-gradient-to-b ${s.color} border border-zinc-800/60 p-4`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-zinc-500">{s.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-zinc-200">{s.label}</p>
                        <p className="text-[10px] text-zinc-600">{s.description}</p>
                      </div>
                    </div>

                    {story ? (
                      <StagePanel
                        stage={s}
                        story={story}
                        projectId={projectId}
                        onStoryUpdate={setStory}
                        readOnly={readOnly}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-600 text-xs py-4 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading story…
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
