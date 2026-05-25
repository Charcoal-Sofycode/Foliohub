'use client';

import { useEffect, useState, useRef, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/api';
import FolioLogo from '@/components/FolioLogo';
import BeforeAfterPlayer from '@/components/BeforeAfterPlayer';
import { MessageSquare, Play, Pause, CheckCircle2, AlertCircle, X, Send, Clock, PlayCircle, Pencil, Trash2, Check, ThumbsUp, ThumbsDown, HelpCircle, Maximize2 } from 'lucide-react';

export default function ReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const [project, setProject] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<{ toggleFullscreen: () => void }>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const maxRecorrections = project?.max_recorrections ?? 3;
  const recorrectionsUsed = project?.recorrections_used ?? 0;
  const remainingCorrections = Math.max(0, maxRecorrections - recorrectionsUsed);

  // Onboarding Tour state
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  const hasComments = comments.length > 0;
  const allCommentsResolved = hasComments && comments.every(c => c.is_resolved);

  const isLocked = project?.status === 'approved' || (project?.status === 'needs_revision' && !allCommentsResolved) || (project?.status === 'needs_revision' && allCommentsResolved && remainingCorrections === 0);
  
  const canRequestChanges = project?.status !== 'approved' && remainingCorrections > 0 && (project?.status !== 'needs_revision' || allCommentsResolved);
  const canApprove = project?.status !== 'approved' && (project?.status !== 'needs_revision' || allCommentsResolved);

  // Custom dialog popup state
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
    isDestructive?: boolean;
  } | null>(null);

  const triggerConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, isDestructive = false) => {
    setCustomDialog({
      isOpen: true,
      type: 'confirm',
      message,
      onConfirm: () => {
        onConfirm();
        setCustomDialog(null);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setCustomDialog(null);
      },
      isDestructive
    });
  };

  const triggerAlert = (message: string, onConfirm?: () => void) => {
    setCustomDialog({
      isOpen: true,
      type: 'alert',
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setCustomDialog(null);
      }
    });
  };

  // Long press for mobile
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Comment UI state
  const [isCommenting, setIsCommenting] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit/delete state
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    // 1. Fetch project data
    fetch(`${API_URL}/projects/${resolvedParams.projectId}`)
      .then(res => {
        if (!res.ok) throw new Error("Project not found");
        return res.json();
      })
      .then(data => {
        setProject(data);
        setIsLoading(false);
        // Load existing comments
        fetchComments();
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [resolvedParams.projectId]);

  // Check for first-time tour on project load complete
  useEffect(() => {
    if (!isLoading && project) {
      const tourCompleted = localStorage.getItem(`foliohub_review_tour_completed_${resolvedParams.projectId}`);
      if (!tourCompleted) {
        setIsTourOpen(true);
        setCurrentTourStep(0);
      }
    }
  }, [isLoading, project, resolvedParams.projectId]);

  const fetchComments = () => {
    fetch(`${API_URL}/projects/${resolvedParams.projectId}/comments`)
      .then(res => res.json())
      .then(data => setComments(data))
      .catch(err => console.error(err));
  };

  // Sync video element with isPlaying state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      if (video.paused) video.play().catch(() => {});
    } else {
      if (!video.paused) video.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    if (isLongPress.current) return;
    togglePlay();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!project || isLocked) return;
    
    videoRef.current?.pause();
    setIsCommenting(true);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        if (project && !isLocked) {
          videoRef.current?.pause();
          setIsCommenting(true);
        }
      }, 600); // 600ms for long press
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const submitComment = async () => {
    if (!newCommentText.trim() || !authorName.trim()) {
      triggerAlert("Please enter your name and a comment.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await fetch(`${API_URL}/projects/${resolvedParams.projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: Math.floor(currentTime),
          text: newCommentText,
          author_name: authorName
        })
      });
      setNewCommentText("");
      setIsCommenting(false);
      fetchComments();
    } catch (err) {
      console.error(err);
      triggerAlert("Failed to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = (commentId: number) => {
    triggerConfirm(
      "Delete this comment?",
      async () => {
        try {
          await fetch(`${API_URL}/comments/${commentId}`, { method: "DELETE" });
          fetchComments();
        } catch (err) {
          console.error(err);
        }
      },
      undefined,
      true
    );
  };

  const startEditing = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.text);
  };

  const saveEdit = async (commentId: number) => {
    try {
      await fetch(`${API_URL}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editingText })
      });
      setEditingCommentId(null);
      setEditingText("");
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await fetch(`${API_URL}/projects/${resolvedParams.projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      setProject({ ...project, status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const jumpToTime = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      video.play();
    }
  };

  // Scrubber progress (0-100)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    video.currentTime = pct * duration;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-500 font-medium">
        <div className="animate-spin w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full mr-3" />
        LOADING REVIEW ENVIRONMENT
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        Project not found or link has expired.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      <nav className="border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FolioLogo />
          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
          <span className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest hidden sm:block">Client Review Room</span>
        </div>
        <div className="flex items-center gap-3">
           <button
             onClick={() => {
               setIsTourOpen(true);
               setCurrentTourStep(0);
             }}
             className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-semibold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition"
             title="How to use the review interface"
           >
             <HelpCircle className="w-4 h-4" />
             <span className="hidden sm:inline">How to Review</span>
           </button>
           {project.status === 'approved' ? (
             <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20">
               <CheckCircle2 className="w-4 h-4" /> Final Approved
             </div>
           ) : project.status === 'needs_revision' ? (
             <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest bg-red-500/10 px-3 py-1.5 rounded border border-red-500/20">
               <AlertCircle className="w-4 h-4" /> Changes Requested
             </div>
           ) : (
             <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/20">
               <AlertCircle className="w-4 h-4" /> In Review
             </div>
           )}
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center p-4 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-5xl relative group">
            <div 
              className="relative w-full mx-auto bg-black rounded-lg overflow-hidden group shadow-2xl flex items-center justify-center"
              style={{
                aspectRatio: aspectRatio ? aspectRatio : 1.777,
                maxHeight: '82vh',
                maxWidth: aspectRatio ? `min(calc(82vh * ${aspectRatio}), 100%)` : 'none'
              }}
            >
              {project.raw_media_url ? (
                <BeforeAfterPlayer 
                  ref={playerRef}
                  rawUrl={project.raw_media_url}
                  finalUrl={project.media_url}
                  title={project.title}
                  videoRef={videoRef}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={(d) => {
                    setDuration(d);
                    if (videoRef.current) {
                      setAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight);
                    }
                  }}
                  onVideoClick={handleVideoClick}
                  onContextMenu={handleContextMenu}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  expanded={true}
                  hideControls={true}
                  initialMuted={false}
                  playing={isPlaying}
                  className="z-0"
                  subscriptionTier="premium" // Review room is a premium feature experience
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={project.media_url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      setDuration(video.duration);
                      setAspectRatio(video.videoWidth / video.videoHeight);
                    }}
                    onClick={handleVideoClick}
                  />

                  {/* Clickable overlay for play/comment (above video, below custom controls) */}
                  <div
                    onClick={handleVideoClick}
                    onContextMenu={handleContextMenu}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className={`absolute inset-0 z-10 select-none ${isLocked ? 'cursor-pointer' : 'cursor-crosshair'}`}
                  />
                </>
              )}

              {/* Big center play button when paused (only for standard video) */}
              {!isPlaying && !isCommenting && !project.raw_media_url && (
                <div 
                  onClick={togglePlay}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer"
                >
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <Play className="w-8 h-8 text-black fill-current" />
                  </div>
                </div>
              )}

              {/* Floating Add Correction Request Button when paused */}
              {!isPlaying && !isCommenting && !isLocked && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      videoRef.current?.pause();
                      setIsPlaying(false);
                      setIsCommenting(true);
                    }}
                    className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-2xl shadow-[#6366f1]/25 transition-all border border-[#818cf8]/50 hover:scale-105"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Add Correction at {formatTime(currentTime)}
                  </button>
                </motion.div>
              )}

              {/* Custom Controls Bar */}
              <div className="absolute bottom-0 left-0 right-0 z-[60] bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-8">
                {/* Scrubber */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full cursor-pointer mb-3 group/scrub relative">
                  <div 
                    className="h-full bg-white rounded-full relative transition-all"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity shadow-lg" />
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                      className="text-white hover:text-zinc-300 transition"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <span className="text-xs font-mono text-zinc-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    
                    {!isLocked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          videoRef.current?.pause();
                          setIsPlaying(false);
                          setIsCommenting(true);
                        }}
                        className="flex items-center gap-1.5 text-xs text-[#818cf8] hover:text-[#a5b4fc] bg-[#818cf8]/10 hover:bg-[#818cf8]/20 border border-[#818cf8]/25 rounded-md px-2.5 py-1 font-semibold uppercase tracking-wider transition ml-2 z-20 pointer-events-auto"
                        title="Add Comment at Current Time"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Comment</span>
                      </button>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (project.raw_media_url && playerRef.current) {
                        playerRef.current.toggleFullscreen();
                      } else if (videoRef.current) {
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          videoRef.current.requestFullscreen();
                        }
                      }
                    }}
                    className="text-zinc-400 hover:text-white transition p-2"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Timestamp Comment Overlay */}
              <AnimatePresence>
                {isCommenting && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-zinc-800 p-4 rounded-xl shadow-2xl w-[90%] max-w-md z-50 flex flex-col gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded">
                         Comment at {formatTime(currentTime)}
                       </span>
                       <button onClick={() => setIsCommenting(false)} className="text-zinc-500 hover:text-white">
                         <X className="w-4 h-4" />
                       </button>
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="Your Name" 
                      className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-zinc-600"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                    />
                    
                    <textarea 
                      placeholder="Type your feedback here..." 
                      className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 h-20 resize-none"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      autoFocus
                    />

                    <div className="flex justify-end">
                      <button 
                        className="bg-white text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 transition disabled:opacity-50"
                        onClick={submitComment}
                        disabled={isSubmitting}
                      >
                        <Send className="w-3 h-3" /> Post Comment
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">{project.title}</h1>
              <p className="text-zinc-400 text-sm font-light max-w-3xl">{project.description}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Feedback Area */}
        <div className="w-full lg:w-[400px] border-l border-zinc-900 bg-[#0a0a0a] flex flex-col h-[500px] lg:h-auto">
          <div className="p-6 border-b border-zinc-900">
             <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
               <MessageSquare className="w-4 h-4 text-zinc-500" /> Client Feedback
             </h3>
             <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
               Left-click or tap to play/pause. Right-click or long-press to add comment.
             </p>

             {/* Recorrection Policy Visual Metrics */}
             <div className="mt-4 grid grid-cols-2 gap-3">
               <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3 flex flex-col justify-between hover:border-zinc-700/50 transition">
                 <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Allowed Rounds</span>
                 <span className="text-lg font-bold tracking-tight text-white mt-1">{maxRecorrections}</span>
               </div>
               <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-3 flex flex-col justify-between hover:border-zinc-700/50 transition">
                 <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Remaining Rounds</span>
                 <span className={`text-lg font-bold tracking-tight mt-1 ${remainingCorrections > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>{remainingCorrections}</span>
               </div>
             </div>

             {project?.status === 'needs_revision' && allCommentsResolved && remainingCorrections === 0 && (
               <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[9px] text-amber-500/80 uppercase tracking-wider font-mono">
                 ⚠️ Correction limit reached. You can only Approve this version.
               </div>
             )}

             {/* Primary Sidebar Add-Comment Action */}
             {!isLocked && (
               <button
                 onClick={() => {
                   videoRef.current?.pause();
                   setIsPlaying(false);
                   setIsCommenting(true);
                 }}
                 className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/30 hover:border-[#6366f1]/50 text-[#818cf8] rounded-xl text-xs font-bold uppercase tracking-widest transition duration-300"
               >
                 <MessageSquare className="w-4 h-4" /> Request Correction at {formatTime(currentTime)}
               </button>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {comments.length === 0 ? (
               <div className="text-center py-12">
                 <div className="w-12 h-12 rounded-full border border-dashed border-zinc-700 flex items-center justify-center mx-auto mb-3">
                   <Clock className="w-5 h-5 text-zinc-600" />
                 </div>
                 <p className="text-sm text-zinc-400">No revisions requested yet.</p>
               </div>
             ) : (
               comments.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0)).map((comment, idx) => (
                 <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   key={comment.id || idx}
                   className={`bg-[#111] border p-4 rounded-lg group transition ${
                     comment.is_resolved 
                       ? 'border-zinc-900/50 opacity-50' 
                       : comment.is_draft
                         ? 'border-dashed border-[#818cf8]/40 shadow-[0_0_15px_rgba(129,140,248,0.03)]'
                         : 'border-zinc-800 hover:border-zinc-700'
                   }`}
                 >
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-white">{comment.author_name}</span>
                     <div className="flex items-center gap-2">
                       <span 
                         className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-zinc-800 transition cursor-pointer"
                         onClick={() => jumpToTime(comment.timestamp)}
                       >
                         <PlayCircle className="w-3 h-3" /> {formatTime(comment.timestamp)}
                       </span>
                       {comment.is_draft && (
                         <span className="text-[8px] uppercase tracking-widest font-black bg-[#818cf8]/15 text-[#818cf8] px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#818cf8]/25 animate-pulse">
                           Draft
                         </span>
                       )}
                       {comment.is_resolved && (
                         <span className="text-[8px] uppercase tracking-widest font-black bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                           <Check className="w-2.5 h-2.5" /> Resolved
                         </span>
                       )}
                       {/* Edit / Delete actions */}
                       {!isLocked && !comment.is_resolved && (
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           {editingCommentId === comment.id ? (
                             <button
                               onClick={() => saveEdit(comment.id)}
                               className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition"
                               title="Save"
                             >
                               <Check className="w-3 h-3" />
                             </button>
                           ) : (
                             <button
                               onClick={() => startEditing(comment)}
                               className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition"
                               title="Edit"
                             >
                               <Pencil className="w-3 h-3" />
                             </button>
                           )}
                           <button
                             onClick={() => deleteComment(comment.id)}
                             className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition"
                             title="Delete"
                           >
                             <Trash2 className="w-3 h-3" />
                           </button>
                         </div>
                       )}
                     </div>
                   </div>
                   {editingCommentId === comment.id && !isLocked ? (
                     <textarea
                       className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 resize-none h-16"
                       value={editingText}
                       onChange={(e) => setEditingText(e.target.value)}
                       autoFocus
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           saveEdit(comment.id);
                         }
                         if (e.key === 'Escape') setEditingCommentId(null);
                       }}
                     />
                   ) : (
                     <p className={`text-sm font-light leading-relaxed ${comment.is_resolved ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                       {comment.text}
                     </p>
                   )}
                 </motion.div>
               ))
             )}
          </div>
          
          {/* Quick Guide */}
          <div className="p-6 border-t border-zinc-900 bg-zinc-900/10">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-4 flex items-center gap-2">
              <HelpCircle className="w-3 h-3" /> Reviewer Guide
            </h4>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1">Desktop</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-400">L</div>
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider">Play / Pause</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-400">R</div>
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider">Comment</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1">Mobile</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-400">T</div>
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider">Play / Pause</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] text-zinc-400">H</div>
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wider">Comment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Action Buttons */}
          {(canApprove || canRequestChanges) && (
            <div className="p-4 border-t border-zinc-900 flex gap-3">
              {canApprove && (
                <button
                  onClick={() => updateStatus('approved')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition"
                >
                  <ThumbsUp className="w-4 h-4" /> Approve
                </button>
              )}
              {canRequestChanges && (
                <button
                  onClick={() => updateStatus('needs_revision')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition"
                >
                  <ThumbsDown className="w-4 h-4" /> Request Changes
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Custom Premium Theme Dialog Popup */}
      <AnimatePresence>
        {customDialog && customDialog.isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={customDialog.onCancel ? customDialog.onCancel : () => {}}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="relative bg-[#050505] border border-zinc-900 p-8 rounded-2xl max-w-sm w-full shadow-2xl font-sans text-left z-10"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">System Notification</span>
              </div>
              <p className="text-sm font-light leading-relaxed text-zinc-300 mb-8">
                {customDialog.message}
              </p>
              <div className="flex justify-end gap-3">
                {customDialog.type === 'confirm' && (
                  <button 
                    type="button" 
                    onClick={customDialog.onCancel}
                    className="px-4 py-2 border border-zinc-900 rounded text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 transition active:scale-95"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={customDialog.onConfirm}
                  className={`px-4 py-2 rounded text-[10px] uppercase font-mono font-bold tracking-widest transition active:scale-95 shadow-md ${
                    customDialog.isDestructive 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Guided Tour Modal */}
      <AnimatePresence>
        {isTourOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => {
                setIsTourOpen(false);
                localStorage.setItem(`foliohub_review_tour_completed_${resolvedParams.projectId}`, 'true');
              }}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-zinc-950/90 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl z-10 overflow-hidden flex flex-col gap-6"
            >
              {/* Decorative top lights */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#6366f1]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#818cf8]/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 font-bold">Guided Client Tour</span>
                </div>
                <button 
                  onClick={() => {
                    setIsTourOpen(false);
                    localStorage.setItem(`foliohub_review_tour_completed_${resolvedParams.projectId}`, 'true');
                  }}
                  className="text-zinc-500 hover:text-white text-xs font-mono uppercase tracking-widest hover:bg-zinc-900/50 px-2 py-1 rounded"
                >
                  Skip
                </button>
              </div>

              {/* Step Graphic Illustration */}
              <div className="h-44 w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#6366f1]/5 via-transparent to-transparent opacity-50" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTourStep}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-4 text-center p-6 w-full"
                  >
                    {currentTourStep === 0 && (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[#818cf8] shadow-lg">
                          <HelpCircle className="w-8 h-8 animate-bounce" />
                        </div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#818cf8] font-bold">Foliohub Video Review</p>
                      </>
                    )}
                    {/* If raw URL exists, Step 1 (index 1) is before-after compare */}
                    {project?.raw_media_url && currentTourStep === 1 && (
                      <>
                        <div className="w-24 h-14 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between p-2 relative shadow-lg overflow-hidden">
                          <div className="w-[45%] h-full bg-[#6366f1]/20 border-r border-[#6366f1] flex items-center justify-center text-[8px] text-[#818cf8] font-mono">RAW</div>
                          <div className="w-[50%] h-full flex items-center justify-center text-[8px] text-zinc-500 font-mono">EDITED</div>
                          <div className="absolute top-1/2 left-[45%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg cursor-ew-resize">
                            <span className="w-1.5 h-1.5 bg-[#6366f1] rounded-full" />
                          </div>
                        </div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#818cf8] font-bold">Drag Center Split-Slider</p>
                      </>
                    )}
                    {/* Comment step */}
                    {((project?.raw_media_url && currentTourStep === 2) || (!project?.raw_media_url && currentTourStep === 1)) && (
                      <>
                        <div className="flex gap-2 items-center">
                          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[#818cf8] shadow-lg">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <div className="text-zinc-600 font-mono text-sm">→</div>
                          <div className="bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/30 rounded-lg px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest font-black shadow-lg">
                            + Add Correction
                          </div>
                        </div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#818cf8] font-bold">Pin Feedback to Exact Frame</p>
                      </>
                    )}
                    {/* Sidebar step */}
                    {((project?.raw_media_url && currentTourStep === 3) || (!project?.raw_media_url && currentTourStep === 2)) && (
                      <>
                        <div className="w-24 h-14 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-1.5 p-2 shadow-lg mx-auto">
                          <div className="h-4 bg-[#818cf8]/10 rounded flex items-center justify-between px-1.5">
                            <span className="w-8 h-1 bg-[#818cf8]/30 rounded" />
                            <span className="text-[7px] font-mono text-[#818cf8] bg-zinc-900 px-1 rounded">0:15</span>
                          </div>
                          <div className="h-4 bg-zinc-900/50 rounded flex items-center justify-between px-1.5 opacity-60">
                            <span className="w-10 h-1 bg-zinc-700 rounded" />
                            <span className="text-[7px] font-mono text-zinc-500 bg-zinc-950 px-1 rounded">0:32</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#818cf8] font-bold">Interactive Playlist Bookmarks</p>
                      </>
                    )}
                    {/* Finalize step */}
                    {((project?.raw_media_url && currentTourStep === 4) || (!project?.raw_media_url && currentTourStep === 3)) && (
                      <>
                        <div className="flex gap-2">
                          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold shadow-lg">
                            <ThumbsUp className="w-3.5 h-3.5" /> Approve
                          </div>
                          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold shadow-lg">
                            <ThumbsDown className="w-3.5 h-3.5" /> Revision
                          </div>
                        </div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#818cf8] font-bold">One-Click Handoff</p>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Text Description */}
              <div className="space-y-2 min-h-[90px] flex flex-col justify-center">
                <motion.h4 
                  key={`t-${currentTourStep}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-base font-bold text-white uppercase tracking-wide"
                >
                  {
                    [
                      {
                        title: "Welcome to your Review Room",
                        description: "This is a private, secure viewport created by your editor. Let's take a quick 30-second tour to see how to review this project and provide feedback."
                      },
                      ...(project?.raw_media_url ? [{
                        title: "Before & After Compare",
                        description: "If your editor uploaded the raw file, you can drag the slider in the center of the video left & right to compare the Raw Master Footage against the Final Graded version in real-time!"
                      }] : []),
                      {
                        title: "Add Point-and-Click Corrections",
                        description: "Found something to adjust? Simply pause the video and click any of the '+ Request Correction' buttons (or right-click the video) to pinpoint feedback to that exact frame. No manual lists or timestamp typing required!"
                      },
                      {
                        title: "Interactive Feedback Sidebar",
                        description: "All client requests are compiled in the sidebar. Click any comment's timestamp to jump the video directly to that frame, letting you instantly verify the scene."
                      },
                      {
                        title: "Submit Revisions or Approve",
                        description: "When you finish reviewing, click 'Approve' if everything is perfect, or 'Request Changes' if you've added corrections. Your editor will be notified instantly to start the next round!"
                      }
                    ][currentTourStep]?.title
                  }
                </motion.h4>
                <motion.p 
                  key={`d-${currentTourStep}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-xs text-zinc-400 font-light leading-relaxed"
                >
                  {
                    [
                      {
                        title: "Welcome to your Review Room",
                        description: "This is a private, secure viewport created by your editor. Let's take a quick 30-second tour to see how to review this project and provide feedback."
                      },
                      ...(project?.raw_media_url ? [{
                        title: "Before & After Compare",
                        description: "If your editor uploaded the raw file, you can drag the slider in the center of the video left & right to compare the Raw Master Footage against the Final Graded version in real-time!"
                      }] : []),
                      {
                        title: "Add Point-and-Click Corrections",
                        description: "Found something to adjust? Simply pause the video and click any of the '+ Request Correction' buttons (or right-click the video) to pinpoint feedback to that exact frame. No manual lists or timestamp typing required!"
                      },
                      {
                        title: "Interactive Feedback Sidebar",
                        description: "All client requests are compiled in the sidebar. Click any comment's timestamp to jump the video directly to that frame, letting you instantly verify the scene."
                      },
                      {
                        title: "Submit Revisions or Approve",
                        description: "When you finish reviewing, click 'Approve' if everything is perfect, or 'Request Changes' if you've added corrections. Your editor will be notified instantly to start the next round!"
                      }
                    ][currentTourStep]?.description
                  }
                </motion.p>
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-between border-t border-zinc-900 pt-6">
                {/* Dots Indicator */}
                <div className="flex gap-1.5">
                  {(project?.raw_media_url ? [0, 1, 2, 3, 4] : [0, 1, 2, 3]).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentTourStep ? 'w-5 bg-[#6366f1]' : 'w-1.5 bg-zinc-800'}`} 
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentTourStep > 0 && (
                    <button 
                      onClick={() => setCurrentTourStep(currentTourStep - 1)}
                      className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const maxStep = project?.raw_media_url ? 4 : 3;
                      if (currentTourStep < maxStep) {
                        setCurrentTourStep(currentTourStep + 1);
                      } else {
                        setIsTourOpen(false);
                        localStorage.setItem(`foliohub_review_tour_completed_${resolvedParams.projectId}`, 'true');
                      }
                    }}
                    className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-md"
                  >
                    {currentTourStep === (project?.raw_media_url ? 4 : 3) ? "Get Started" : "Next"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
