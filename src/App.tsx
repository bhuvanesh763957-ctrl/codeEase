/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { SystemConfigBanner } from './components/SystemConfigBanner.tsx';
import { CourseCatalog } from './components/CourseCatalog.tsx';
import { LevelWorkspace } from './components/LevelWorkspace.tsx';
import { CodePlayground } from './components/CodePlayground.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { CertificatesView } from './components/CertificatesView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { DatabaseSetupModal } from './components/DatabaseSetupModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('courses');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Modals state
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentTab('level');
  };

  const handleBackToCourses = () => {
    setCurrentTab('courses');
    setSelectedCourseId(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-[#6d28d9] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'level') setSelectedCourseId(null);
        }}
        onOpenSetupModal={() => setSetupModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />

      {/* System Configuration Warning / Setup Banner */}
      <SystemConfigBanner onOpenSetupModal={() => setSetupModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'courses' && (
          <CourseCatalog
            onSelectCourse={handleSelectCourse}
            onOpenSetupModal={() => setSetupModalOpen(true)}
          />
        )}

        {currentTab === 'level' && selectedCourseId && (
          <LevelWorkspace
            courseId={selectedCourseId}
            onBackToCourses={handleBackToCourses}
            onViewCertificates={() => setCurrentTab('certificates')}
          />
        )}

        {currentTab === 'playground' && <CodePlayground />}

        {currentTab === 'leaderboard' && <LeaderboardView />}

        {currentTab === 'certificates' && <CertificatesView />}
      </main>

      {/* Footer */}
      {currentTab !== 'level' && (
        <footer className="border-t border-[#27272a] bg-[#111114] py-8 text-xs text-[#71717a]">
          <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">CodeEase Precision Engine</span>
              <span>— Learn to Code. Play. Level Up. Get Certified.</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span>Supabase PostgreSQL + RLS</span>
              <span>•</span>
              <span>Judge0 CE Sandbox</span>
              <span>•</span>
              <span>Verifiable Certificates</span>
            </div>
          </div>
        </footer>
      )}

      {/* Global Modals */}
      <AuthModal />
      <DatabaseSetupModal isOpen={setupModalOpen} onClose={() => setSetupModalOpen(false)} />
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
