# FolioHub

FolioHub is a high-performance, studio-grade SaaS portfolio platform engineered specifically for elite video editors, motion graphics artists, and visual auteurs. It transforms the generic "portfolio" into a cinematic experience, powered by an industrial-strength media pipeline.

## ✨ Elite Features

- **Asynchronous Media Pipeline:** Integrated **FFmpeg** engine that transcodes raw high-bitrate uploads into web-optimized H.264 streams in the background, ensuring flawless playback on any device.
- **Direct-to-S3 Ingestion:** Scalable architecture that bypasses traditional server bottlenecks by uploading massive 4K/ProRes project files directly from the browser to AWS S3.
- **Smart Status Sync:** Real-time dashboard polling system that automatically promotes projects from "Optimizing" to "Live" as soon as transcoding tasks conclude.
- **Before/After Interactive Player:** A custom cinematic player that allows creators to showcase color grading and VFX progress with a real-time interactive slider.
- **Premium Cinematic UI:** A mission-control dashboard and ethereal landing page powered by **Framer Motion**, featuring full-bleed localized master video assets for zero-latency visual impact.
- **Full Project Lifecycle (CRUD):** Complete control for creators to edit metadata, refine roles, or prune their portfolio directly from a studio-grade management interface.
- **Authentication & Security:** Robust FastAPI security layer featuring password encryption, JWT session management, and mandatory 2FA (Two-Factor Authentication).

## 🛠️ Performance Tech Stack

### Frontend (The Studio UI)
- **Framework:** Next.js 15 (React 19)
- **Animation Engine:** Framer Motion
- **Styling:** Vanilla CSS + Tailwind CSS v4
- **State Sync:** Real-time polling & Axios interceptors
- **Assets:** Localized 1080p master cinematic reels

### Backend (The Pipeline)
- **Orchestration:** FastAPI (Python 3.10+)
- **Transcoding:** FFmpeg (Hardware accelerated)
- **Asynchronous Tasks:** Python Multiprocessing & BackgroundTasks
- **Storage:** AWS S3 (Signed URLs & direct-upload policies)
- **Database:** SQLAlchemy (PostgreSQL / Supabase)
- **Payments:** Stripe API (Tiered project limits)

## 📂 Project Structure

```text
Foliohub/
├── backend/                  # Fast API + Transcoding Engine
│   ├── transcoding_utils.py  # FFmpeg processing logic
│   ├── s3_utils.py           # S3 Object & Presigned URL management
│   ├── main.py               # API Gateway & Backend Logic
│   └── models.py             # Database Schema
│
├── frontend/                 # Next.js Studio Interface
│   ├── public/               # Localized master cinematic assets
│   ├── src/app/              # App Router & UI components
│   └── lib/api.ts            # Client-side API orchestration
└── README.md                 # Project Blueprint
```

## 🚀 Getting Started

### Prerequisites
- **FFmpeg:** Must be installed and available in the system PATH (used for video optimization).
- **Node.js:** v20+
- **Python:** v3.10+
- **AWS S3:** Bucket with public-read and CORS permissions enabled.

### 1. Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `venv\Scripts\activate` (Windows)
4. `pip install -r requirements.txt` (including `boto3`, `fastapi`, `sqlalchemy`)
5. Configure `.env` with AWS and Stripe keys.
6. `uvicorn main:app --reload`

### 2. Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 📄 License
This project is proprietary software designed for the Foliohub Creator Network. All rights reserved.
