import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { BookOpen, Award, CheckCircle, ArrowRight, Layers, Sparkles, Filter, Code } from 'lucide-react';

export interface Course {
  id: string;
  title: string;
  description: string;
  programming_language: string;
  difficulty: string;
  thumbnail_url?: string;
  total_levels: number;
  user_progress?: {
    completed_levels: number;
    current_level: number;
    total_xp: number;
    has_certificate: boolean;
  };
}

interface CourseCatalogProps {
  onSelectCourse: (courseId: string) => void;
  onOpenSetupModal: () => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({ onSelectCourse, onOpenSetupModal }) => {
  const { user, isConfigured, openAuthModal } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ courses: Course[] }>('/api/courses');
      setCourses(res.courses || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const filteredCourses = courses.filter((c) => {
    if (selectedLanguage === 'all') return true;
    return c.programming_language.toLowerCase() === selectedLanguage.toLowerCase();
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-[#27272a] bg-gradient-to-r from-[#18181b] via-[#111114] to-[#18181b] p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/40 bg-[#6d28d9]/10 px-3 py-1 text-xs font-mono text-[#d3bbff] mb-4">
            <Sparkles className="h-3 w-3" />
            <span>CodeEase Precision Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Learn to Code. Play. Level Up. Get Certified.
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#a1a1aa] leading-relaxed">
            High-density interactive tracks designed for engineers. Master fundamentals through sequential level unlocking, server-graded quizzes, isolated sandboxes, and verifiable certificates.
          </p>

          {!user && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => openAuthModal('signup')}
                className="flex items-center gap-2 rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-medium text-white shadow-lg shadow-[#6d28d9]/30 hover:bg-[#8b5cf6] transition-all"
              >
                Start Learning Free
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => openAuthModal('signin')}
                className="rounded-lg border border-[#27272a] bg-[#18181b] px-4 py-2 text-xs font-medium text-[#ccc3d7] hover:text-white transition-colors"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-[#6d28d9]/10 blur-3xl pointer-events-none" />
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#27272a] pb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[#71717a]" />
          <span className="text-xs font-medium text-[#71717a]">Filter Tracks:</span>
          <div className="flex items-center gap-1.5 ml-2">
            {['all', 'python', 'javascript', 'c'].map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`rounded-md px-2.5 py-1 text-xs font-mono capitalize transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-[#6d28d9] text-white font-medium'
                    : 'bg-[#18181b] text-[#a1a1aa] hover:text-white border border-[#27272a]'
                }`}
              >
                {lang === 'all' ? 'All Languages' : lang}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-[#71717a] font-mono">
          Showing {filteredCourses.length} {filteredCourses.length === 1 ? 'track' : 'tracks'}
        </div>
      </div>

      {/* Course List / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 rounded-xl border border-[#27272a] bg-[#18181b] animate-pulse p-6" />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const completed = course.user_progress?.completed_levels || 0;
            const total = course.total_levels || 1;
            const progressPercent = Math.min(100, Math.round((completed / total) * 100));
            const hasCert = course.user_progress?.has_certificate;

            return (
              <div
                key={course.id}
                className="group relative flex flex-col justify-between rounded-xl border border-[#27272a] bg-[#18181b] p-6 transition-all hover:border-[#a78bfa]/50 hover:shadow-lg hover:shadow-[#6d28d9]/5"
              >
                <div>
                  {/* Top badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#27272a] bg-[#111114] px-2 py-0.5 font-mono text-[11px] font-medium uppercase text-[#d3bbff]">
                      <Code className="h-3 w-3" />
                      {course.programming_language}
                    </span>
                    <span className="rounded px-2 py-0.5 text-[11px] font-medium capitalize bg-zinc-800/80 text-zinc-300">
                      {course.difficulty}
                    </span>
                  </div>

                  {/* Course Title */}
                  <h3 className="text-base font-semibold text-white group-hover:text-[#d3bbff] transition-colors">
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-xs text-[#a1a1aa] line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#27272a] space-y-3">
                  {/* Progress stats if authenticated */}
                  {user && course.user_progress && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa] mb-1.5">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3 text-[#a78bfa]" />
                          Level {course.user_progress.current_level} of {total}
                        </span>
                        <span>{progressPercent}% Complete</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#27272a] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#6d28d9] to-[#a78bfa] transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasCert && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" />
                          Certified
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectCourse(course.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d28d9] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm shadow-[#6d28d9]/30 hover:bg-[#8b5cf6] transition-colors"
                    >
                      {completed > 0 ? 'Resume Track' : 'Start Track'}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[#71717a] mb-3" />
          <h3 className="text-sm font-semibold text-white">No tracks available yet</h3>
          <p className="mt-1 text-xs text-[#a1a1aa] max-w-md mx-auto">
            {!isConfigured
              ? 'Connect your Supabase database and run the migration script to populate the initial Python, JavaScript, and C courses.'
              : 'Courses have not yet been seeded into the database.'}
          </p>
          {!isConfigured && (
            <button
              onClick={onOpenSetupModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors"
            >
              Configure Database & Seed Courses
            </button>
          )}
        </div>
      )}
    </div>
  );
};
