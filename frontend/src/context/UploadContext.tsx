'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import axios from 'axios';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface UploadStatus {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'assembling' | 'completed' | 'failed';
  error?: string;
}

interface UploadContextType {
  activeUploads: UploadStatus[];
  startMultipartUpload: (file: File, onComplete: (url: string, key: string) => void) => Promise<{url: string, key: string}>;
  clearUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB standard S3 chunk
const MAX_RETRIES = 3;

/* ─── Provider ──────────────────────────────────────────────────────────── */
export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [activeUploads, setActiveUploads] = useState<UploadStatus[]>([]);
  const uploadsRef = useRef<Record<string, boolean>>({});

  const updateStatus = (id: string, delta: Partial<UploadStatus>) => {
    setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, ...delta } : u));
  };

  // Define clearUpload first so the ref below is available immediately
  const clearUpload = useCallback((id: string) => {
    uploadsRef.current[id] = false;
    setActiveUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  // Keep a stable ref so setTimeout callbacks inside startMultipartUpload always
  // call the latest clearUpload, even with an empty dependency array.
  const clearUploadRef = useRef(clearUpload);
  clearUploadRef.current = clearUpload;

  const startMultipartUpload = useCallback(async (file: File, onComplete: (url: string, key: string) => void) => {
    const uploadIdInternal = Math.random().toString(36).substring(7);
    const newUpload: UploadStatus = {
      id: uploadIdInternal,
      fileName: file.name,
      progress: 0,
      status: 'pending'
    };

    setActiveUploads(prev => [...prev, newUpload]);
    uploadsRef.current[uploadIdInternal] = true;

    try {
      // 1. Initiate on Backend
      updateStatus(uploadIdInternal, { status: 'uploading' });
      const initRes = await api.post('/upload/initiate', {
        file_name: file.name,
        file_type: file.type
      });
      const { upload_id, object_key, file_url } = initRes.data;

      const totalParts = Math.ceil(file.size / CHUNK_SIZE);
      const completedParts: { ETag: string; PartNumber: number }[] = [];

      // 2. Upload Chunks
      for (let i = 1; i <= totalParts; i++) {
        // Stop if cleared
        if (!uploadsRef.current[uploadIdInternal]) return { url: '', key: '' };

        const start = (i - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        let success = false;
        let etag = '';
        
        // Retry logic for resiliance
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            // Get presigned URL for this specific part
            const presignRes = await api.get('/upload/presign-part', {
              params: { object_key, upload_id, part_number: i }
            });
            
            // Upload directly to S3
            const uploadRes = await axios.put(presignRes.data.url, chunk, {
              headers: { 'Content-Type': file.type }
            });

            // S3 ETag is often quoted. Axios headers are lowercase.
            // CAUTION: ETag must be in ExposeHeaders in S3 CORS policy
            etag = uploadRes.headers.etag || uploadRes.headers.ETag || '';
            
            if (!etag) {
              throw new Error("S3 ETag header missing. Ensure 'ETag' is in your S3 Bucket's ExposeHeaders CORS policy.");
            }

            success = true;
            break;
          } catch (e) {
            console.error(`Part ${i} attempt ${attempt + 1} failed`, e);
            if (attempt === MAX_RETRIES - 1) throw e;
          }
        }

        if (success) {
          completedParts.push({ ETag: etag, PartNumber: i });
          const newProgress = Math.round((i / totalParts) * 90); // last 10% for assembly
          updateStatus(uploadIdInternal, { progress: newProgress });
        }
      }

      // 3. Complete Assembly
      updateStatus(uploadIdInternal, { status: 'assembling', progress: 95 });
      await api.post('/upload/complete', {
        object_key,
        upload_id,
        parts: completedParts
      });

      updateStatus(uploadIdInternal, { status: 'completed', progress: 100 });
      onComplete(file_url, object_key);

      // Auto-dismiss the upload card after 4 seconds
      setTimeout(() => clearUploadRef.current(uploadIdInternal), 4000);
      
      return { url: file_url, key: object_key };

    } catch (err: any) {
      console.error('Multipart Upload Failed', err);
      updateStatus(uploadIdInternal, { 
        status: 'failed', 
        error: 'Network failure. Please retry upload.' 
      });
      // Auto-dismiss failed uploads after 8 seconds
      setTimeout(() => clearUploadRef.current(uploadIdInternal), 8000);
      return { url: '', key: '' };
    }
  }, []);

  return (
    <UploadContext.Provider value={{ activeUploads, startMultipartUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within an UploadProvider');
  return context;
}
