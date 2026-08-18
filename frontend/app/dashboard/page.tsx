'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, fetchSenders, fetchScheduledEmails, fetchSentEmails } from '../../lib/api';
import { EmailJob } from '../../lib/types';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import EmailList from '../../components/EmailList';
import EmailDetail from '../../components/EmailDetail';
import ComposeModal from '../../components/ComposeModal';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // TanStack Query for User Profile with auto-redirect to /login on 401 Unauthorized
  const { data: user, isError: isUserError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (isUserError) {
      window.location.href = '/login';
    }
  }, [isUserError]);

  // TanStack Query for Sender Identities
  const { data: senders = [] } = useQuery({
    queryKey: ['senders'],
    queryFn: fetchSenders,
  });

  // TanStack Query for Scheduled Emails (polling every 5s)
  const { data: scheduledData, isLoading: isScheduledLoading } = useQuery({
    queryKey: ['scheduledEmails'],
    queryFn: () => fetchScheduledEmails(),
    refetchInterval: 5000,
  });

  // TanStack Query for Sent Emails (polling every 5s)
  const { data: sentData, isLoading: isSentLoading } = useQuery({
    queryKey: ['sentEmails'],
    queryFn: () => fetchSentEmails(),
    refetchInterval: 5000,
  });

  const scheduledEmails = scheduledData?.items || [];
  const sentEmails = sentData?.items || [];

  const activeEmails = activeTab === 'scheduled' ? scheduledEmails : sentEmails;
  const isLoading = activeTab === 'scheduled' ? isScheduledLoading : isSentLoading;

  const handleComposeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduledEmails'] });
    queryClient.invalidateQueries({ queryKey: ['sentEmails'] });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar user={user} />

      {/* Main 3-Pane Dashboard Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedEmail(null);
          }}
          scheduledCount={scheduledData?.total || 0}
          sentCount={sentData?.total || 0}
          onOpenCompose={() => setIsComposeOpen(true)}
        />

        {/* Middle Row List */}
        <EmailList
          activeTab={activeTab}
          emails={activeEmails}
          selectedEmailId={selectedEmail?.id}
          onSelectEmail={(email) => setSelectedEmail(email)}
          isLoading={isLoading}
        />

        {/* Right Reading Pane */}
        <EmailDetail email={selectedEmail} onClose={() => setSelectedEmail(null)} />
      </div>

      {/* Compose Slide-in Overlay Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onSuccess={handleComposeSuccess}
      />
    </div>
  );
}
