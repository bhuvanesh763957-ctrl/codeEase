import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ArrowLeft,
  Play,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Terminal,
  BookOpen,
  HelpCircle,
  Clock,
  Cpu,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  points: number;
}

interface Level {
  id: string;
  course_id: string;
  level_number: number;
  title: string;
  description: string;
  lesson_content: string;
  starter_code?: string;
  difficulty: string;
  passing_score: number;
  courses?: {
    title: string;
    programming_language: string;
  };
}

interface LevelSummary {
  id: string;
  level_number: number;
  title: string;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  best_score: number;
}

interface QuizSubmissionResult {
  passed: boolean;
  score: number;
  total_questions: number;
  correct_count: number;
  passing_score: number;
  xp_awarded: number;
  results: Array<{
    question_id: string;
    question_text: string;
    user_answer: string;
    is_correct: boolean;
    correct_answer?: string;
    explanation?: string;
  }>;
  next_level_id?: string;
}

interface LevelWorkspaceProps {
  courseId: string;
  initialLevelId?: string;
  onBackToCourses: () => void;
  onViewCertificates: () => void;
}

export const LevelWorkspace: React.FC<LevelWorkspaceProps> = ({
  courseId,
  initialLevelId,
  onBackToCourses,
  onViewCertificates,
}) => {
  const { user, refreshProfile, openAuthModal } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [activeLevelId, setActiveLevelId] = useState<string>(initialLevelId || '');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Tabs: 'lesson' | 'editor' | 'quiz'
  const [activeTab, setActiveTab] = useState<'lesson' | 'editor' | 'quiz'>('lesson');

  // Loading & Error States
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  // Code Editor & Runner State
  const [code, setCode] = useState<string>('');
  const [stdin, setStdin] = useState<string>('');
  const [runningCode, setRunningCode] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [compilerError, setCompilerError] = useState<string | null>(null);

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);

  // Certificate Issuance State
  const [issuingCert, setIssuingCert] = useState(false);
  const [certIssuedSuccess, setCertIssuedSuccess] = useState(false);

  // 1. Fetch Course details and Level summaries
  const loadCourse = async () => {
    setLoadingCourse(true);
    try {
      const data = await apiRequest<{ course: any; levels: LevelSummary[] }>(`/api/courses/${courseId}`);
      setCourse(data.course);
      setLevels(data.levels || []);

      // If activeLevelId not set or invalid, select the first unlocked or in_progress level
      const targetLevel = activeLevelId
        ? data.levels.find(l => l.id === activeLevelId)
        : data.levels.find(l => l.status === 'in_progress' || l.status === 'unlocked') || data.levels[0];

      if (targetLevel) {
        setActiveLevelId(targetLevel.id);
      }
    } catch (err: any) {
      console.error('Failed to load course:', err);
    } finally {
      setLoadingCourse(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [courseId, user]);

  // 2. Load Active Level Details
  const loadLevel = async (levelId: string) => {
    if (!levelId) return;
    if (!user) {
      openAuthModal('signin');
      return;
    }

    setLoadingLevel(true);
    setAccessDeniedError(null);
    setQuizResult(null);
    setExecutionResult(null);
    setCompilerError(null);

    try {
      const data = await apiRequest<{ level: Level; questions: Question[] }>(`/api/levels/${levelId}`);
      setCurrentLevel(data.level);
      setQuestions(data.questions || []);
      setCode(data.level.starter_code || '');
      setSelectedAnswers({});
    } catch (err: any) {
      if (err.status === 403) {
        setAccessDeniedError(err.message || 'This level is locked. Complete previous levels first.');
      } else {
        setAccessDeniedError(err.message || 'Failed to load level details');
      }
      setCurrentLevel(null);
    } finally {
      setLoadingLevel(false);
    }
  };

  useEffect(() => {
    if (activeLevelId) {
      loadLevel(activeLevelId);
    }
  }, [activeLevelId]);

  // Handle Code Execution via Judge0 Proxy
  const handleRunCode = async () => {
    if (!currentLevel && !course) return;
    setRunningCode(true);
    setCompilerError(null);
    setExecutionResult(null);

    const language = currentLevel?.courses?.programming_language || course?.programming_language || 'python';

    try {
      const result = await apiRequest('/api/compiler/execute', {
        method: 'POST',
        body: JSON.stringify({
          language,
          source_code: code,
          stdin,
          level_id: currentLevel?.id,
        }),
      });
      setExecutionResult(result);
    } catch (err: any) {
      setCompilerError(err.message || 'Execution failed');
    } finally {
      setRunningCode(false);
    }
  };

  // Handle Quiz Submission
  const handleSubmitQuiz = async () => {
    if (!currentLevel || questions.length === 0) return;

    // Check if at least one question answered
    const answersPayload = Object.entries(selectedAnswers).map(([qId, ans]) => ({
      question_id: qId,
      answer: ans,
    }));

    if (answersPayload.length === 0) {
      alert('Please answer at least one question before submitting.');
      return;
    }

    setSubmittingQuiz(true);
    try {
      const result = await apiRequest<QuizSubmissionResult>(`/api/levels/${currentLevel.id}/quiz-attempts`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answersPayload,
        }),
      });

      setQuizResult(result);
      // Refresh user stats and level status list
      refreshProfile();
      loadCourse();
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Handle Certificate Claim
  const handleClaimCertificate = async () => {
    setIssuingCert(true);
    try {
      await apiRequest('/api/certificates/issue', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId }),
      });
      setCertIssuedSuccess(true);
      refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to issue certificate');
    } finally {
      setIssuingCert(false);
    }
  };

  const allLevelsCompleted = levels.length > 0 && levels.every(l => l.status === 'completed');

  if (loadingCourse) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-[#a78bfa]" />
          <p className="text-xs text-[#a1a1aa] font-mono">Loading precision engine workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-[#09090b]">
      {/* Top Header / Breadcrumb Rail */}
      <div className="flex h-12 items-center justify-between border-b border-[#27272a] bg-[#111114] px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCourses}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[#a1a1aa] hover:bg-[#18181b] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tracks</span>
          </button>

          <span className="text-[#3f3f46]">/</span>

          <h2 className="text-xs sm:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
            {course?.title}
          </h2>
        </div>

        {/* Level Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {levels.map((lvl) => {
            const isCurrent = lvl.id === activeLevelId;
            const isCompleted = lvl.status === 'completed';
            const isLocked = lvl.status === 'locked';

            return (
              <button
                key={lvl.id}
                onClick={() => {
                  setActiveLevelId(lvl.id);
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono transition-all ${
                  isCurrent
                    ? 'bg-[#6d28d9] text-white font-medium shadow-sm'
                    : isCompleted
                    ? 'bg-[#18181b] text-emerald-400 border border-emerald-500/20 hover:bg-[#27272a]'
                    : isLocked
                    ? 'bg-[#111114] text-[#71717a] border border-[#27272a] opacity-70 hover:opacity-100'
                    : 'bg-[#18181b] text-[#ccc3d7] border border-[#27272a] hover:text-white'
                }`}
                title={lvl.title}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : isLocked ? (
                  <Lock className="h-3 w-3 text-[#71717a]" />
                ) : (
                  <Unlock className="h-3 w-3 text-[#a78bfa]" />
                )}
                <span>Lvl {lvl.level_number}</span>
              </button>
            );
          })}
        </div>

        {/* Claim Certificate Button if completed */}
        <div>
          {allLevelsCompleted && (
            <button
              onClick={handleClaimCertificate}
              disabled={issuingCert || certIssuedSuccess}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              <Award className="h-3.5 w-3.5" />
              {certIssuedSuccess ? 'Certificate Claimed!' : 'Claim Certificate'}
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      {accessDeniedError ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-[#18181b] p-8 shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Sequential Access Locked</h3>
            <p className="mt-2 text-xs text-[#a1a1aa] leading-relaxed">
              {accessDeniedError}
            </p>
            <p className="mt-3 text-[11px] text-[#71717a]">
              CodeEase enforces strict sequential mastery. You must submit and pass earlier level quizzes before unlocking advanced modules.
            </p>
            <button
              onClick={() => {
                const unlocked = levels.find(l => l.status === 'unlocked' || l.status === 'in_progress');
                if (unlocked) setActiveLevelId(unlocked.id);
              }}
              className="mt-5 rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors"
            >
              Go to Current Active Level
            </button>
          </div>
        </div>
      ) : loadingLevel ? (
        <div className="flex flex-1 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-[#a78bfa]" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Navigation Tab buttons for Mobile/Compact screens */}
          <div className="flex lg:hidden border-b border-[#27272a] bg-[#111114] px-4 py-2 gap-2 text-xs">
            <button
              onClick={() => setActiveTab('lesson')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                activeTab === 'lesson' ? 'bg-[#6d28d9] text-white' : 'text-[#a1a1aa] bg-[#18181b]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Lesson Notes
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                activeTab === 'editor' ? 'bg-[#6d28d9] text-white' : 'text-[#a1a1aa] bg-[#18181b]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Sandbox
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                activeTab === 'quiz' ? 'bg-[#6d28d9] text-white' : 'text-[#a1a1aa] bg-[#18181b]'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Quiz ({questions.length})
            </button>
          </div>

          {/* Left Panel: Lesson Notes (Desktop visible or mobile tab active) */}
          <div
            className={`w-full lg:w-1/3 flex-col border-r border-[#27272a] bg-[#111114] overflow-y-auto ${
              activeTab === 'lesson' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="border-b border-[#27272a] px-5 py-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-white">
                <BookOpen className="h-4 w-4 text-[#a78bfa]" />
                Level {currentLevel?.level_number}: {currentLevel?.title}
              </span>
              <span className="rounded px-2 py-0.5 text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300">
                Passing: {currentLevel?.passing_score}%
              </span>
            </div>

            <div className="p-5 text-xs text-[#e4e1e6] space-y-4 leading-relaxed whitespace-pre-line">
              {currentLevel?.lesson_content}
            </div>
          </div>

          {/* Center Panel: Code Sandbox & Execution Output */}
          <div
            className={`w-full lg:w-1/3 flex-col border-r border-[#27272a] bg-[#09090b] ${
              activeTab === 'editor' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Editor Toolbar */}
            <div className="flex h-10 items-center justify-between border-b border-[#27272a] bg-[#18181b] px-4">
              <div className="flex items-center gap-2 text-xs font-mono text-[#a1a1aa]">
                <Terminal className="h-3.5 w-3.5 text-[#a78bfa]" />
                <span>sandbox.{course?.programming_language === 'python' ? 'py' : course?.programming_language === 'c' ? 'c' : 'js'}</span>
              </div>

              <button
                onClick={handleRunCode}
                disabled={runningCode}
                className="flex items-center gap-1.5 rounded bg-[#6d28d9] px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-[#8b5cf6] transition-colors disabled:opacity-50"
              >
                {runningCode ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    Run Code
                  </>
                )}
              </button>
            </div>

            {/* Code Input Area */}
            <div className="flex-1 p-3">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Write code here..."
                spellCheck={false}
                className="h-full w-full resize-none rounded-lg border border-[#27272a] bg-[#111114] p-3 font-mono text-xs text-[#fafafa] focus:border-[#a78bfa] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Terminal Console Output */}
            <div className="h-44 border-t border-[#27272a] bg-[#111114] flex flex-col">
              <div className="flex h-8 items-center justify-between border-b border-[#27272a] px-3 text-[11px] font-mono text-[#71717a]">
                <span>TERMINAL OUTPUT</span>
                {executionResult && (
                  <div className="flex items-center gap-3 text-[10px]">
                    {executionResult.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {executionResult.time}s
                      </span>
                    )}
                    {executionResult.memory && (
                      <span className="flex items-center gap-1">
                        <Cpu className="h-2.5 w-2.5" />
                        {executionResult.memory} KB
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                {compilerError && (
                  <div className="text-amber-400 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Compiler Status Notice:
                    </p>
                    <p className="text-[11px] text-[#a1a1aa]">{compilerError}</p>
                  </div>
                )}

                {executionResult ? (
                  <div className="space-y-1.5">
                    {executionResult.stdout && (
                      <pre className="text-emerald-400 whitespace-pre-wrap">{executionResult.stdout}</pre>
                    )}
                    {executionResult.stderr && (
                      <pre className="text-red-400 whitespace-pre-wrap">{executionResult.stderr}</pre>
                    )}
                    {executionResult.compile_output && (
                      <pre className="text-amber-400 whitespace-pre-wrap">{executionResult.compile_output}</pre>
                    )}
                    {!executionResult.stdout && !executionResult.stderr && !executionResult.compile_output && (
                      <p className="text-zinc-500 italic">Program executed with no output.</p>
                    )}
                  </div>
                ) : !compilerError && (
                  <p className="text-[#71717a] italic">Click "Run Code" to compile and execute in the sandbox.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Level Quiz */}
          <div
            className={`w-full lg:w-1/3 flex-col bg-[#111114] overflow-y-auto ${
              activeTab === 'quiz' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="border-b border-[#27272a] px-5 py-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-white">
                <HelpCircle className="h-4 w-4 text-[#a78bfa]" />
                Level Assessment ({questions.length} Questions)
              </span>
              <span className="text-[11px] text-[#a1a1aa]">
                Target: {currentLevel?.passing_score}%
              </span>
            </div>

            <div className="flex-1 p-5 space-y-6">
              {/* Quiz Submission Result Banner */}
              {quizResult && (
                <div
                  className={`rounded-xl border p-4 ${
                    quizResult.passed
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {quizResult.passed ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          Level Passed! ({quizResult.score}%)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                          Attempt Incomplete ({quizResult.score}%)
                        </>
                      )}
                    </span>
                    {quizResult.xp_awarded > 0 && (
                      <span className="flex items-center gap-1 rounded bg-[#6d28d9] px-2.5 py-0.5 text-xs font-mono font-medium text-white shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        +{quizResult.xp_awarded} XP
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-[#e4e1e6]">
                    {quizResult.passed
                      ? 'Great job! You met the passing criteria. The next level has been unlocked.'
                      : `Passing score is ${quizResult.passing_score}%. Review the explanations below and try again!`}
                  </p>

                  {quizResult.passed && quizResult.next_level_id && (
                    <button
                      onClick={() => setActiveLevelId(quizResult.next_level_id!)}
                      className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                    >
                      Continue to Next Level
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Questions List */}
              {questions.map((q, idx) => {
                const gradedItem = quizResult?.results?.find(r => r.question_id === q.id);

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[#27272a] bg-[#18181b] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white">
                        <span className="font-mono text-[#a78bfa] mr-1.5">Q{idx + 1}.</span>
                        {q.question_text}
                      </p>
                      <span className="shrink-0 text-[10px] font-mono text-[#71717a]">
                        {q.points} pts
                      </span>
                    </div>

                    {/* Radio Options */}
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[q.id] === opt;
                        return (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-[#a78bfa] bg-[#6d28d9]/10 text-white'
                                : 'border-[#27272a] bg-[#111114] text-[#ccc3d7] hover:border-[#3f3f46]'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              value={opt}
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAnswers(prev => ({ ...prev, [q.id]: opt }));
                              }}
                              className="h-3.5 w-3.5 accent-[#6d28d9]"
                            />
                            <span className="font-mono text-[11px]">{opt}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Graded Explanation Feedback */}
                    {gradedItem && (
                      <div
                        className={`rounded-lg p-2.5 text-[11px] space-y-1 ${
                          gradedItem.is_correct
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-300 border border-red-500/20'
                        }`}
                      >
                        <p className="font-semibold">
                          {gradedItem.is_correct ? '✓ Correct!' : '✗ Incorrect'}
                        </p>
                        {gradedItem.explanation && (
                          <p className="text-[#a1a1aa]">{gradedItem.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Submit Quiz Action */}
              <button
                onClick={handleSubmitQuiz}
                disabled={submittingQuiz || questions.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#6d28d9] py-2.5 px-4 text-xs font-medium text-white shadow-lg shadow-[#6d28d9]/25 hover:bg-[#8b5cf6] transition-all disabled:opacity-50"
              >
                {submittingQuiz ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Grading on Server...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Submit Quiz for Grading
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
