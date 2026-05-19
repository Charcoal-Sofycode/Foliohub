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
    if (!project || project.status === 'approved') return;
    
    videoRef.current?.pause();
    setIsCommenting(true);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      isLongPress.current = false;
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        if (project && project.status !== 'approved') {
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
      alert("Please enter your name and a comment.");
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
      alert("Failed to submit comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`${API_URL}/comments/${commentId}`, { method: "DELETE" });
      fetchComments();
    } catch (err) {
      console.error(err);
    }
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
            <div className="relative w-fit mx-auto bg-black rounded-lg overflow-hidden group shadow-2xl flex items-center justify-center min-h-[400px] min-w-[300px]">
              {project.raw_media_url ? (
                <BeforeAfterPlayer 
                  ref={playerRef}
                  rawUrl={project.raw_media_url}
                  finalUrl={project.media_url}
                  title={project.title}
                  videoRef={videoRef}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
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
                    className="w-full h-full"
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onClick={handleVideoClick}
                  />

                  {/* Clickable overlay for play/comment (above video, below custom controls) */}
                  <div
                    onClick={handleVideoClick}
                    onContextMenu={handleContextMenu}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="absolute inset-0 z-10 cursor-crosshair select-none"
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
                       {comment.is_resolved && (
                         <span className="text-[8px] uppercase tracking-widest font-black bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                           <Check className="w-2.5 h-2.5" /> Resolved
                         </span>
                       )}
                       {/* Edit / Delete actions */}
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
                     </div>
                   </div>
                   {editingCommentId === comment.id ? (
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
          {project.status !== 'approved' && (
            <div className="p-4 border-t border-zinc-900 flex gap-3">
              <button
                onClick={() => updateStatus('approved')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition"
              >
                <ThumbsUp className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => updateStatus('needs_revision')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition"
              >
                <ThumbsDown className="w-4 h-4" /> Request Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
