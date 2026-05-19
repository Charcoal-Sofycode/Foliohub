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
import StyleFingerprint from '@/components/StyleFingerprint';
import { useUpload } from '@/context/UploadContext';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

import { 
  UploadCloud, 
  Settings, 
  BarChart, 
  Grid, 
  LogOut, 
  X, 
  CheckCircle2,
  Trash2,
  Mail,
  Share2,
  Eye,
  DownloadCloud,
  SlidersHorizontal,
  Link as LinkIcon,
  Play,
  Activity,
  Zap,
  Check,
  Shield,
  ShieldAlert,
  Sparkles,
  Edit,
  Save,
  AlertCircle,
  Plus,
  Fingerprint,
  MessageSquare,
  PlayCircle,
  Clock,
  ExternalLink
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

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 chars',      pass: (password || '').length >= 8 },
    { label: 'Uppercase letter',       pass: /[A-Z]/.test(password || '') },
    { label: 'Number or symbol',       pass: /[0-9!@#$%^&*]/.test(password || '') },
  ];
  if (!password) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 py-2 text-[10px]">
      {checks.map(c => (
        <div key={c.label} className={`flex items-center gap-1.5 ${c.pass ? 'text-emerald-500' : 'text-zinc-700'}`}>
          <div className={`w-1 h-1 rounded-full ${c.pass ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
          {c.label}
        </div>
      ))}
    </div>
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
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploadRole, setUploadRole] = useState("");
  const [uploadTools, setUploadTools] = useState("");
  const [uploadTimeline, setUploadTimeline] = useState("");
  const [uploadProjectFiles, setUploadProjectFiles] = useState<File[]>([]);
  const [uploadRawFile, setUploadRawFile] = useState<File | null>(null);
  const [uploadThumbnailFile, setUploadThumbnailFile] = useState<File | null>(null);

  // Performance Metrics States
  const [metricViews, setMetricViews] = useState("");
  const [metricRetention, setMetricRetention] = useState("");
  const [metricCtr, setMetricCtr] = useState("");
  const [metricWatchTime, setMetricWatchTime] = useState("");
  const [metricLikes, setMetricLikes] = useState("");
  const [metricComments, setMetricComments] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [clientGoals, setClientGoals] = useState("");
  const [strategyNotes, setStrategyNotes] = useState("");
  const [monetizationResults, setMonetizationResults] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadStatus, setUploadStatus] = useState("published");
  const [existingProjectFiles, setExistingProjectFiles] = useState<string[]>([]);
  const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
  const [existingRaw, setExistingRaw] = useState<string | null>(null);
  
  // Edit State
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  // Project Filter State
  const [projectSearch, setProjectSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");


  // Settings State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [show2faSetupModal, setShow2faSetupModal] = useState(false);
  const [twoFactorModalType, setTwoFactorModalType] = useState<'enable' | 'disable' | 'edit' | null>(null);
  const [twoFactorModalPassword, setTwoFactorModalPassword] = useState('');
  const [twoFactorModalCode, setTwoFactorModalCode] = useState('');
  const [twoFactorModalError, setTwoFactorModalError] = useState('');
  const [showManagePasswordModal, setShowManagePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [managementError, setManagementError] = useState('');
  const [managementSuccess, setManagementSuccess] = useState('');
  const [managementLoading, setManagementLoading] = useState(false);
  const [rotationNewPassword, setRotationNewPassword] = useState('');

  // Leads/Inquiries State
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [isInquiriesLoading, setIsInquiriesLoading] = useState(false);

  // Client Reviews State
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [totalCommentCount, setTotalCommentCount] = useState(0);

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

  // Fetch reviews whenever we switch to reviews tab
  useEffect(() => {
    if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab]);

  // Fetch total comment count on load
  useEffect(() => {
    if (portfolio) {
      fetchReviewCount();
    }
  }, [portfolio]);

  // REACTIVE POLLING: Automatically starts when any project is pending/processing
  useEffect(() => {
    if (!portfolio?.projects) return;

    const needsPolling = portfolio.projects.some((p: any) => 
      p.transcoding_status === 'pending' || p.transcoding_status === 'processing'
    );

    if (!needsPolling) return;

    console.log("DEBUG: Processing detected. Starting background sync...");
    
    let pollCount = 0;
    const MAX_POLLS = 40; // Safety cap: ~10 minutes at 15s interval

    const pollInterval = setInterval(async () => {
      pollCount++;
      try {
        const res = await api.get('/portfolios/me');
        // Check if we still need to poll — 'completed' and 'failed' are both terminal
        const stillWorking = res.data.projects?.some((p: any) => 
          p.transcoding_status === 'pending' || p.transcoding_status === 'processing'
        );

        setPortfolio(res.data);

        if (!stillWorking || pollCount >= MAX_POLLS) {
          console.log("DEBUG: All assets finalized. Polling terminated.");
          clearInterval(pollInterval);
        }
      } catch (e) {
        console.error("Polling Sync Error", e);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  // Use a stable derived key so we only restart when the set of in-progress IDs changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    portfolio?.projects
      ?.filter((p: any) => p.transcoding_status === 'pending' || p.transcoding_status === 'processing')
      ?.map((p: any) => p.id)
      ?.join(',') ?? ''
  ]);


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

  const fetchReviews = async () => {
    setIsReviewsLoading(true);
    try {
      const res = await api.get('/my-reviews');
      setReviewsData(res.data);
      const total = res.data.reduce((acc: number, p: any) => acc + (p.comments?.filter((c: any) => !c.is_resolved).length || 0), 0);
      setTotalCommentCount(total);
    } catch (err) {
      console.error("Failed to load reviews", err);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const fetchReviewCount = async () => {
    try {
      const res = await api.get('/my-reviews');
      const total = res.data.reduce((acc: number, p: any) => acc + (p.comments?.filter((c: any) => !c.is_resolved).length || 0), 0);
      setTotalCommentCount(total);
    } catch (err) {
      // silent fail
    }
  };

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


  const { startMultipartUpload } = useUpload();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentTitle = uploadTitle;
    const currentDesc = uploadDesc;
    const currentCategory = uploadCategory;
    const currentRole = uploadRole;
    const currentTools = uploadTools;
    const currentTimeline = uploadTimeline;
    const currentFile = selectedFile;
    const currentThumbnail = uploadThumbnailFile;
    const currentRaw = uploadRawFile;
    const currentProjectFiles = [...uploadProjectFiles];

    setIsUploading(true);
    setIsSubmittingForm(true);
    setError('');
    
    // Reset form states immediately so the modal is clean for the next ingest
    setUploadTitle("");
    setUploadDesc("");
    setUploadCategory("general");
    setUploadRole("");
    setUploadTools("");
    setUploadTimeline("");
    setSelectedFile(null);
    setUploadThumbnailFile(null);
    setUploadRawFile(null);
    setUploadProjectFiles([]);

    setIsModalOpen(false); // Close modal now, we are uploading in BG

    try {
      let final_media_key = "";
      let final_raw_key = "";
      let final_project_keys: string[] = [];
      let final_thumbnail_key = "";

      // 1. Primary Video (REQUIRED)
      if (!currentFile) throw new Error("No file selected");
      const resMain = await startMultipartUpload(currentFile, (url, key) => {
        final_media_key = key;
      });
      if (!resMain.key) throw new Error("Main video upload failed");
      final_media_key = resMain.key;

      // 2. Thumbnail (Optional)
      if (currentThumbnail) {
        const resT = await startMultipartUpload(currentThumbnail, () => {});
        final_thumbnail_key = resT.key;
      }

      // 3. Raw Video (Optional)
      if (currentRaw) {
        const resR = await startMultipartUpload(currentRaw, () => {});
        final_raw_key = resR.key;
      }

      // 4. Project Files (Multiple, Optional)
      if (currentProjectFiles.length > 0) {
        for (const f of currentProjectFiles) {
          const resP = await startMultipartUpload(f, () => {});
          if (resP.key) final_project_keys.push(resP.key);
        }
      }

      // Finalize creation
      finishProjectCreation(final_media_key, final_raw_key, final_project_keys, final_thumbnail_key, {
        title: currentTitle,
        desc: currentDesc,
        cat: currentCategory,
        role: currentRole,
        tools: currentTools,
        timeline: currentTimeline,
        metricViews,
        metricRetention,
        metricCtr,
        metricWatchTime,
        metricLikes,
        metricComments,
        sourceLink,
        clientGoals,
        strategyNotes,
        monetizationResults,
        tags: uploadTags,
        status: uploadStatus
      });

      setIsUploading(false);
      setIsSubmittingForm(false);

    } catch (err: any) {
      console.error("BG Upload Trigger Error:", err);
      setError('Failed to initiate secure background transfer.');
      setIsUploading(false);
      setIsSubmittingForm(false);
    }
  };

  const finishProjectCreation = async (mKey: string, rKey: string, pKeys: string[], tKey: string, meta: any) => {
    try {
      const formData = new FormData();
      formData.append('title', meta.title);
      formData.append('description', meta.desc);
      formData.append('project_type', 'video');
      formData.append('category', meta.cat);
      formData.append('media_key', mKey);
      if (rKey) formData.append('raw_media_key', rKey);
      if (pKeys.length > 0) formData.append('project_file_key', JSON.stringify(pKeys));
      if (tKey) formData.append('thumbnail_key', tKey);
      
      if (meta.role) formData.append('role', meta.role);
      if (meta.tools) formData.append('tools_used', meta.tools);
      if (meta.timeline) formData.append('timeline_breakdown', meta.timeline);
      if (meta.metricViews) formData.append('metric_views', meta.metricViews);
      if (meta.metricRetention) formData.append('metric_retention', meta.metricRetention);
      if (meta.metricCtr) formData.append('metric_ctr', meta.metricCtr);
      if (meta.metricWatchTime) formData.append('metric_watch_time', meta.metricWatchTime);
      if (meta.metricLikes) formData.append('metric_likes', meta.metricLikes);
      if (meta.metricComments) formData.append('metric_comments', meta.metricComments);
      if (meta.sourceLink) formData.append('source_link', meta.sourceLink);
      if (meta.clientGoals) formData.append('client_goals', meta.clientGoals);
      if (meta.strategyNotes) formData.append('strategy_notes', meta.strategyNotes);
      if (meta.monetizationResults) formData.append('monetization_results', meta.monetizationResults);
      if (meta.tags) formData.append('tags', meta.tags);
      if (meta.status) formData.append('status', meta.status);

      await api.post('/projects', formData);
      await fetchPortfolio();
    } catch(e) {
      console.error("Late Project Creation Error", e);
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

  const handleUpdateEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManagementLoading(true);
    setManagementError('');
    setManagementSuccess('');
    const form = e.currentTarget;
    const newEmail = (form.elements.namedItem('newEmail') as HTMLInputElement).value;
    try {
      await api.patch('/users/me/email', { new_email: newEmail });
      setManagementSuccess('Professional email updated.');
      window.location.reload(); 
    } catch (err: any) {
      setManagementError(err.response?.data?.detail || 'Update failed.');
    } finally {
      setManagementLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManagementLoading(true);
    setManagementError('');
    setManagementSuccess('');
    const form = e.currentTarget;
    const currentPassword = (form.elements.namedItem('currentPassword') as HTMLInputElement).value;
    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPass') as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      setManagementError('New security keys do not match.');
      setManagementLoading(false);
      return;
    }

    try {
      await api.patch('/users/me/password', { current_password: currentPassword, new_password: newPassword });
      setManagementSuccess('Security key rotated successfully.');
      setShowManagePasswordModal(false);
    } catch (err: any) {
      setManagementError(err.response?.data?.detail || 'Authentication failed.');
    } finally {
      setManagementLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManagementLoading(true);
    setManagementError('');
    const form = e.currentTarget;
    const password = (form.elements.namedItem('verifyPassword') as HTMLInputElement).value;

    try {
      await api.delete('/users/me', { data: { password } });
      localStorage.removeItem('token');
      router.push('/login');
    } catch (err: any) {
      setManagementError(err.response?.data?.detail || 'Verification failed. Account preserved.');
    } finally {
      setManagementLoading(false);
    }
  };

  const handleTwoFactorAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManagementLoading(true);
    setTwoFactorModalError('');
    setManagementSuccess('');

    try {
      if (twoFactorModalType === 'enable') {
        await api.post('/enable-2fa', { password: twoFactorModalPassword, code: twoFactorModalCode });
        setTwoFactorEnabled(true);
        setManagementSuccess('Two-factor authentication successfully enabled.');
      } else if (twoFactorModalType === 'disable') {
        await api.post('/disable-2fa', { password: twoFactorModalPassword });
        setTwoFactorEnabled(false);
        setManagementSuccess('Two-factor authentication has been disabled.');
      } else if (twoFactorModalType === 'edit') {
        await api.post('/edit-2fa', { password: twoFactorModalPassword, new_code: twoFactorModalCode });
        setManagementSuccess('Two-factor security PIN successfully updated.');
      }
      setShow2faSetupModal(false);
      setTwoFactorModalPassword('');
      setTwoFactorModalCode('');
    } catch (err: any) {
      setTwoFactorModalError(err.response?.data?.detail || 'Verification failed.');
    } finally {
      setManagementLoading(false);
    }
  };

  const handleExportData = async () => {
    setManagementLoading(true);
    try {
      const res = await api.get('/users/me/export');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `foliohub_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setManagementSuccess('Archive generated and download initiated.');
    } catch (err) {
      setManagementError('Failed to compile data archive.');
    } finally {
      setManagementLoading(false);
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
    setMetricViews(project.metric_views || "");
    setMetricRetention(project.metric_retention || "");
    setMetricCtr(project.metric_ctr || "");
    setMetricWatchTime(project.metric_watch_time || "");
    setMetricLikes(project.metric_likes || "");
    setMetricComments(project.metric_comments || "");
    setSourceLink(project.source_link || "");
    setClientGoals(project.client_goals || "");
    setStrategyNotes(project.strategy_notes || "");
    setMonetizationResults(project.monetization_results || "");
    setUploadTags(project.tags || "");
    setUploadStatus(project.status || "published");
    
    if (project.project_file_url) {
      if (Array.isArray(project.project_file_url)) {
        setExistingProjectFiles(project.project_file_url);
      } else {
        setExistingProjectFiles([project.project_file_url]);
      }
    } else {
      setExistingProjectFiles([]);
    }
    
    setExistingThumbnail(project.thumbnail_url || null);
    setExistingRaw(project.raw_media_url || null);
    
    setIsModalOpen(true);
  };

  const handleUpdateProjectMetadata = async () => {
    if (!editingProject) return;
    setIsUploading(true);
    try {
      let updatedProjectFileUrls = [...existingProjectFiles];
      let final_thumbnail_url = existingThumbnail;
      let final_raw_url = existingRaw;
      let final_media_url = editingProject.media_url;

      // 0. Upload new main video if selected
      if (selectedFile) {
        const resM = await startMultipartUpload(selectedFile, () => {});
        if (resM.url) final_media_url = resM.url;
      }

      // 1. Upload new project files
      if (uploadProjectFiles.length > 0) {
        for (const f of uploadProjectFiles) {
          const res = await startMultipartUpload(f, () => {});
          if (res.url) updatedProjectFileUrls.push(res.url);
        }
      }

      // 2. Upload new thumbnail if selected
      if (uploadThumbnailFile) {
        const resT = await startMultipartUpload(uploadThumbnailFile, () => {});
        if (resT.url) final_thumbnail_url = resT.url;
      }

      // 3. Upload new raw video if selected
      if (uploadRawFile) {
        const resR = await startMultipartUpload(uploadRawFile, () => {});
        if (resR.url) final_raw_url = resR.url;
      }

      await api.put(`/projects/${editingProject.id}`, {
        title: uploadTitle,
        description: uploadDesc,
        category: uploadCategory,
        role: uploadRole,
        tools_used: uploadTools,
        timeline_breakdown: uploadTimeline,
        metric_views: metricViews,
        metric_retention: metricRetention,
        metric_ctr: metricCtr,
        metric_watch_time: metricWatchTime,
        metric_likes: metricLikes,
        metric_comments: metricComments,
        source_link: sourceLink,
        client_goals: clientGoals,
        strategy_notes: strategyNotes,
        monetization_results: monetizationResults,
        tags: uploadTags,
        status: uploadStatus,
        project_file_url: JSON.stringify(updatedProjectFileUrls),
        thumbnail_url: final_thumbnail_url,
        raw_media_url: final_raw_url,
        media_url: final_media_url,
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
    setUploadProjectFiles([]);
    setUploadRawFile(null);
    setUploadThumbnailFile(null);
    setExistingProjectFiles([]);
    setExistingThumbnail(null);
    setExistingRaw(null);
    setUploadProgress(0);
    setIsUploading(false);
    setMetricViews("");
    setMetricRetention("");
    setMetricCtr("");
    setMetricWatchTime("");
    setUploadTags("");
    setUploadStatus("published");
    setMetricLikes("");
    setMetricComments("");
    setSourceLink("");
    setClientGoals("");
    setStrategyNotes("");
    setMonetizationResults("");
  };



  const handleUpdatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data: any = Object.fromEntries(formData.entries());
      
      // Handle Agreement File Upload
      if (agreementFile) {
        const res = await startMultipartUpload(agreementFile, () => {});
        if (res.url) {
          data.agreement_url = res.url;
        }
      }

      const res = await api.put('/portfolios/me', data);
      setPortfolio(res.data);
      setAgreementFile(null);
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
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload"
                disablePictureInPicture
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
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center group">
                    <input 
                      type="text" 
                      placeholder="yourname"
                      className="w-full py-4 pl-0 pr-4 sm:pr-40 bg-transparent border-b-2 border-zinc-800 focus:border-white outline-none transition-colors text-white font-medium text-lg placeholder-zinc-500"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      required
                    />
                    <span className="mt-2 sm:mt-0 sm:absolute sm:right-0 text-zinc-600 pointer-events-none font-medium text-sm sm:text-base">
                      .foliohub.media
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
                <button 
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition font-medium text-sm tracking-wide ${activeTab === 'reviews' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  <MessageSquare className="w-4 h-4" /> Client Reviews
                  {totalCommentCount > 0 && (
                    <span className="ml-auto text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{totalCommentCount}</span>
                  )}
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
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-[#050505] border-t border-zinc-900 flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
            {[
              { id: 'projects', icon: <Grid className="w-5 h-5" />, label: 'Assets' },
              { id: 'analytics', icon: <BarChart className="w-5 h-5" />, label: 'Stats' },
              { id: 'reviews', icon: <MessageSquare className="w-5 h-5" />, label: 'Reviews' },
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
              
              <header className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-12 border-b border-zinc-900 pb-10">
                <div className="text-center md:text-left">
                  <h2 className="text-4xl font-bold tracking-tighter mb-2 capitalize">{activeTab}</h2>
                  <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">Master Control Panel</p>
                </div>
                {activeTab === 'projects' && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-[11px] rounded-sm hover:bg-zinc-200 transition active:scale-95 shadow-xl shadow-white/5"
                  >
                    <Plus className="w-4 h-4" /> Ingest Media
                  </button>
                )}
              </header>

              {activeTab === 'projects' && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="space-y-12"
                >
                  {/* Global Style Fingerprint */}
                  <StyleFingerprint editable={true} />

                  {/* Project Filters */}
                  <div className="flex flex-col md:flex-row items-center gap-4 bg-[#050505] p-4 rounded-xl border border-zinc-900">
                    <div className="relative flex-1 w-full">
                      <Eye className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                        type="text" 
                        placeholder="Search assets by title or description..." 
                        className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-zinc-500 transition"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:w-48">
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-[10px] uppercase tracking-widest font-mono text-zinc-200 outline-none focus:border-zinc-500 appearance-none cursor-pointer hover:border-zinc-700 transition"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                        >
                          {["All", ...Array.from(new Set((portfolio?.projects || []).map((p: any) => p.category || "general")))].map((cat: any) => (
                            <option key={cat} value={cat} className="bg-zinc-900 text-white">{cat}</option>
                          ))}
                        </select>
                        <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                      </div>

                      <div className="relative flex-1 md:w-48">
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-[10px] uppercase tracking-widest font-mono text-zinc-200 outline-none focus:border-zinc-500 appearance-none cursor-pointer hover:border-zinc-700 transition"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="All" className="bg-zinc-900 text-white">Status: All</option>
                          <option value="published" className="bg-zinc-900 text-white">Published</option>
                          <option value="approved" className="bg-zinc-900 text-white">Approved</option>
                          <option value="needs_revision" className="bg-zinc-900 text-white">Needs Revision</option>
                        </select>
                        <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                  {(() => {
                    const filtered = (portfolio?.projects || []).filter((p: any) => {
                      const matchesSearch = p.title.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                            (p.description && p.description.toLowerCase().includes(projectSearch.toLowerCase()));
                      const matchesCategory = filterCategory === "All" || p.category === filterCategory;
                      const matchesStatus = filterStatus === "All" || p.status === filterStatus;
                      return matchesSearch && matchesCategory && matchesStatus;
                    });

                    if (filtered.length > 0) {
                      return filtered.map((project: any, i: number) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={project.id} 
                          className="bg-[#050505] border border-zinc-900 rounded-xl overflow-hidden group hover:border-zinc-700 transition duration-300 flex flex-col"
                        >
                          <div className="bg-black relative overflow-hidden flex-shrink-0">
                            {project.raw_media_url && project.media_url ? (
                              <BeforeAfterPlayer 
                              rawUrl={project.raw_media_url} 
                              finalUrl={project.media_url} 
                              title={project.title} 
                              thumbnailUrl={project.thumbnail_url}
                              subscriptionTier={subTier as 'free' | 'premium'}
                              qualityBadgeClassName="absolute top-3 left-[4.8rem] z-50 pointer-events-none"
                           />
                            ) : project.media_url ? (
                              <PortfolioPlayer 
                                url={project.media_url} 
                                title={project.title}
                                optimizedUrl={project.optimized_url}
                                thumbnailUrl={project.thumbnail_url}
                                transcodingStatus={project.transcoding_status}
                                subscriptionTier={subTier as 'free' | 'premium'}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                <Play className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] uppercase font-mono tracking-widest px-2 py-1 rounded-sm border border-white/10 pointer-events-none">
                               Video
                            </div>
                            
                            <div className="absolute top-3 right-3 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
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
                                {(project.comments?.length > 0) && (
                                  <span className="flex items-center gap-1.5 text-amber-400">
                                    <MessageSquare className="w-3.5 h-3.5" /> {project.comments.length}
                                  </span>
                                )}
                                <span className="flex items-center gap-1.5 text-white/50">
                                  {project.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                                  {project.status || 'Published'}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const reviewUrl = window.location.origin + `/review/${project.id}`;
                                  navigator.clipboard.writeText(reviewUrl);
                                  alert("Client Review Link copied to clipboard!");
                                }}
                                className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 border border-zinc-800 rounded bg-zinc-900 hover:bg-zinc-800 transition text-zinc-300 flex items-center gap-2"
                              >
                                <LinkIcon className="w-3 h-3" /> Share Review Link
                              </button>
                            </div>
                          </div>
                          <ProjectStoryTimeline
                            projectId={project.id}
                            projectTitle={project.title}
                          />
                        </motion.div>
                      ));
                    } else if (portfolio?.projects?.length > 0) {
                      return (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-[#050505]">
                          <SlidersHorizontal className="w-6 h-6 text-zinc-600 mb-4" />
                          <h3 className="text-lg font-bold text-white mb-1">No Matches Found</h3>
                          <p className="text-zinc-500 text-sm font-light">Adjust your filters to find what you&apos;re looking for.</p>
                          <button 
                            onClick={() => { setProjectSearch(""); setFilterCategory("All"); setFilterStatus("All"); }}
                            className="mt-6 text-[10px] font-mono uppercase tracking-widest text-white hover:underline"
                          >
                            Reset All Filters
                          </button>
                        </div>
                      );
                    } else {
                      return (
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
                      );
                    }
                  })()}
                  </div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {(() => {
                      const totalImpressions = portfolio.projects?.reduce((acc: number, p: any) => acc + (p.view_count || 0), 0) || 0;
                      const profileViews = portfolio.view_count || 0;
                      const inquiryCount = portfolio.inquiries?.length || 0;
                      const conversionRate = profileViews > 0 
                        ? ((inquiryCount / profileViews) * 100).toFixed(1)
                        : "0.0";

                      return [
                        { label: "Profile Views", value: profileViews.toLocaleString(), growth: "+0.0%", detail: "Portfolio visits" },
                        { label: "Project Clicks", value: totalImpressions.toLocaleString(), growth: "+0.0%", detail: "All-time views" },
                        { label: "Lead Inquiries", value: inquiryCount.toLocaleString(), growth: "Emails", detail: "Client outreach" },
                        { label: "Conversion Rate", value: `${conversionRate}%`, growth: "Strict", detail: "Leads / Views" }
                      ].map((kpi, i) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                          key={kpi.label} 
                          className="bg-[#050505] border border-zinc-900 p-6 rounded-xl flex flex-col justify-between"
                        >
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-6">{kpi.label}</p>
                          <div className="flex items-end justify-between gap-4">
                            <h3 className="text-3xl font-black text-white tracking-tighter">{kpi.value}</h3>
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


              {activeTab === 'reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
                  {/* KPI Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: "Total Feedback", value: totalCommentCount, icon: <MessageSquare className="w-4 h-4" /> },
                      { label: "Projects with Reviews", value: reviewsData.length, icon: <PlayCircle className="w-4 h-4" /> },
                      { label: "Awaiting Action", value: reviewsData.filter((p: any) => p.project_status === 'needs_revision').length, icon: <AlertCircle className="w-4 h-4" /> },
                    ].map((kpi, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        key={kpi.label}
                        className="bg-[#050505] border border-zinc-900 p-6 rounded-xl"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-zinc-500">{kpi.icon}</span>
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">{kpi.label}</p>
                        </div>
                        <h3 className="text-3xl font-black text-white tracking-tighter">{kpi.value}</h3>
                      </motion.div>
                    ))}
                  </div>

                  {/* Reviews by Project */}
                  {isReviewsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : reviewsData.length === 0 ? (
                    <div className="bg-[#050505] border border-zinc-900 rounded-xl p-16 text-center">
                      <div className="w-16 h-16 rounded-full border border-dashed border-zinc-700 flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-6 h-6 text-zinc-600" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">No Client Feedback Yet</h3>
                      <p className="text-zinc-500 text-sm font-light max-w-md mx-auto">
                        Share review links with your clients from the Assets tab. When they leave timestamped comments, they&apos;ll appear here.
                      </p>
                    </div>
                  ) : (
                    reviewsData.map((projectReview: any, pi: number) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.1 }}
                        key={projectReview.project_id}
                        className="bg-[#050505] border border-zinc-900 rounded-xl overflow-hidden"
                      >
                        {/* Project Header */}
                        <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                              <Play className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm tracking-tight">{projectReview.project_title}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                  projectReview.project_status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : projectReview.project_status === 'needs_revision'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {projectReview.project_status === 'approved' ? '✓ Approved' : projectReview.project_status === 'needs_revision' ? '⚠ Changes Requested' : '● In Review'}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-600">
                                  {projectReview.comments.filter((c:any) => !c.is_resolved).length} active review{projectReview.comments.filter((c:any) => !c.is_resolved).length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const url = window.location.origin + `/review/${projectReview.project_id}`;
                              window.open(url, '_blank');
                            }}
                            className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-2 border border-zinc-800 rounded bg-zinc-900 hover:bg-zinc-800 transition text-zinc-300 flex items-center gap-2"
                          >
                            <ExternalLink className="w-3 h-3" /> Open Review
                          </button>
                        </div>

                        {/* Comments List */}
                        <div className="divide-y divide-zinc-900/50">
                          {projectReview.comments.map((comment: any) => (
                            <div key={comment.id} className="p-5 px-6 flex items-start gap-4 hover:bg-zinc-900/30 transition group">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">
                                  {comment.author_name?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="text-xs font-bold text-white">{comment.author_name}</span>
                                  {comment.timestamp != null && (
                                    <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {(() => { const m = Math.floor(comment.timestamp / 60); const s = comment.timestamp % 60; return `${m}:${String(s).padStart(2, '0')}`; })()}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-zinc-700">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}
                                  </span>
                                </div>
                                <p className="text-sm text-zinc-300 font-light leading-relaxed">{comment.text}</p>
                              </div>

                              <div className="flex items-center gap-2 transition-opacity">
                                {comment.is_resolved && (
                                  <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mr-2">
                                    Resolved
                                  </span>
                                )}
                                <button 
                                  onClick={async () => {
                                    await api.put(`/comments/${comment.id}`, { is_resolved: !comment.is_resolved });
                                    fetchReviews();
                                  }}
                                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 ${
                                    comment.is_resolved 
                                      ? 'bg-zinc-800 text-zinc-500 hover:text-white' 
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {comment.is_resolved ? 'Reopen' : 'Resolve'}
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm("Permanently delete this comment?")) {
                                      await api.delete(`/comments/${comment.id}`);
                                      fetchReviews();
                                    }
                                  }}
                                  className="p-1.5 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition"
                                  title="Delete Feedback"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#050505] border border-zinc-900 rounded-xl p-8 lg:p-12 max-w-3xl">
                   <form onSubmit={handleUpdatePortfolio} className="space-y-10">
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Primary Domain</label>
                        <input disabled type="text" value={portfolio.subdomain + ".foliohub.media"} className="w-full bg-transparent border-b-2 border-zinc-800 py-3 text-lg text-zinc-500 cursor-not-allowed font-light" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">Custom Domain</label>
                          {subTier === 'free' && (
                            <span className="bg-[#6366f1]/20 text-[#818cf8] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border border-[#6366f1]/30">Premium Only</span>
                          )}
                        </div>
                        <div className="relative group">
                          <input 
                            name="custom_domain" 
                            type="text" 
                            placeholder={subTier === 'free' ? "Upgrade to unlock custom domains" : "work.yourname.com"}
                            defaultValue={portfolio.custom_domain || ''} 
                            disabled={subTier === 'free'}
                            className={`w-full bg-transparent border-b-2 py-3 text-lg font-light outline-none transition-colors ${subTier === 'free' ? 'border-zinc-900 text-zinc-700 cursor-not-allowed' : 'border-zinc-800 focus:border-white text-white'}`} 
                          />
                          {subTier === 'free' && (
                            <div className="absolute right-0 top-3 text-zinc-700 group-hover:text-zinc-500 transition cursor-help" title="Custom domains require a Premium subscription.">
                               <Shield className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        {subTier === 'free' ? (
                          <p className="text-[10px] text-zinc-600 font-mono mt-3 uppercase tracking-widest leading-relaxed">
                            Point your professional domain to FolioHub (PRO feature).
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest leading-relaxed">
                              Configure your DNS with the following record to activate:
                            </p>
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 font-mono text-xs space-y-2">
                              <div className="flex items-center gap-3 text-zinc-400">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 w-12">Type</span>
                                <span className="text-white font-bold">CNAME</span>
                              </div>
                              <div className="flex items-center gap-3 text-zinc-400">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 w-12">Host</span>
                                <span className="text-white">@ or www</span>
                              </div>
                              <div className="flex items-center gap-3 text-zinc-400">
                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 w-12">Value</span>
                                <span className="text-emerald-400 font-bold">foliohub.media</span>
                              </div>
                            </div>
                            {portfolio.custom_domain && (
                              <p className="text-[10px] text-emerald-500/70 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3" /> Domain saved. DNS propagation may take up to 48 hours.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand" /> Custom Branding</label>
                        <p className="text-xs text-zinc-600 mb-6 font-light">Look like a brand, not just a random freelancer.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                           <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Logo URL (Optional)</label>
                              <input name="logo_url" type="text" placeholder="https://..." defaultValue={portfolio.logo_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           </div>
                           <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Accent Color (Hex)</label>
                              <div className="flex gap-4">
                                <input name="accent_color" type="color" defaultValue={portfolio.accent_color || '#ffffff'} className="w-12 h-12 rounded bg-transparent border-none cursor-pointer" />
                                <input type="text" placeholder="#ffffff" value={portfolio.accent_color || '#ffffff'} disabled className="w-full bg-transparent border-b-2 border-zinc-800 py-3 text-lg text-zinc-500 font-light outline-none" />
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Typography Style</label>
                              <select name="typography" defaultValue={portfolio.typography || 'sans'} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors">
                                 <option value="sans" className="bg-black text-white">Sans-serif (Modern)</option>
                                 <option value="serif" className="bg-black text-white">Serif (Elegant)</option>
                                 <option value="mono" className="bg-black text-white">Monospace (Tech)</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Intro Animation</label>
                              <select name="intro_style" defaultValue={portfolio.intro_style || 'default'} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors">
                                 <option value="default" className="bg-black text-white">Default Fade</option>
                                 <option value="cinematic" className="bg-black text-white">Cinematic Slide</option>
                                 <option value="glitch" className="bg-black text-white">Glitch Effect</option>
                                 <option value="none" className="bg-black text-white">None (Instant Load)</option>
                              </select>
                           </div>
                        </div>
                     </div>
                     <div className="pt-8 border-t border-zinc-900">
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Social Proof / Trust Builders</label>
                        <p className="text-xs text-zinc-600 mb-6 font-light">Highlight your biggest milestones to convert high-ticket clients instantly.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                           <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Headline / Milestone</label>
                              <input name="social_proof_headline" type="text" placeholder='e.g., "Edited shorts that reached 5M+ views"' defaultValue={portfolio.social_proof_headline || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           </div>
                           <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Platform Rating</label>
                              <input name="platform_rating" type="text" placeholder="e.g., 5.0 on Fiverr (100+ Reviews)" defaultValue={portfolio.platform_rating || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-2">Brands / Creators Worked With (comma separated)</label>
                           <input name="brands_worked_with" type="text" placeholder="Nike, MrBeast, RedBull" defaultValue={portfolio.brands_worked_with || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
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
                           <input name="contact_email" type="email" placeholder="Public Contact Email" defaultValue={portfolio.contact_email || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="whatsapp_number" type="text" placeholder="WhatsApp Number (incl. country code)" defaultValue={portfolio.whatsapp_number || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="fiverr_url" type="text" placeholder="Fiverr / Upwork URL" defaultValue={portfolio.fiverr_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="youtube_url" type="text" placeholder="YouTube Channel URL" defaultValue={portfolio.youtube_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="instagram_url" type="text" placeholder="Instagram URL" defaultValue={portfolio.instagram_url || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                           <input name="booking_link" type="text" placeholder="Booking Link (Calendly)" defaultValue={portfolio.booking_link || ''} className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg text-white font-light outline-none transition-colors" />
                        </div>
                     </div>
                     <div className="pt-8 border-t border-zinc-900">
                        <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3">Security & Access</label>
                        <div className="bg-black border border-zinc-800 p-6 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                           <div>
                              <h4 className="font-bold text-white mb-1">Two-Factor Authentication</h4>
                              <p className="text-sm text-zinc-500">Require a custom security PIN for all studio accesses.</p>
                           </div>
                           <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                              {twoFactorEnabled ? (
                                <>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setTwoFactorModalType('edit');
                                      setTwoFactorModalError('');
                                      setTwoFactorModalPassword('');
                                      setTwoFactorModalCode('');
                                      setShow2faSetupModal(true);
                                    }}
                                    className="w-full sm:w-auto px-6 py-3 border border-zinc-700 text-white hover:bg-white hover:text-black text-[11px] uppercase tracking-widest font-bold transition flex items-center justify-center min-w-[120px]"
                                  >
                                    Edit PIN
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setTwoFactorModalType('disable');
                                      setTwoFactorModalError('');
                                      setTwoFactorModalPassword('');
                                      setTwoFactorModalCode('');
                                      setShow2faSetupModal(true);
                                    }}
                                    className="w-full sm:w-auto px-6 py-3 border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-[11px] uppercase tracking-widest font-bold transition flex items-center justify-center min-w-[120px]"
                                  >
                                    Disable 2FA
                                  </button>
                                </>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setTwoFactorModalType('enable');
                                    setTwoFactorModalError('');
                                    setTwoFactorModalPassword('');
                                    setTwoFactorModalCode('');
                                    setShow2faSetupModal(true);
                                  }}
                                  className="w-full sm:w-auto px-6 py-3 border border-zinc-700 text-white hover:bg-white hover:text-black text-[11px] uppercase tracking-widest font-bold transition flex items-center justify-center min-w-[140px]"
                                >
                                  Enable 2FA
                                </button>
                              )}
                            </div>
                        </div>
                     </div>

                     <button type="submit" disabled={settingsLoading} className="px-8 py-4 bg-white text-black font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-zinc-200 transition">Update Configuration</button>
                    </form>

                    <div className="mt-20 pt-10 border-t border-zinc-900">
                       <h3 className="text-xl font-bold text-white mb-6 tracking-tight">Identity & Security Operations</h3>
                       
                       {managementError && (
                          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono uppercase tracking-widest">{managementError}</div>
                       )}
                       {managementSuccess && (
                          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-mono uppercase tracking-widest">{managementSuccess}</div>
                       )}

                       <div className="space-y-8">
                          {/* Email Update */}
                          <div className="bg-[#0a0a0a] border border-zinc-800 p-8 rounded-xl">
                             <div className="flex items-start justify-between mb-8">
                                <div>
                                   <h4 className="font-bold text-white mb-1">Professional Identity</h4>
                                   <p className="text-sm text-zinc-500">Update the primary email used for dashboard access and system alerts.</p>
                                </div>
                             </div>
                             <form onSubmit={handleUpdateEmail} className="grid grid-cols-1 gap-4">
                                <input name="newEmail" type="email" placeholder="new-identity@studio.com" required className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm text-white font-light outline-none transition-colors" />
                                <button type="submit" disabled={managementLoading} className="w-full py-3 bg-zinc-900 border border-zinc-800 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white hover:text-black transition">Update Identity</button>
                             </form>
                          </div>

                          {/* Password & Nuke */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-[#0a0a0a] border border-zinc-800 p-8 rounded-xl flex flex-col justify-between">
                                <div>
                                   <h4 className="font-bold text-white mb-1">Rotation Protocol</h4>
                                   <p className="text-sm text-zinc-500 mb-6">Regularly rotate your Security Key to ensure maximum studio integrity.</p>
                                </div>
                                <button onClick={() => setShowManagePasswordModal(true)} className="w-full py-3 bg-zinc-900 border border-zinc-800 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white hover:text-black transition">Initialize Rotation</button>
                             </div>

                             <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-xl flex flex-col justify-between">
                                <div>
                                   <h4 className="font-bold text-red-500 mb-1 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Destruction Protocol</h4>
                                   <p className="text-sm text-zinc-500 mb-6">Permanently wipe your account, media, and digital footprint from the platform.</p>
                                </div>
                                <button onClick={() => setShowDeleteAccountModal(true)} className="w-full py-3 bg-red-600 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-red-700 transition">Commence Wipe</button>
                             </div>
                          </div>

                          {/* GDPR Privacy Section */}
                          <div className="bg-[#050505] border border-zinc-900 p-8 rounded-xl">
                             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                                <div>
                                   <h4 className="font-bold text-white mb-1 flex items-center gap-2"><Shield className="w-4 h-4 text-zinc-500" /> Privacy & Data Portability</h4>
                                   <p className="text-sm text-zinc-500 max-w-lg leading-relaxed">In accordance with GDPR, you have the right to access and port your data. You can download a structured digital archive of your entire studio history.</p>
                                </div>
                                <button 
                                  onClick={handleExportData}
                                  disabled={managementLoading}
                                  className="w-full sm:w-auto px-6 py-3 border border-white text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white hover:text-black transition flex items-center justify-center gap-2"
                                >
                                   <DownloadCloud className="w-4 h-4" /> Download archive
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
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
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition"
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
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-xl outline-none transition-colors text-white placeholder-zinc-500 font-medium"
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
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-lg outline-none transition-colors h-24 resize-none text-white placeholder-zinc-500 font-medium"
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
                      <option value="Gaming edits" className="bg-black text-white">Gaming edits</option>
                      <option value="Commercial ads" className="bg-black text-white">Commercial ads</option>
                      <option value="YouTube videos" className="bg-black text-white">YouTube videos</option>
                      <option value="Cinematic edits" className="bg-black text-white">Cinematic edits</option>
                      <option value="TikTok/Reels" className="bg-black text-white">TikTok/Reels</option>
                      <option value="Documentary" className="bg-black text-white">Documentary</option>
                      <option value="Wedding edits" className="bg-black text-white">Wedding edits</option>
                      <option value="Motion graphics" className="bg-black text-white">Motion graphics</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Project Status</label>
                    <select 
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base sm:text-lg outline-none transition-colors text-white font-light"
                      value={uploadStatus}
                      onChange={(e) => setUploadStatus(e.target.value)}
                      disabled={isUploading}
                    >
                      <option value="draft" className="bg-black text-amber-500">Draft (Client Review)</option>
                      <option value="needs_revision" className="bg-black text-red-500">Needs Revision</option>
                      <option value="approved" className="bg-black text-emerald-500">Approved</option>
                      <option value="published" className="bg-black text-white">Published</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-1 sm:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                     <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Smart Tags</label>
                     <button 
                       type="button"
                       onClick={(e) => {
                         e.preventDefault();
                         const textToAnalyze = `${uploadTitle} ${uploadDesc} ${uploadCategory}`.toLowerCase();
                         const potentialTags = [];
                         if (textToAnalyze.includes('game') || textToAnalyze.includes('gaming')) potentialTags.push('Gaming');
                         if (textToAnalyze.includes('cinematic')) potentialTags.push('Cinematic');
                         if (textToAnalyze.includes('anime')) potentialTags.push('Anime');
                         if (textToAnalyze.includes('ad') || textToAnalyze.includes('commercial')) potentialTags.push('Commercial');
                         if (textToAnalyze.includes('fast')) potentialTags.push('Fast-Paced');
                         
                         if (potentialTags.length === 0) potentialTags.push('High-Energy', 'Storytelling'); // Default simulated tags
                         setUploadTags(potentialTags.join(', '));
                       }}
                       className="text-[10px] bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition text-zinc-300"
                     >
                       <Sparkles className="w-3 h-3 text-emerald-400" /> Auto-Tag with AI
                     </button>
                  </div>
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base outline-none transition-colors text-white placeholder-zinc-500 font-medium"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    disabled={isUploading}
                    placeholder="Gaming, Cinematic, Fast-Paced (Comma separated)"
                  />
                </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Your Role</label>
                    <input 
                      type="text" 
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base sm:text-lg outline-none transition-colors text-white placeholder-zinc-500 font-medium"
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
                      className="w-full bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-base sm:text-lg outline-none transition-colors text-white placeholder-zinc-500 font-medium"
                      value={uploadTools}
                      onChange={(e) => setUploadTools(e.target.value)}
                      disabled={isUploading}
                      placeholder="Premiere Pro, DaVinci Resolve, After Effects"
                    />
                  </div>
                </div>
                <div className="pt-6 border-t border-zinc-900 space-y-6">
                   <div className="space-y-4">
                     <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400 flex items-center gap-2">
                       <Activity className="w-4 h-4 text-emerald-500" /> Hybrid Analytics Engine
                     </label>
                     <p className="text-[10px] text-zinc-500 font-light mb-4">
                        Auto-import public data from a link, then manually add hidden metrics and strategy notes.
                     </p>
                     
                     <div className="flex gap-2">
                       <input 
                          type="text" 
                          className="flex-1 bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" 
                          placeholder="Paste YouTube, TikTok, or Instagram link..." 
                          value={sourceLink} 
                          onChange={(e) => setSourceLink(e.target.value)} 
                          disabled={isUploading} 
                       />
                       <button type="button" className="px-4 py-2 bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition shrink-0" disabled={isUploading} onClick={() => alert('Syncing public metrics... (Placeholder for API integration)')}>
                         Auto-Sync
                       </button>
                     </div>

                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500">Views</label>
                         <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={metricViews} onChange={(e) => setMetricViews(e.target.value)} disabled={isUploading} placeholder="e.g. 5.2M" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500">Likes</label>
                         <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={metricLikes} onChange={(e) => setMetricLikes(e.target.value)} disabled={isUploading} placeholder="e.g. 100K" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500">Comments</label>
                         <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={metricComments} onChange={(e) => setMetricComments(e.target.value)} disabled={isUploading} placeholder="e.g. 5K" />
                       </div>
                     </div>

                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-emerald-500">Retention (Hidden)</label>
                         <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={metricRetention} onChange={(e) => setMetricRetention(e.target.value)} disabled={isUploading} placeholder="e.g. 78%" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-emerald-500">CTR (Hidden)</label>
                         <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={metricCtr} onChange={(e) => setMetricCtr(e.target.value)} disabled={isUploading} placeholder="e.g. 12.4%" />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-emerald-500">Watch Time (Hidden)</label>
                         <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={metricWatchTime} onChange={(e) => setMetricWatchTime(e.target.value)} disabled={isUploading} placeholder="e.g. 100K Hrs" />
                       </div>
                     </div>

                     <div className="space-y-4 pt-4 border-t border-zinc-900">
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500">Client Goals</label>
                          <textarea className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700 h-16 resize-none" value={clientGoals} onChange={(e) => setClientGoals(e.target.value)} disabled={isUploading} placeholder="e.g. Increase male demographic 18-24 by 20%" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500">Strategy Notes</label>
                          <textarea className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700 h-16 resize-none" value={strategyNotes} onChange={(e) => setStrategyNotes(e.target.value)} disabled={isUploading} placeholder="e.g. Used fast-paced J-cuts in the first 3 seconds to hook viewers..." />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500">Monetization Results</label>
                          <input type="text" className="w-full bg-transparent border-b border-zinc-800 focus:border-white py-2 text-sm outline-none transition-colors text-white placeholder-zinc-700" value={monetizationResults} onChange={(e) => setMonetizationResults(e.target.value)} disabled={isUploading} placeholder="e.g. Generated $15,000 in sponsor sales" />
                        </div>
                     </div>
                   </div>

                   <div>
                     <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Proof of Work: Timeline Breakdown (Optional)</label>
                     <textarea 
                       className="w-full mt-2 bg-transparent border-b-2 border-zinc-800 focus:border-white py-3 text-sm outline-none transition-colors h-24 resize-none text-white placeholder-zinc-500 font-medium"
                       value={uploadTimeline}
                       onChange={(e) => setUploadTimeline(e.target.value)}
                       disabled={isUploading}
                       placeholder="0:00 - Main intro using Luma Matte transition&#10;0:15 - Speed ramp sequence built natively"
                     />
                     <p className="text-[10px] text-zinc-500 font-mono mt-2">Detail your edits here to verify authenticity.</p>
                   </div>
                   
                   <div className="space-y-1">
                      <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Proof of Work: Project Files (Optional)</label>
                      <div className="mt-2 space-y-3">
                        {/* --- Existing Files (on Server) --- */}
                        {editingProject && existingProjectFiles.length > 0 && (
                          <div className="space-y-2">
                             <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-[0.2em] mb-1">On Cloud Storage</p>
                             {existingProjectFiles.map((url, idx) => {
                               const fileName = url.split('/').pop()?.split('?')[0] || "Attachment";
                               return (
                                <div key={`existing-${idx}`} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-3 rounded-lg group/item">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-brand/10 flex items-center justify-center shrink-0">
                                      <CheckCircle2 className="w-4 h-4 text-brand" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{decodeURIComponent(fileName)}</p>
                                      <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">Stored</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setExistingProjectFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="w-8 h-8 rounded-full hover:bg-red-500/20 hover:text-red-500 text-zinc-600 transition flex items-center justify-center"
                                    title="Delete from project"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                               );
                             })}
                          </div>
                        )}

                        <div className="relative group">
                          <input 
                            type="file" 
                            multiple
                            accept=".prproj,.drp,.aep,image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setUploadProjectFiles(prev => [...prev, ...files]);
                            }}
                            disabled={isUploading}
                          />
                          <div className="w-full border-2 border-dashed border-zinc-800 bg-transparent group-hover:border-zinc-600 p-4 flex flex-col items-center justify-center transition text-center">
                            <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 group-hover:text-white transition">
                              {editingProject ? 'Add More Attachments' : 'Add .prproj, .aep, or timeline screenshots'}
                            </p>
                          </div>
                        </div>

                        {/* --- New Files (Selected but not uploaded) --- */}
                        {uploadProjectFiles.length > 0 && (
                          <div className="space-y-2">
                            {editingProject && <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-[0.2em] mb-1">New Attachments</p>}
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              {uploadProjectFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg group/item">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                                      <Grid className="w-4 h-4 text-zinc-500" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{file.name}</p>
                                      <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5">Pending Upload</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => setUploadProjectFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="w-8 h-8 rounded-full hover:bg-red-500/20 hover:text-red-500 text-zinc-600 transition flex items-center justify-center"
                                    title="Remove attachment"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Final Edit Video</label>
                    <div className="relative group mt-2">
                      <input 
                        type="file" 
                        accept="video/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        disabled={isUploading}
                      />
                      <div className={`w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition ${selectedFile ? 'border-white bg-white/5' : 'border-zinc-800 bg-transparent group-hover:border-zinc-600'}`}>
                        {selectedFile ? (
                          <>
                            <p className="text-sm font-medium text-white max-w-[200px] truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest">New Main Video Selected</p>
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedFile(null); }}
                              className="absolute top-2 right-2 p-1.5 bg-zinc-800/80 hover:bg-red-500 text-zinc-400 hover:text-white rounded-full transition z-20"
                              title="Remove file"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 group-hover:text-white transition">Drag & Drop or Click to Upload</p>
                            {editingProject && <p className="text-[8px] text-zinc-600 mt-1 uppercase tracking-widest">Leave empty to keep existing version</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Custom Thumbnail (Optional)</label>
                    <div className="mt-2 space-y-2">
                      {editingProject && existingThumbnail && (
                        <div className="relative group/thumb aspect-video bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                           <img src={existingThumbnail} alt="Existing Thumbnail" className="w-full h-full object-cover opacity-50" />
                           <div className="absolute inset-0 flex items-center justify-center">
                             <button 
                               onClick={() => setExistingThumbnail(null)}
                               className="px-3 py-1.5 bg-red-500 text-white text-[9px] uppercase font-bold tracking-widest rounded hover:bg-red-600 transition"
                             >
                               Delete Thumbnail
                             </button>
                           </div>
                        </div>
                      )}
                      
                      {(!editingProject || !existingThumbnail) && (
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                            onChange={(e) => setUploadThumbnailFile(e.target.files?.[0] || null)}
                            disabled={isUploading}
                          />
                          <div className={`w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition ${uploadThumbnailFile ? 'border-white bg-white/5' : 'border-zinc-800 bg-transparent group-hover:border-zinc-600'}`}>
                            {uploadThumbnailFile ? (
                              <>
                                <p className="text-sm font-medium text-white max-w-[200px] truncate">{uploadThumbnailFile.name}</p>
                                <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest">New Thumbnail</p>
                                <button 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUploadThumbnailFile(null); }}
                                  className="absolute top-2 right-2 p-1.5 bg-zinc-800/80 hover:bg-red-500 text-zinc-400 hover:text-white rounded-full transition z-20"
                                  title="Remove thumbnail"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 group-hover:text-white transition text-center">Upload Poster Image</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-6 border-t border-zinc-900">
                  <label className="text-xs uppercase tracking-[0.2em] font-medium text-zinc-400">Raw Footage / Before Edit (Optional)</label>
                  <div className="mt-2 space-y-2">
                     {editingProject && existingRaw && (
                       <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-brand/10 flex items-center justify-center text-brand">
                              <Play className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-wider">Original Raw Footage</p>
                              <p className="text-[9px] text-zinc-500 font-mono mt-0.5 tracking-widest uppercase">Stored on S3</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => setExistingRaw(null)}
                           className="px-4 py-2 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition rounded"
                         >
                           Delete Raw
                         </button>
                       </div>
                     )}

                     {(!editingProject || !existingRaw) && (
                       <div className="relative group">
                        <input 
                          type="file" 
                          accept="video/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                          onChange={(e) => setUploadRawFile(e.target.files?.[0] || null)}
                          disabled={isUploading}
                        />
                        <div className={`w-full border-2 border-dashed p-6 flex flex-col items-center justify-center transition ${uploadRawFile ? 'border-white bg-white/5' : 'border-zinc-800 bg-transparent group-hover:border-zinc-600'}`}>
                          {uploadRawFile ? (
                            <>
                              <p className="text-sm font-medium text-white max-w-sm text-center truncate">{uploadRawFile.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-widest">New Raw Selected</p>
                              <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUploadRawFile(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-zinc-800/80 hover:bg-red-500 text-zinc-400 hover:text-white rounded-full transition z-20"
                                title="Remove raw footage"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 group-hover:text-white transition text-center">Attach original video for before/after comparison</p>
                          )}
                        </div>
                      </div>
                     )}
                  </div>
                </div>

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
                  disabled={isSubmittingForm || (!editingProject && !selectedFile)}
                  className="w-full py-5 mt-4 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-[0.2em] text-[11px] transition duration-200 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSubmittingForm ? (
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

      {/* Security Modals */}
      <AnimatePresence>
        {showManagePasswordModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowManagePasswordModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0a0a0a] border border-zinc-800 p-8 sm:p-12 rounded-2xl max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-2">Key Rotation</h3>
                <p className="text-zinc-500 text-sm mb-8">Enter your current key to establish a new one.</p>
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Current Key</label>
                      <input name="currentPassword" type="password" required className="w-full bg-transparent border-b border-zinc-800 py-2 text-white outline-none focus:border-white transition-colors" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">New Strategic Key</label>
                      <input 
                        name="newPassword" 
                        type="password" 
                        required 
                        value={rotationNewPassword}
                        onChange={(e) => setRotationNewPassword(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-800 py-2 text-white outline-none focus:border-white transition-colors" 
                      />
                   </div>
                   
                   {/* Strength Guard */}
                   <PasswordStrength password={rotationNewPassword} />

                   <div className="space-y-1 pt-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Confirm New Key</label>
                      <input name="confirmPass" type="password" required className="w-full bg-transparent border-b border-zinc-800 py-2 text-white outline-none focus:border-white transition-colors" />
                   </div>
                   <button type="submit" disabled={managementLoading} className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-[11px] hover:bg-zinc-200 transition">Commit Rotation</button>
                   <button type="button" onClick={() => setShowManagePasswordModal(false)} className="w-full text-zinc-600 text-[10px] uppercase tracking-widest hover:text-white transition">Abort</button>
                </form>
             </motion.div>
          </div>
        )}

        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteAccountModal(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0a0a0a] border border-red-500/20 p-8 sm:p-12 rounded-2xl max-w-lg w-full shadow-2xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
                   <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter italic font-serif">Critical Warning</h3>
                <div className="space-y-4 text-zinc-400 text-sm font-light leading-relaxed mb-10">
                   <p><span className="text-white font-bold">This is an irreversible data wipe.</span> If you proceed, the following will occur:</p>
                   <ul className="list-disc pl-5 space-y-2 text-xs">
                      <li>Your studio master account will be terminated immediately.</li>
                      <li>ALL raw footage, final edits, and project metadata will be purged from AWS S3.</li>
                      <li>Your public portfolio domain will become dark.</li>
                      <li>Leads, inquiries, and analytics data will be permanently shredded.</li>
                   </ul>
                   <p className="text-red-500/80 font-mono text-[10px] uppercase mt-4 tracking-widest">Once initiated, this protocol cannot be paused or recovered.</p>
                </div>
                
                <form onSubmit={handleDeleteAccount} className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Confirm Identity with Security Key</label>
                      <input name="verifyPassword" type="password" required placeholder="Enter key to confirm wipe" className="w-full bg-transparent border-b border-red-500/30 focus:border-red-500 py-3 text-white outline-none transition-colors" />
                   </div>
                   <button type="submit" disabled={managementLoading} className="w-full py-5 bg-red-600 text-white font-bold uppercase tracking-[0.2em] text-[11px] hover:bg-red-700 transition flex items-center justify-center gap-3 shadow-lg shadow-red-900/20">
                      {managementLoading ? 'Commencing Wipe...' : 'Permanently Shred Account'}
                   </button>
                   <button type="button" onClick={() => setShowDeleteAccountModal(false)} className="w-full text-zinc-600 text-[10px] uppercase tracking-widest hover:text-white transition py-2">Return to Safety</button>
                </form>
             </motion.div>
          </div>
        )}

        {show2faSetupModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow2faSetupModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0a0a0a] border border-zinc-800 p-8 sm:p-12 rounded-2xl max-w-md w-full shadow-2xl font-sans">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {twoFactorModalType === 'enable' && 'Enable Two-Factor'}
                  {twoFactorModalType === 'disable' && 'Disable Two-Factor'}
                  {twoFactorModalType === 'edit' && 'Update Security PIN'}
                </h3>
                <p className="text-zinc-500 text-sm mb-8">
                  {twoFactorModalType === 'enable' && 'Set a custom PIN to secure access. Verifying your password is required.'}
                  {twoFactorModalType === 'disable' && 'Verify your password to disable two-factor authentication.'}
                  {twoFactorModalType === 'edit' && 'Verify your password and enter a new two-factor security PIN.'}
                </p>
                <form onSubmit={handleTwoFactorAction} className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Confirm Password</label>
                      <input 
                        type="password" 
                        required 
                        value={twoFactorModalPassword}
                        onChange={(e) => setTwoFactorModalPassword(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-800 py-2 text-white outline-none focus:border-white transition-colors" 
                      />
                   </div>

                   {(twoFactorModalType === 'enable' || twoFactorModalType === 'edit') && (
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Custom Security PIN (min 4 chars)</label>
                        <input 
                          type="password" 
                          required 
                          value={twoFactorModalCode}
                          onChange={(e) => setTwoFactorModalCode(e.target.value)}
                          className="w-full bg-transparent border-b border-zinc-800 py-2 text-white outline-none focus:border-white transition-colors font-mono tracking-widest" 
                        />
                     </div>
                   )}

                   {twoFactorModalError && (
                      <div className="p-3 border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-mono uppercase tracking-widest rounded-lg">
                        {twoFactorModalError}
                      </div>
                   )}

                   <button 
                     type="submit" 
                     disabled={managementLoading} 
                     className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-[11px] hover:bg-zinc-200 transition"
                   >
                     {managementLoading ? 'Processing...' : (
                       <>
                         {twoFactorModalType === 'enable' && 'Activate 2FA'}
                         {twoFactorModalType === 'disable' && 'Disable 2FA'}
                         {twoFactorModalType === 'edit' && 'Update PIN'}
                       </>
                     )}
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setShow2faSetupModal(false)} 
                     className="w-full text-zinc-600 text-[10px] uppercase tracking-widest hover:text-white transition"
                   >
                     Abort
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}