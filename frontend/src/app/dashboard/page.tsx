// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import FolioLogo from '@/components/FolioLogo';
import PortfolioPlayer from '@/components/PortfolioPlayer';
import BeforeAfterPlayer from '@/components/BeforeAfterPlayer';
import ProjectStoryTimeline from '@/components/ProjectStoryTimeline';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

import { 
  UploadCloud, 
  Settings, 
  BarChart, 
  Grid, 
  LogOut, 
  X, 
  CheckCircle2,
  Share2,
  Eye,
  Link as LinkIcon,
  Play,
  Activity,
  Zap,
  Check,
  Shield,
  Sparkles,
  Mail,
  Trash2,
  Edit,
  Save,
  AlertCircle
} from 'lucide-react';
export default function DashboardPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 font-medium">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
        <p className="tracking-widest uppercase text-xs">Loading Dashboard</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subdomain, setSubdomain] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('projects');
  const [subTier, setSubTier] = useState('free');

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadRole, setUploadRole] = useState("");
  const [uploadTools, setUploadTools] = useState("");
  const [uploadTimeline, setUploadTimeline] = useState("");
  const [uploadProjectFile, setUploadProjectFile] = useState<File | null>(null);
  const [uploadRawFile, setUploadRawFile] = useState<File | null>(null);
  
  // Edit State
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);


  // Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  // Leads/Inquiries State
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isInquiriesLoading, setIsInquiriesLoading] = useState(false);

  // New: Payment status notification
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    const initializeDashboard = async () => {
      // initial fetch
      await fetchPortfolio();
      
      if (sessionId) {
        setIsVerifyingPayment(true);
        try {
          const res = await api.get(`/verify-session/${sessionId}`);
          if (res.data.status === 'premium') {
             setSubTier('premium');
          }
        } catch(e) {
             console.error("Payment Verification Error", e);
        } finally {
             setIsVerifyingPayment(false);
        }
      }
    };

    initializeDashboard();
  }, [sessionId]);

  // REACTIVE POLLING: Automatically starts when any project is pending/processing
  useEffect(() => {
    if (!portfolio?.projects) return;

    const needsPolling = portfolio.projects.some((p: any) => 
      p.transcoding_status === 'pending' || p.transcoding_status === 'processing'
    );

    if (!needsPolling) return;

    console.log("DEBUG: Processing detected. Starting background sync...");
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get('/portfolios/me');
        // Check if we still need to poll based on the NEW data
        const stillWorking = res.data.projects?.some((p: any) => 
          p.transcoding_status === 'pending' || p.transcoding_status === 'processing'
        );

        setPortfolio(res.data);

        if (!stillWorking) {
          console.log("DEBUG: All assets finalized. Polling terminated.");
          clearInterval(pollInterval);
        }
      } catch (e) {
        console.error("Polling Sync Error", e);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [portfolio?.projects]); // Dependency on projects array allows detecting new uploads and status changes


  const fetchPortfolio = async () => {
    try {
      const [portRes, userRes] = await Promise.all([
        api.get('/portfolios/me'),
        api.get('/users/me')
      ]);
      setPortfolio(portRes.data);
      setSubTier(userRes.data.subscription_tier);
      setTwoFactorEnabled(userRes.data.is_2fa_enabled);
      setIsLoading(false);

    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error("Failed to load portfolio", err);
      }
      setIsLoading(false);
    }
  };

  const fetchInquiries = async () => {
    setIsInquiriesLoading(true);
    try {
      const res = await api.get('/inquiries/me');
      setInquiries(res.data);
    } catch (err) {
      console.error("Failed to load inquiries", err);
    } finally {
      setIsInquiriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inquiries') {
      fetchInquiries();
    }
  }, [activeTab]);

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/portfolios', { subdomain });
      setPortfolio(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to claim subdomain.');
    }
  };


  const uploadToS3Direct = async (file: File, onProgress?: (pct: number) => void) => {
    try {
      // 1. Get upload params from our backend
      const res = await api.get(`/generate-upload-url?file_name=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(file.type)}`);
      const { url, fields, object_key } = res.data;

      // 2. Construct form data for S3
      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
      formData.append('file', file);

      // 3. Perform the actual upload to S3 directly
      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        
        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(object_key);
          } else {
            console.error("S3 Response:", xhr.responseText);
            reject(new Error(`S3 Upload Failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network Error during S3 Upload'));
        xhr.send(formData);
      });
    } catch (err) {
      console.error("Presigned URL error:", err);
      throw err;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Step 1: Upload heavy files directly to S3
      // We do this in sequence or parallel. For stability, let's do sequential or handle progress aggregate.
      let media_key = "";
      let raw_media_key = "";
      let project_file_key = "";

      // Track progress across all files
      setUploadProgress(10); // Start
      
      console.log("Starting direct S3 uploads...");
      
      // Upload Main File
      media_key = await uploadToS3Direct(selectedFile, (p) => setUploadProgress(10 + (p * 0.4)));

      // Upload Raw File if exists
      if (uploadRawFile) {
        setUploadProgress(50);
        raw_media_key = await uploadToS3Direct(uploadRawFile, (p) => setUploadProgress(50 + (p * 0.2)));
      }

      // Upload Project File if exists
      if (uploadProjectFile) {
        setUploadProgress(70);
        project_file_key = await uploadToS3Direct(uploadProjectFile, (p) => setUploadProgress(70 + (p * 0.2)));
      }

      setUploadProgress(95);

      // Step 2: Notify Backend with the S3 keys
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('description', uploadDesc);
      formData.append('project_type', 'video');
      formData.append('category', uploadCategory);
      
      formData.append('media_key', media_key);
      if (raw_media_key) formData.append('raw_media_key', raw_media_key);
      if (project_file_key) formData.append('project_file_key', project_file_key);
      
      if (uploadRole) formData.append('role', uploadRole);
      if (uploadTools) formData.append('tools_used', uploadTools);
      if (uploadTimeline) formData.append('timeline_breakdown', uploadTimeline);

      await api.post('/projects', formData);

      setUploadProgress(100);

      setTimeout(async () => {
        await fetchPortfolio();
        setUploadTitle('');
        setUploadDesc('');
        setUploadCategory('general');
        setUploadRole('');
        setUploadTools('');
        setUploadTimeline('');
        setSelectedFile(null);
        setUploadProjectFile(null);
        setUploadRawFile(null);
        setIsUploading(false);
        setUploadProgress(0);
        setIsModalOpen(false); // Close modal automatically
      }, 1000);
      
    } catch (err: any) {
      console.error("Direct Upload Error:", err);
      setError('Upload failed. Huge files might require high-speed internet or multiple attempts.');
      setIsUploading(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this masterpiece forever? This action cannot be undone.')) return;
    
    setIsDeletingId(id);
    try {
      await api.delete(`/projects/${id}`);
      await fetchPortfolio();
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Failed to delete project.");
    } finally {
      setIsDeletingId(null);
    }
  };

  const openEditModal = (project: any) => {
    setEditingProject(project);
    setUploadTitle(project.title);
    setUploadDesc(project.description || "");
    setUploadCategory(project.category || "general");
    setUploadRole(project.role || "");
    setUploadTools(project.tools_used || "");
    setUploadTimeline(project.timeline_breakdown || "");
    setIsModalOpen(true);
  };

  const handleUpdateProjectMetadata = async () => {
    if (!editingProject) return;
    setIsUploading(true);
    try {
      await api.put(`/projects/${editingProject.id}`, {
        title: uploadTitle,
        description: uploadDesc,
        category: uploadCategory,
        role: uploadRole,
        tools_used: uploadTools,
        timeline_breakdown: uploadTimeline
      });
      
      await fetchPortfolio();
      closeModal();
    } catch (err) {
      console.error("Update Error:", err);
      alert("Failed to update metadata.");
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setUploadTitle("");
    setUploadDesc("");
    setUploadCategory("general");
    setUploadRole("");
    setUploadTools("");
    setUploadTimeline("");
    setSelectedFile(null);
    setUploadProjectFile(null);
    setUploadRawFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };



  const handleUpdatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      const res = await api.put('/portfolios/me', data);
      setPortfolio(res.data);
      alert('Portfolio Updated!');
    } catch(err) {
      console.error(err);
      alert('Failed to update portfolio');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleDowngrade = async () => {
    const confirm = window.confirm("Are you sure you want to downgrade? Your premium features will be removed immediately. No refunds are provided for the remaining period.");
    if (!confirm) return;

    try {
      await api.post('/downgrade');
      await fetchPortfolio();
      alert("Plan successfully downgraded to Free.");
    } catch (err) {
      console.error(err);
      alert("Failed to downgrade plan.");
    }
  };

  const handleDeleteInquiry = async (id: number) => {
    if (!confirm("Remove this lead permanently? This cannot be undone.")) return;
    try {
      await api.delete(`/inquiries/${id}`);
      fetchInquiries();
    } catch (e) {
      alert("Failed to delete inquiry.");
    }
  };

  const handleReportInquiry = async (id: number) => {
    if (!confirm("Report this lead as spam/unusual to the Sofycode Security Team?")) return;
    try {
      await api.post(`/inquiries/${id}/report`);
      alert("Report submitted. Thank you for keeping Foliohub safe.");
      fetchInquiries();
    } catch (e) {
      alert("Failed to submit report.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-500 font-medium">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
        <p className="tracking-widest uppercase text-xs">Initializing Environment</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black font-sans">
      {isVerifyingPayment && (
        <div className="fixed top-0 inset-x-0 z-[200] bg-blue-600 text-white py-3 text-center text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
           Synchronizing Premium Clearance... Please wait.
        </div>
      )}
      {!portfolio ? (
        // --- SETUP MODE ---
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
             <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-20 filter grayscale"
                src="https://www.w3schools.com/html/mov_bbb.mp4" 
              />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-10" />

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg z-20"
          >
            <div className="flex justify-center mb-12">
              <FolioLogo iconSize={32} className="text-3xl" />
            </div>

            <div className="bg-[#0a0a0a] border border-zinc-800/50 p-10 rounded-2xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <h1 className="text-3xl font-black mb-3 tracking-tight">Claim your territory.</h1>
              <p className="text-zinc-400 mb-8 font-light text-sm">Secure your unique subdomain. This is where your masterworks will live.</p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm font-mono">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreatePortfolio} className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] font-medium text-zinc-500 mb-4">Workspace URL</label>
                  <div className="relative flex items-center group">
                    <input 
                      type="text" 
                      placeholder="yourname"
                      className="w-full py-4 pl-0 pr-40 bg-transparent border-b-2 border-zinc-800 focus:border-white outline-none transition-colors text-white font-medium text-lg placeholder-zinc-800"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      required
                    />
                    <span className="absolute right-0 text-zinc-600 pointer-events-none font-medium">
                      .yourplatform.com
                    </span>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest text-sm transition duration-200 mt-4 flex items-center justify-center gap-2"
                >
                  Initialize Hub
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      ) : (
        // --- ACTIVE DASHBOARD MODE ---
        <div className="flex h-screen overflow-hidden bg-[#050505] flex-col md:flex-row">
          
          {/* SIDEBAR */}
          <aside className="w-72 border-r border-zinc-900 bg-[#050505] flex-col justify-between hidden md:flex shrink-0">
            <div>
              <div className="p-8 border-b border-zinc-900">
                <FolioLogo iconSize={24} />
              </div>


              <div className="px-6 py-8 flex flex-col gap-2">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-600 mb-4 pl-4">Menu</p>
                
                <button 
                  onClick={() => setActiveTab('projects')}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition font-medium text-sm tracking-wide ${activeTab === 'projects' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  <Grid className="w-4 h-4" /> Assets
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition font-medium text-sm tracking-wide ${activeTab === 'analytics' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  <BarChart className="w-4 h-4" /> Telemetry
                </button>
                <button 
                  onClick={() => setActiveTab('inquiries')}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition font-medium text-sm tracking-wide ${activeTab === 'inquiries' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  <Mail className="w-4 h-4" /> Incoming Leads
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition font-medium text-sm tracking-wide ${activeTab === 'settings' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  <Settings className="w-4 h-4" /> Configuration
                </button>
                <button 
                  onClick={() => setActiveTab('billing')}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition font-medium text-sm tracking-wide ${activeTab === 'billing' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  <Zap className="w-4 h-4" /> Upgrade Plan
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-900">
              <div className="bg-zinc-900/50 rounded-lg p-4 mb-4 border border-zinc-800">
                <p className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-[0.2em]">Live Production Status</p>
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => {
                   const shareUrl = window.location.origin + `/p/${portfolio.subdomain}`;
                   copyToClipboard(shareUrl);
                }}>
                  <span className="text-sm font-medium text-white truncate pr-2">/p/{portfolio.subdomain}</span>
                  <LinkIcon className="w-3 h-3 text-zinc-500 group-hover:text-white transition" />
                </div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-500 hover:text-white hover:bg-red-500/10 transition font-medium text-sm">
                <LogOut className="w-4 h-4" /> Disconnect
              </button>
            </div>
          </aside>

          {/* MOBILE BOTTOM NAV */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#050505] border-t border-zinc-900 flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
            {[
              { id: 'projects', icon: <Grid className="w-5 h-5" />, label: 'Assets' },
              { id: 'analytics', icon: <BarChart className="w-5 h-5" />, label: 'Stats' },
              { id: 'inquiries', icon: <Mail className="w-5 h-5" />, label: 'Leads' },
              { id: 'settings', icon: <Settings className="w-5 h-5" />, label: 'Config' },
              { id: 'billing', icon: <Zap className="w-5 h-5" />, label: 'Plan' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition min-w-0 flex-1 ${
                  activeTab === tab.id
                    ? 'text-white bg-zinc-900'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="text-[9px] uppercase tracking-widest font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 overflow-y-auto p-4 md:p-12 relative scroll-smooth bg-[#0a0a0a] pb-24 md:pb-12">
            <div className="max-w-6xl mx-auto pb-24">
              
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 border-b border-zinc-900 pb-8">
                <div>
                  <h2 className="text-4xl font-bold tracking-tighter mb-2 capitalize">{activeTab}</h2>
                  <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Master Control Panel</p>
                </div>
                {activeTab === 'projects' && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:bg-zinc-200 transition active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" /> Ingest Media
                  </button>
                )}
              </header>

              {activeTab === 'projects' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8"
                >
                  {portfolio.projects?.length > 0 ? (
                     portfolio.projects.map((project: any, i: number) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={project.id} 
                        className="bg-[#050505] border border-zinc-900 rounded-xl overflow-hidden group hover:border-zinc-700 transition duration-300 flex flex-col"
                      >
                        <div className="aspect-video bg-black relative overflow-hidden flex-shrink-0">
                          {project.raw_media_url && project.media_url ? (
                            <BeforeAfterPlayer rawUrl={project.raw_media_url} finalUrl={project.media_url} title={project.title} />
                          ) : project.media_url ? (
                            <PortfolioPlayer 
                              url={project.media_url} 
                              title={project.title}
                              optimizedUrl={project.optimized_url}
                              transcodingStatus={project.transcoding_status}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-800">
                              <Play className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] uppercase font-mono tracking-widest px-2 py-1 rounded-sm border border-white/10 pointer-events-none">
                             Video
                          </div>
                          
                          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 openEditModal(project);
                               }}
                               className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition pointer-events-auto"
                               title="Edit Metadata"
                             >
                               <Edit className="w-3.5 h-3.5" />
                             </button>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteProject(project.id);
                               }}
                               className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition pointer-events-auto"
                               title="Delete Project"
                             >
                               {isDeletingId === project.id ? (
                                 <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                               ) : (
                                 <Trash2 className="w-3.5 h-3.5" />
                               )}
                             </button>
                          </div>


                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-lg font-bold truncate text-white mb-2">{project.title}</h3>
                          <p className="text-zinc-500 text-sm line-clamp-2 font-light flex-1">{project.description || 'No metadata provided.'}</p>
                          <div className="mt-6 flex items-center justify-between border-t border-zinc-900 pt-4">
                             <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {project.view_count || 0}</span>
                              <span className="flex items-center gap-1.5 text-white/50"><CheckCircle2 className="w-3.5 h-3.5" /> Published</span>
                            </div>
                          </div>
                        </div>
                        {/* ── Project Story Timeline ── */}
                        <ProjectStoryTimeline
                          projectId={project.id}
                          projectTitle={project.title}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-[#050505]">
                      <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6">
                        <UploadCloud className="w-6 h-6 text-zinc-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Empty Repository</h3>
                      <p className="text-zinc-500 mb-8 text-center max-w-sm text-sm font-light">Your portfolio is currently blank. Ingest your first major edit to begin.</p>
                      <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 border border-zinc-700 text-white text-xs uppercase tracking-widest font-bold rounded-sm hover:bg-white hover:text-black transition"
                      >
                        Initiate Upload
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(() => {
                      const totalViews = portfolio.projects?.reduce((acc: number, p: any) => acc + (p.view_count || 0), 0) || 0;
                      const avgViews = portfolio.projects?.length > 0 ? Math.round(totalViews / portfolio.projects.length) : 0;
                      const verifiedCount = portfolio.projects?.filter((p: any) => p.is_verified).length || 0;
                      const verificationRate = portfolio.projects?.length > 0 
                        ? Math.round((verifiedCount / portfolio.projects.length) * 100) 
                        : 0;

                      return [
                        { label: "Total Impressions", value: totalViews.toLocaleString(), growth: "+0.0%", detail: "All-time views" },
                        { label: "Avg. Engagement", value: avgViews.toLocaleString(), growth: "+0.0%", detail: "Per asset" },
                        { label: "Verification Score", value: `${verificationRate}%`, growth: "Strict", detail: "Proof of work" }
                      ].map((kpi, i) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          key={kpi.label} 
                          className="bg-[#050505] border border-zinc-900 p-8 rounded-xl flex flex-col justify-between"
                        >
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-6">{kpi.label}</p>
                          <div className="flex items-end justify-between">
                            <h3 className="text-4xl font-black text-white tracking-tighter">{kpi.value}</h3>
                            <span className="text-[10px] font-mono tracking-widest text-zinc-600">{kpi.growth}</span>
                          </div>
                        </motion.div>
                      ));
                    })()}
                  </div>

                  {/* Main Activity Chart */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#050505] border border-zinc-900 p-8 rounded-xl">
                    <div className="flex items-center justify-between mb-12">
                      <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-white" /> Network Activity
                      </h4>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 border border-zinc-800 px-3 py-1 rounded-full">Last 30 Days</div>
                    </div>
                    
                    <div className="h-64 flex items-end justify-between gap-1 md:gap-2">
                       {Array.from({ length: 30 }).map((_, i) => {
                         const height = 20 + Math.random() * 80; // random height %
                         const isPeak = height > 90;
                         return (
                           <div key={i} className="w-full flex flex-col items-center justify-end h-full group relative">
                             {/* Tooltip */}
                             <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-white text-black text-[10px] font-mono font-bold px-2 py-1 rounded transition-opacity pointer-events-none z-10">
                                {Math.floor(height * 142)}
                             </div>
                             {/* Bar */}
                             <motion.div 
                               initial={{ height: 0 }} 
                               animate={{ height: `${height}%` }} 
                               transition={{ delay: 0.4 + i * 0.02, ease: "easeOut", duration: 1 }}
                               className={`w-full rounded-t-sm transition-colors ${isPeak ? 'bg-white' : 'bg-zinc-800 group-hover:bg-zinc-600'}`}
                             />
                           </div>
                         );
                       })}
                    </div>
                  </motion.div>

                  {/* Top Projects */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-[#050505] border border-zinc-900 rounded-xl overflow-hidden">
                     <div className="p-8 border-b border-zinc-900">
                        <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-white" /> Top Performing Edits
                        </h4>
                     </div>
                     <div className="divide-y divide-zinc-900">
                       {portfolio.projects?.length > 0 ? (
                         [...portfolio.projects]
                           .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
                           .slice(0, 5)
                           .map((project: any, i: number) => (
                             <div key={project.id} className="p-6 px-8 flex items-center justify-between hover:bg-zinc-900/50 transition">
                               <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-400">0{i+1}</div>
                                  <div>
                                     <p className="font-bold text-white text-sm tracking-tight">{project.title}</p>
                                     <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{project.category || 'General'}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="font-bold text-white tracking-tight">{(project.view_count || 0).toLocaleString()}</p>
                                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Views</p>
                               </div>
                             </div>
                           ))
                       ) : (
                          <div className="p-12 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">No data mapped yet.</div>
                       )}
                     </div>
                  </motion.div>

                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#050505] border border-zinc-900 rounded-xl p-8 lg:p-12 max-w-3xl">
                   <form onSubmit={handleUpdatePortfolio} className="space-y-10">
                     <div>
                       <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Primary Domain</label>
                       <input disabled type="text" value={portfolio.subdomain + ".yourplatform.com"} className="w-full bg-transparent border-b-2 border-zinc-800 py-3 text-lg text-zinc-500 cursor-not-allowed font-light" />
                     </div>
                     <div className="grid grid-cols-2 gap-8">
                       <div>
                         <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Portfolio Title</label>
                         <input name="title" type="text" defaultValue={portfolio.title} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                       </div>
                       <div>
                         <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Location</label>
                         <input name="location" type="text" defaultValue={portfolio.location || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                       </div>
                     </div>
                     <div>
                       <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Bio</label>
                       <textarea name="bio" defaultValue={portfolio.bio || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors h-24 resize-none" />
                     </div>
                     <div className="grid grid-cols-2 gap-8">
                       <div>
                         <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Skills (comma separated)</label>
                         <input name="skills" type="text" defaultValue={portfolio.skills || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                       </div>
                       <div>
                         <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Availability</label>
                         <input name="availability" type="text" defaultValue={portfolio.availability || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                       </div>
                     </div>
                     <div className="pt-8 border-t border-zinc-900">
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Skill Heatmap Metrics (0-100)</label>
                        <p className="text-xs text-zinc-600 mb-6 font-light">Set your base proficiency levels. These will be visually plotted on your public studio.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div>
                              <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Cutting Speed</label>
                              </div>
                              <input name="skill_cutting" type="range" min="0" max="100" defaultValue={portfolio.skill_cutting || 50} className="w-full accent-white" />
                           </div>
                           <div>
                              <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Motion Graphics</label>
                              </div>
                              <input name="skill_motion" type="range" min="0" max="100" defaultValue={portfolio.skill_motion || 50} className="w-full accent-white" />
                           </div>
                           <div>
                              <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">Color Grading</label>
                              </div>
                              <input name="skill_color" type="range" min="0" max="100" defaultValue={portfolio.skill_color || 50} className="w-full accent-white" />
                           </div>
                        </div>
                     </div>
                     <div className="pt-8 border-t border-zinc-900">
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Showreel & Connect</label>
                        <div className="space-y-6">
                           <input name="showreel_url" type="text" placeholder="Showreel YouTube/Vimeo ID" defaultValue={portfolio.showreel_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="youtube_url" type="text" placeholder="YouTube Channel URL" defaultValue={portfolio.youtube_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="instagram_url" type="text" placeholder="Instagram URL" defaultValue={portfolio.instagram_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="booking_link" type="text" placeholder="Booking Link (Calendly)" defaultValue={portfolio.booking_link || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                        </div>
                     </div>
                     <div className="pt-8 border-t border-zinc-900">
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Security & Access</label>
                        <div className="bg-black border border-zinc-800 p-6 rounded-lg flex items-center justify-between">
                           <div>
                              <h4 className="font-bold text-white mb-1">Two-Factor Authentication</h4>
                              <p className="text-sm text-zinc-500">Require an email code for all unrecognized studio accesses.</p>
                           </div>
                           <button 
                             disabled={twoFactorEnabled || twoFactorLoading}
                             onClick={async () => {
                               setTwoFactorLoading(true);
                               try {
                                 await api.post('/enable-2fa');
                                 setTwoFactorEnabled(true);
                               } catch(e) {
                                 console.error("2FA Error", e);
                               } finally {
                                 setTwoFactorLoading(false);
                               }
                             }}
                             className={`px-6 py-3 border text-[11px] uppercase tracking-widest font-bold transition flex items-center justify-center min-w-[140px]
                                ${twoFactorEnabled 
                                  ? 'border-green-500/50 bg-green-500/10 text-green-400 cursor-default' 
                                  : 'border-zinc-700 text-white hover:bg-white hover:text-black cursor-pointer'}`}
                           >
                             {twoFactorEnabled ? 'Active' : twoFactorLoading ? 'Processing...' : 'Enable 2FA'}
                           </button>
                        </div>
                     </div>

                     <button type="submit" disabled={settingsLoading} className="px-8 py-4 bg-white text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-zinc-200 transition">Update Configuration</button>
                   </form>
                </motion.div>
              )}

              {activeTab === 'billing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* FREE PLAN */}
                    <div className={`border p-10 rounded-2xl flex flex-col backdrop-blur-xl ${subTier === 'free' ? 'border-[#6366f1]/30 bg-[#6366f1]/5' : 'border-zinc-800 bg-[#050505]'}`}>
                      <div className="mb-8">
                        <h3 className="text-2xl font-display font-bold uppercase tracking-tight mb-2">Initiate</h3>
                        <p className="text-zinc-500 font-light">Perfect for getting your initial reel online.</p>
                      </div>
                      <div className="mb-8">
                        <span className="text-5xl font-black font-display">$0</span>
                        <span className="text-zinc-500 font-mono text-sm"> / forever</span>
                      </div>
                      <div className="flex-1 space-y-4 mb-8">
                        {['5 Maximum Projects Uploaded', 'Standard Video Quality', 'Basic Heatmap Analytics', 'Community Support'].map((feature, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Check className={`w-4 h-4 ${subTier === 'free' ? 'text-[#6366f1]' : 'text-zinc-600'}`} />
                            <span className="text-zinc-300 font-light">{feature}</span>
                          </div>
                        ))}
                      </div>
                      {subTier === 'free' ? (
                        <button disabled className="w-full text-center py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold uppercase tracking-widest text-[11px] rounded transition cursor-not-allowed">
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          onClick={handleDowngrade}
                          className="w-full text-center py-4 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 font-bold uppercase tracking-widest text-[11px] rounded transition"
                        >
                          Downgrade to Free
                        </button>
                      )}
                    </div>

                    {/* PRO PLAN */}
                    <div className={`border p-10 rounded-2xl flex flex-col relative overflow-hidden ${subTier === 'premium' ? 'border-[#6366f1] bg-gradient-to-b from-[#6366f1]/20 to-[#050505]' : 'border-[#6366f1]/30 bg-gradient-to-b from-[#6366f1]/10 to-[#050505]'}`}>
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#6366f1] to-purple-500" />
                      
                      <div className="mb-8 flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold uppercase tracking-tight mb-2 flex items-center gap-2 font-display">
                             Premium <Sparkles className="w-5 h-5 text-[#6366f1]" />
                          </h3>
                          <p className="text-[#818cf8] font-light">For elite editors scaling their revenue.</p>
                        </div>
                      </div>
                      <div className="mb-8">
                        <span className="text-5xl font-black font-display">$5</span>
                        <span className="text-zinc-500 font-mono text-sm"> / month</span>
                      </div>
                      <div className="flex-1 space-y-4 mb-8">
                        {['Unlimited Projects Uploads', '4K / Lossless Quality Video Player', 'Advanced Telemetry & Analytics Dashboard', 'Custom Domain Mapping', 'Priority Feature Access'].map((feature, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#818cf8]" />
                            <span className="text-white font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>
                      {subTier === 'premium' ? (
                        <button disabled className="w-full text-center py-4 bg-zinc-900 border border-zinc-800 text-white font-bold uppercase tracking-widest text-[11px] rounded transition cursor-not-allowed">
                          Current Plan
                        </button>
                      ) : (
                        <button 
                          onClick={async () => {
                             try {
                               const res = await api.post('/create-checkout-session');
                               window.location.href = res.data.url;
                             } catch (e) {
                               alert("Failed to initialize Stripe. Verify API keys.");
                             }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-widest text-[11px] rounded transition"
                        >
                          <Shield className="w-3 h-3"/> Checkout with Stripe
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'inquiries' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Incoming Leads</h2>
                      <p className="text-zinc-500 font-light max-w-xl">Review and manage project propositions sent from your portfolio studio.</p>
                    </div>
                  </div>

                  {isInquiriesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
                      <p className="tracking-widest uppercase text-xs text-zinc-600">Syncing Inbox</p>
                    </div>
                  ) : inquiries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <Mail className="w-12 h-12 text-zinc-800 mb-6" />
                      <h3 className="text-xl font-bold text-zinc-400 mb-2">No active leads found</h3>
                      <p className="text-zinc-600 font-light">Project inquiries will appear here as they arrive.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {inquiries.map((lead) => (
                        <div key={lead.id} className="bg-[#050505] border border-zinc-900 p-6 rounded-xl hover:border-zinc-700 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                               <h4 className="text-xl font-bold text-white">{lead.name}</h4>
                               {!lead.is_read && <span className="bg-brand w-2 h-2 rounded-full" />}
                            </div>
                            <p className="text-brand text-sm font-mono tracking-wide mb-4">{lead.email}</p>
                            <p className="text-zinc-400 font-light leading-relaxed max-w-2xl">{lead.project_details}</p>

                            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-6">Received — {new Date(lead.created_at).toLocaleDateString()} {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="flex gap-4">
                             <a href={`mailto:${lead.email}`} className="px-6 py-3 bg-white text-black text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition">
                               Reply
                             </a>
                             {!lead.is_read && (
                                <button 
                                  onClick={async () => {
                                    await api.patch(`/inquiries/${lead.id}/read`);
                                    fetchInquiries();
                                  }}
                                  className="px-6 py-3 border border-zinc-800 text-zinc-400 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition"
                                  title="Archive Lead"
                                >
                                  Archive
                                </button>
                             )}
                              <button 
                                onClick={() => handleReportInquiry(lead.id)}
                                className="w-12 h-12 flex items-center justify-center border border-zinc-900 text-zinc-700 hover:text-red-400 hover:border-red-400/30 transition group"
                                title="Report Spam"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteInquiry(lead.id)}
                                className="w-12 h-12 flex items-center justify-center border border-zinc-900 text-zinc-700 hover:text-white hover:bg-red-500/10 transition"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}


            </div>
          </main>

        </div>
      )}

      {/* --- CINE UPLOAD MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isUploading && setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-[#050505] border border-zinc-800 p-10 relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => !isUploading && setIsModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition disabled:opacity-50"
                disabled={isUploading}
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="mb-10">
                <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-zinc-500 mb-2 block">System Dialogue</span>
                <h2 className="text-3xl font-black tracking-tighter">{editingProject ? 'Refine Asset Metadata' : 'Ingest Media File'}</h2>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  editingProject ? handleUpdateProjectMetadata() : handleUpload(e);
                }} 
                className="flex flex-col gap-8"
              >
                
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Asset Title</label>
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-xl outline-none transition-colors text-white placeholder-zinc-800 font-light"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                    disabled={isUploading}
                    placeholder="E.g., Audi RS7 Commercial"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Metadata Description</label>
                  <textarea 
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors h-24 resize-none text-white placeholder-zinc-800 font-light"
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    disabled={isUploading}
                    placeholder="Color graded in DaVinci Resolve. Shot on RED Gemini."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Category</label>
                    <select 
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base sm:text-lg outline-none transition-colors text-white font-light"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      disabled={isUploading}
                    >
                      <option value="general" className="bg-black text-white">General</option>
                      <option value="youtube" className="bg-black text-white">YouTube</option>
                      <option value="commercial" className="bg-black text-white">Commercials / Ads</option>
                      <option value="documentary" className="bg-black text-white">Documentary</option>
                      <option value="reels" className="bg-black text-white">Short Form / Reels</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Your Role</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base sm:text-lg outline-none transition-colors text-white placeholder-zinc-800 font-light"
                      value={uploadRole}
                      onChange={(e) => setUploadRole(e.target.value)}
                      disabled={isUploading}
                      placeholder="e.g. Lead Editor, Colorist"
                    />
                  </div>
                  <div className="space-y-1 col-span-1 sm:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Tools Used</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base sm:text-lg outline-none transition-colors text-white placeholder-zinc-800 font-light"
                      value={uploadTools}
                      onChange={(e) => setUploadTools(e.target.value)}
                      disabled={isUploading}
                      placeholder="Premiere Pro, DaVinci Resolve, After Effects"
                    />
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-900 space-y-6">
                   <div>
                     <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Proof of Work: Timeline Breakdown (Optional)</label>
                     <textarea 
                       className="w-full mt-2 bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-sm outline-none transition-colors h-24 resize-none text-white placeholder-zinc-800 font-light"
                       value={uploadTimeline}
                       onChange={(e) => setUploadTimeline(e.target.value)}
                       disabled={isUploading}
                       placeholder="0:00 - Main intro using Luma Matte transition&#10;0:15 - Speed ramp sequence built natively"
                     />
                     <p className="text-[10px] text-zinc-500 font-mono mt-2">Detail your edits here to verify authenticity.</p>
                   </div>
                   
                   <div className="space-y-1">
                     <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Proof of Work: Project File (Optional)</label>
                     <div className="relative group mt-2">
                       <input 
                         type="file" 
                         accept=".prproj,.drp,.aep,image/*"
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                         onChange={(e) => setUploadProjectFile(e.target.files?.[0] || null)}
                         disabled={isUploading}
                       />
                       <div className={`w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition ${uploadProjectFile ? 'border-white bg-white/5' : 'border-zinc-800 bg-transparent group-hover:border-zinc-600'}`}>
                         {uploadProjectFile ? (
                           <>
                             <p className="text-sm font-medium text-white max-w-sm text-center truncate">{uploadProjectFile.name}</p>
                             <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest">Attached</p>
                           </>
                         ) : (
                           <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 group-hover:text-white transition">Attach .prproj, .aep, or timeline screenshot</p>
                         )}
                       </div>
                     </div>
                   </div>
                </div>

                {!editingProject && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Final Edit Video</label>
                      <div className="relative group mt-2">
                        <input 
                          type="file" 
                          accept="video/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          required
                          disabled={isUploading}
                        />
                        <div className={`w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition h-full text-center ${selectedFile ? 'border-white bg-white/5' : 'border-zinc-800 bg-transparent group-hover:border-zinc-600'}`}>
                          {selectedFile ? (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-white mb-2" />
                              <p className="text-sm font-medium text-white max-w-sm shrink-0 truncate">{selectedFile.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-widest">Ready</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-6 h-6 text-zinc-600 mb-2 group-hover:text-white transition" />
                              <p className="text-xs font-bold text-white uppercase tracking-widest">Final Video</p>
                              <p className="text-[9px] text-zinc-500 mt-1 font-mono uppercase tracking-widest">MP4/WEBM</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Raw Video <span className="text-zinc-600">(Before/After)</span></label>
                      <div className="relative group mt-2">
                        <input 
                          type="file" 
                          accept="video/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                          onChange={(e) => setUploadRawFile(e.target.files?.[0] || null)}
                          disabled={isUploading}
                        />
                        <div className={`w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition h-full text-center ${uploadRawFile ? 'border-white bg-white/5' : 'border-zinc-800 bg-transparent group-hover:border-zinc-600'}`}>
                          {uploadRawFile ? (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-white mb-2" />
                              <p className="text-sm font-medium text-white max-w-sm shrink-0 truncate">{uploadRawFile.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase tracking-widest">Ready</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-6 h-6 text-zinc-600 mb-2 group-hover:text-white transition" />
                              <p className="text-xs font-bold text-white uppercase tracking-widest">Raw Video</p>
                              <p className="text-[9px] text-zinc-500 mt-1 font-mono uppercase tracking-widest">Optional</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 border border-red-500/20 bg-red-500/5">
                    <p className="text-xs font-mono text-red-500 uppercase tracking-widest">{error}</p>
                  </div>
                )}

                {isUploading && (
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                      <span>Transmission In Progress</span>
                      <span className="text-white">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 overflow-hidden">
                      <motion.div 
                        className="bg-white h-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ ease: "linear" }}
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isUploading || (!editingProject && !selectedFile)}
                  className="w-full py-5 mt-4 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-[0.2em] text-[11px] transition duration-200 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      {editingProject ? 'Syncing Metadata...' : 'Uploading Media...'}
                    </>
                  ) : (
                    editingProject ? 'Save Metadata Changes' : 'Commence Upload'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}