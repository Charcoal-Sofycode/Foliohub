# FolioHub

FolioHub is a premium SaaS portfolio platform designed specifically for video editors, motion graphics artists, and visual creators to showcase their work using a unified, cinematic brand identity. 

The platform allows creators to build custom portfolios, upload their projects with breakdown details, and manage billing through a centralized dashboard. It features a tier-based system (Free and Premium) enforced via Stripe, offering a highly polished, professional user experience.

## ✨ Features

- **Premium Cinematic UI:** Dark-mode optimized, visually stunning interface using Framer Motion and modern Tailwind CSS.
- **SaaS Subscription Model:** Integrated with Stripe to handle seamless upgrades from Free (limited to 5 projects) to Premium (unlimited projects, 4K uploads).
- **Secure Authentication:** Robust user authentication system powered by FastAPI, featuring password policies, forgotten password resets, and strictly enforced Two-Factor Authentication (2FA).
- **AWS S3 Media Management:** Secure, scalable video and high-resolution image hosting in the cloud.
- **AI Editor Matching:** Clients can use natural language searches (e.g., "fast-paced tiktok gaming editor with good color grading") and an AI backend algorithm matches them with the top portfolios using weighted heuristic skill scoring.
- **Project Breakdowns:** Creators can upload not just their final video, but timeline screenshots, raw files, and specific tools used to prove their exact role and workflow.

## 🛠️ Technology Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React 19)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **Media Playback:** React Player

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database:** SQLAlchemy (Targeted at Supabase / PostgreSQL)
- **Storage:** AWS S3
- **Payment Processing:** Stripe API

## 📂 Project Structure

```text
Portfolio/
├── backend/                  # FastAPI Application
│   ├── auth.py               # Authentication and JWT logic
│   ├── database.py           # Database connection and engine
│   ├── main.py               # Application entry point & API routes
│   ├── models.py             # SQLAlchemy ORM Models
│   ├── s3_utils.py           # AWS S3 upload functionality
│   ├── schemas.py            # Pydantic schemas for data validation
│   └── requirements.txt      # Python dependencies (create via pip freeze)
│
├── frontend/                 # Next.js Application
│   ├── src/                  # React components, pages, and app router
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Tailwind configuration
│   └── tsconfig.json         # TypeScript configuration
└── README.md                 # This documentation
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v20+ recommended)
- [Python](https://www.python.org/downloads/) (v3.9+)
- AWS S3 bucket credentials
- Stripe account (for secret keys)

### 1. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install the dependencies (assuming you have your environment set up):
   ```bash
   pip install fastapi "uvicorn[standard]" sqlalchemy stripe python-jose[cryptography] passlib[bcrypt] python-multipart boto3
   ```
4. Set your environment variables (create a `.env` file or export them):
   - `STRIPE_SECRET_KEY`
   - S3 Keys / Supabase credentials as needed by your configuration.
5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   *The API will be available at http://127.0.0.1:8000.*

### 2. Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The app will be available at http://localhost:3000.*

## 🔒 Environment Variables

Ensure you have the proper environment variables established in both environments. The backend specifically requires the Stripe secret key for payment sessions to function properly.

## 📄 License
This project is proprietary software. All rights reserved.
