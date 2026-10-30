import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Award,
  ShieldCheck,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  Code2,
  Sparkles,
  QrCode,
  X,
} from 'lucide-react';

interface Certificate {
  id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  final_score: number;
  verification_status: 'valid' | 'revoked';
  course_title?: string;
  programming_language?: string;
  learner_name?: string;
}

export const CertificatesView: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCert, setActiveCert] = useState<Certificate | null>(null);

  // Verification state
  const [searchNumber, setSearchNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const fetchMyCertificates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ certificates: Certificate[] }>('/api/certificates');
      setCertificates(data.certificates || []);
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyCertificates();
    }
  }, [user]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNumber.trim()) return;

    setVerifying(true);
    setVerificationResult(null);
    setVerificationError(null);

    try {
      const res = await apiRequest(`/api/certificates/verify/${encodeURIComponent(searchNumber.trim())}`);
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationError(err.message || 'Certificate verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-[#a78bfa]" />
          <h1 className="text-xl font-bold text-white">Certificates & Verification Registry</h1>
        </div>
        <p className="mt-1 text-xs text-[#a1a1aa]">
          Earned exclusively through verified completion of all track modules and passing quizzes. Every certificate is cryptographically recorded and publicly verifiable.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: My Earned Certificates */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-[#a78bfa]" />
              My Earned Certificates
            </h2>
            <span className="text-xs font-mono text-[#71717a]">
              {certificates.length} Issued
            </span>
          </div>

          {!user ? (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-8 text-center">
              <Award className="mx-auto h-8 w-8 text-[#71717a] mb-2" />
              <p className="text-xs font-semibold text-white">Sign in to view your certificates</p>
              <p className="mt-1 text-xs text-[#a1a1aa]">
                Complete all levels in any track to unlock your verifiable certificate.
              </p>
              <button
                onClick={() => openAuthModal('signin')}
                className="mt-4 rounded-lg bg-[#6d28d9] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#8b5cf6]"
              >
                Sign In
              </button>
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-8 text-center text-xs text-[#71717a]">
              Loading certificates...
            </div>
          ) : certificates.length > 0 ? (
            <div className="space-y-3">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:border-[#a78bfa]/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#d3bbff]">
                        {cert.certificate_number}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="h-3 w-3" />
                        Valid & Verified
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white">
                      {cert.course_title}
                    </h3>

                    <div className="flex items-center gap-4 text-[11px] text-[#a1a1aa] font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </span>
                      <span>Score: {cert.final_score}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveCert(cert)}
                      className="rounded-lg bg-[#6d28d9] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#8b5cf6] transition-colors"
                    >
                      View & Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-8 text-center">
              <Award className="mx-auto h-8 w-8 text-[#71717a] mb-2" />
              <p className="text-xs font-semibold text-white">No certificates issued yet</p>
              <p className="mt-1 text-xs text-[#a1a1aa] max-w-sm mx-auto">
                Finish all levels in Python, JavaScript, or C to earn your official verifiable credential.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Public Certificate Verifier */}
        <div className="space-y-4">
          <div className="border-b border-[#27272a] pb-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#a78bfa]" />
              Public Verification Portal
            </h2>
          </div>

          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 space-y-4">
            <p className="text-xs text-[#a1a1aa]">
              Verify the authenticity of any CodeEase credential by entering its unique certificate ID:
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  placeholder="e.g. CE-PYT-2026-X8K9M2"
                  className="w-full rounded-lg border border-[#27272a] bg-[#111114] px-3 py-2 text-xs font-mono text-white placeholder-[#71717a] focus:border-[#a78bfa] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#6d28d9] py-2 px-3 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                {verifying ? 'Checking Registry...' : 'Verify Credential'}
              </button>
            </form>

            {/* Verification Result Display */}
            {verificationResult && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Officially Verified Credential</span>
                </div>

                <div className="space-y-1 font-mono text-[11px] text-[#e4e1e6] border-t border-emerald-500/20 pt-2">
                  <p><span className="text-[#a1a1aa]">Learner:</span> {verificationResult.learner_name}</p>
                  <p><span className="text-[#a1a1aa]">Course:</span> {verificationResult.course_title}</p>
                  <p><span className="text-[#a1a1aa]">Final Score:</span> {verificationResult.final_score}%</p>
                  <p><span className="text-[#a1a1aa]">Issued:</span> {new Date(verificationResult.issued_at).toLocaleDateString()}</p>
                  <p><span className="text-[#a1a1aa]">Cert ID:</span> {verificationResult.certificate_number}</p>
                </div>
              </div>
            )}

            {verificationError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2 text-xs text-red-300">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Viewer Modal (Printable/Downloadable) */}
      {activeCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#27272a] bg-[#111114] p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setActiveCert(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#71717a] hover:bg-[#18181b] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Printable Certificate Frame */}
            <div
              id="printable-certificate"
              className="relative overflow-hidden rounded-xl border-2 border-[#6d28d9] bg-gradient-to-b from-[#18181b] via-[#111114] to-[#18181b] p-8 text-center space-y-6"
            >
              {/* Corner Watermarks */}
              <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-[#6d28d9] text-white">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <span className="font-semibold text-white text-sm">CodeEase Precision</span>
                </div>
                <span className="font-mono text-xs text-[#a78bfa] border border-[#6d28d9]/40 bg-[#6d28d9]/10 px-2 py-0.5 rounded">
                  {activeCert.certificate_number}
                </span>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-[#a1a1aa] font-mono">
                  Certificate of Technical Mastery
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {activeCert.learner_name || user?.user_metadata?.full_name || 'Verified Engineer'}
                </h2>
                <p className="mt-1 text-xs text-[#ccc3d7]">
                  has successfully completed all required levels, quizzes, and code assessments for
                </p>
                <p className="mt-2 text-base font-semibold text-[#d3bbff]">
                  {activeCert.course_title}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-b border-[#27272a] py-3 text-xs font-mono">
                <div>
                  <p className="text-[10px] text-[#71717a]">ACHIEVEMENT SCORE</p>
                  <p className="font-bold text-emerald-400">{activeCert.final_score}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a]">DATE ISSUED</p>
                  <p className="text-white">{new Date(activeCert.issued_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#71717a]">STATUS</p>
                  <p className="text-emerald-400 uppercase font-semibold">VERIFIED</p>
                </div>
              </div>

              {/* QR Code representation */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="h-16 w-16 rounded border border-[#27272a] bg-white p-1 flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-black" />
                </div>
                <div className="text-left text-[10px] font-mono text-[#71717a]">
                  <p className="text-white font-medium">Verify online:</p>
                  <p>{window.location.origin}/#verify/{activeCert.certificate_number}</p>
                  <p className="text-emerald-400 mt-0.5">Cryptographically signed</p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handlePrintCertificate}
                className="flex items-center gap-2 rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-medium text-white hover:bg-[#8b5cf6] transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
