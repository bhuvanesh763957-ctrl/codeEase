import React, { useState, useEffect } from 'react';
import { X, Check, Copy, ExternalLink, RefreshCw, Database, Terminal, ShieldCheck } from 'lucide-react';
import { SystemConfig } from '../services/supabaseClient.ts';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'supabase' | 'judge0' | 'sql'>('supabase');

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/status');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Error fetching config status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const copySqlMigration = async () => {
    try {
      // In production or dev, fetch migration text or embed
      const sql = `-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    programming_language TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    thumbnail_url TEXT,
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL CHECK (level_number > 0),
    title TEXT NOT NULL,
    description TEXT,
    lesson_content TEXT NOT NULL,
    starter_code TEXT DEFAULT '',
    difficulty TEXT DEFAULT 'beginner',
    passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_course_level UNIQUE (course_id, level_number)
);

-- Questions table (Learner facing - NO answers)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB NOT NULL,
    points INTEGER DEFAULT 10 CHECK (points > 0),
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Answers table (Protected - NO learner access)
CREATE TABLE IF NOT EXISTS question_answers (
    question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    correct_answer TEXT NOT NULL
);

-- User Progress Tables
CREATE TABLE IF NOT EXISTS user_course_progress (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    completed_levels INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS user_level_progress (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
    best_score INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, level_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS code_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    programming_language TEXT NOT NULL,
    source_code TEXT NOT NULL,
    execution_status TEXT NOT NULL,
    output TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    final_score INTEGER NOT NULL,
    verification_status TEXT DEFAULT 'valid' CHECK (verification_status IN ('valid', 'revoked')),
    CONSTRAINT unique_user_course_certificate UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    xp INTEGER NOT NULL CHECK (xp >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_source_xp UNIQUE (user_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    xp_earned INTEGER DEFAULT 0,
    CONSTRAINT unique_user_activity_date UNIQUE (user_id, activity_date)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

-- Auto create profile on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-xl border border-[#27272a] bg-[#111114] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d28d9]/20 text-[#a78bfa] border border-[#6d28d9]/30">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Database & Services Architecture</h2>
              <p className="text-xs text-[#a1a1aa]">Supabase PostgreSQL, Auth & Judge0 Sandbox status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#71717a] hover:bg-[#18181b] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 pt-4">
          {/* Supabase Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#27272a] bg-[#18181b]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#a78bfa]" />
              <span className="text-xs font-medium text-white">Supabase DB</span>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                config?.supabaseConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config?.supabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {config?.supabaseConfigured ? 'Connected' : 'Pending'}
            </span>
          </div>

          {/* Service Role */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#27272a] bg-[#18181b]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#a78bfa]" />
              <span className="text-xs font-medium text-white">Service Role</span>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                config?.supabaseAdminConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config?.supabaseAdminConfigured ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
              {config?.supabaseAdminConfigured ? 'Active' : 'Optional'}
            </span>
          </div>

          {/* Judge0 Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#27272a] bg-[#18181b]">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#a78bfa]" />
              <span className="text-xs font-medium text-white">Judge0 Compiler</span>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                config?.judge0Configured
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config?.judge0Configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {config?.judge0Configured ? 'Active' : 'Unconfigured'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#27272a] px-6 pt-4 gap-4">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'supabase'
                ? 'border-[#a78bfa] text-white'
                : 'border-transparent text-[#71717a] hover:text-[#ccc3d7]'
            }`}
          >
            Supabase Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('judge0')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'judge0'
                ? 'border-[#a78bfa] text-white'
                : 'border-transparent text-[#71717a] hover:text-[#ccc3d7]'
            }`}
          >
            Judge0 Compiler Setup
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-[#a78bfa] text-white'
                : 'border-transparent text-[#71717a] hover:text-[#ccc3d7]'
            }`}
          >
            Migration SQL
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === 'supabase' && (
            <div className="space-y-4 text-[#ccc3d7]">
              <div className="rounded-lg bg-[#18181b] border border-[#27272a] p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#a78bfa]" />
                  Connecting Your Supabase Project (3 Easy Steps)
                </h3>
                <ol className="list-decimal pl-4 space-y-2.5">
                  <li>
                    <span className="font-medium text-white">Create or open your Supabase project:</span>
                    <p className="text-[#a1a1aa] mt-0.5">
                      Go to{' '}
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#a78bfa] hover:underline inline-flex items-center gap-1"
                      >
                        supabase.com/dashboard <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </li>
                  <li>
                    <span className="font-medium text-white">Run the schema migration:</span>
                    <p className="text-[#a1a1aa] mt-0.5">
                      Go to the <strong>SQL Editor</strong> in Supabase, click <strong>New Query</strong>, paste the CodeEase schema migration (available in the Migration SQL tab), and click <strong>Run</strong>.
                    </p>
                  </li>
                  <li>
                    <span className="font-medium text-white">Configure environment variables:</span>
                    <p className="text-[#a1a1aa] mt-0.5">
                      In Supabase <strong>Project Settings → API</strong>, copy your Project URL, anon public key, and service role key into your environment (or AI Studio secrets / <code>.env</code>):
                    </p>
                    <div className="mt-2 rounded bg-[#09090b] p-2.5 font-mono text-[11px] text-[#fafafa] border border-[#27272a]">
                      SUPABASE_URL="https://your-project.supabase.co"<br />
                      SUPABASE_ANON_KEY="eyJhbG..."<br />
                      SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."
                    </div>
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#27272a] bg-[#18181b] p-3">
                <span className="text-[#a1a1aa]">Check connection after adding credentials:</span>
                <button
                  onClick={checkStatus}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md bg-[#6d28d9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Re-test Connection
                </button>
              </div>
            </div>
          )}

          {activeTab === 'judge0' && (
            <div className="space-y-4 text-[#ccc3d7]">
              <div className="rounded-lg bg-[#18181b] border border-[#27272a] p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#a78bfa]" />
                  Setting Up Online Code Execution (Judge0)
                </h3>
                <p className="text-[#a1a1aa]">
                  CodeEase uses <strong>Judge0 CE</strong> to safely compile and run Python, JavaScript, C, C++, and Java in an isolated sandbox. Requests are proxied through the backend server, keeping API keys completely private.
                </p>
                <div className="space-y-2 mt-2">
                  <p className="font-medium text-white">Option A: RapidAPI Hosted Judge0 (Free tier available):</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-[#a1a1aa]">
                    <li>Sign up at <a href="https://rapidapi.com/hermancloud/api/judge0-ce" target="_blank" rel="noreferrer" className="text-[#a78bfa] hover:underline inline-flex items-center gap-1">RapidAPI Judge0 CE <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Subscribe to the Basic plan and copy your RapidAPI Key.</li>
                    <li>Set in your <code>.env</code>:</li>
                  </ol>
                  <div className="rounded bg-[#09090b] p-2.5 font-mono text-[11px] text-[#fafafa] border border-[#27272a]">
                    JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"<br />
                    JUDGE0_API_KEY="your-rapidapi-key"<br />
                    JUDGE0_API_HOST="judge0-ce.p.rapidapi.com"
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#a1a1aa]">
                  Full PostgreSQL schema with RLS, triggers, RPC transaction, and sample courses:
                </span>
                <button
                  onClick={copySqlMigration}
                  className="flex items-center gap-1.5 rounded-md bg-[#6d28d9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      Copied SQL!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy SQL Migration
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-[#27272a] bg-[#09090b] p-3 font-mono text-[11px] text-[#ccc3d7] leading-relaxed">
                <p className="text-[#a78bfa]">-- File: supabase/migrations/20261029_initial_schema.sql</p>
                <p className="text-zinc-500">-- Ready to execute in Supabase SQL Editor</p>
                <br />
                <p className="text-emerald-400">CREATE TABLE profiles (...);</p>
                <p className="text-emerald-400">CREATE TABLE courses (...);</p>
                <p className="text-emerald-400">CREATE TABLE levels (...);</p>
                <p className="text-emerald-400">CREATE TABLE questions (...);</p>
                <p className="text-emerald-400">CREATE TABLE question_answers (...);</p>
                <p className="text-emerald-400">CREATE TABLE user_course_progress (...);</p>
                <p className="text-emerald-400">CREATE TABLE user_level_progress (...);</p>
                <p className="text-emerald-400">CREATE TABLE quiz_attempts (...);</p>
                <p className="text-emerald-400">CREATE TABLE code_submissions (...);</p>
                <p className="text-emerald-400">CREATE TABLE certificates (...);</p>
                <p className="text-emerald-400">CREATE TABLE xp_events (...);</p>
                <p className="text-emerald-400">CREATE TABLE daily_activity (...);</p>
                <br />
                <p className="text-purple-400">CREATE FUNCTION submit_quiz_attempt(...) RETURNS JSONB ...;</p>
                <p className="text-purple-400">CREATE FUNCTION verify_certificate(...) RETURNS TABLE ...;</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[#27272a] px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-[#27272a] bg-[#18181b] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#27272a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
