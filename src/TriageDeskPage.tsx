import React, { useState, useEffect, useMemo } from 'react';
import './styles/triage-desk-app.css';
import { DEMO_SEED_ISSUES, DEMO_LOCAL_STORAGE_KEY } from './lib/demoSeed';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────
export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface AcceptanceCriterion {
  id: string;
  text: string;
  done: boolean;
}

export interface MediaAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'link';
  url: string; // Base64 data URL, blob URL, or external media link
  thumbnail_url?: string;
  size_bytes?: number;
  duration_sec?: number;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface CommentItem {
  id: string;
  author: string;
  author_email?: string;
  text: string;
  timestamp: string;
  is_system?: boolean;
  attachments?: MediaAttachment[];
}

export interface IssueLink {
  id: string;
  url: string;
  label: string;
}

export interface TriageIssue {
  id: string;
  sequence_id?: number;
  name: string;
  description_html?: string;
  description_text?: string;
  priority: PriorityLevel;
  state: 'OPEN' | 'IN_PROGRESS' | 'ARCHIVED';
  affected_platforms: string[];
  blocker_active: boolean;
  blocker_text: string;
  blocker_resolved_text: string;
  acceptance_criteria: AcceptanceCriterion[];
  steps_to_reproduce: string[];
  remediation?: string;
  links?: IssueLink[];
  attachments?: MediaAttachment[];
  creator_name: string;
  creator_email: string;
  watchers: string[];
  comments: CommentItem[];
  created_at: string;
  updated_at: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'alert';
  title: string;
  description?: string;
}

const AVAILABLE_PLATFORMS = [
  'Web',
  'Mobile Web',
  'API Gateway',
  'iOS Safari',
  'Android Chrome',
  'Backend Workers',
  'Billing / Webhooks',
  'WebRTC',
];

const SEVERITY_CONFIG: Record<
  PriorityLevel,
  { label: string; code: string; color: string; bg: string }
> = {
  urgent: { label: 'P0 Blocker', code: 'P0', color: '#ff2d6b', bg: 'rgba(255, 45, 107, 0.12)' },
  high: { label: 'P1 High', code: 'P1', color: '#f5c778', bg: 'rgba(245, 199, 120, 0.12)' },
  medium: { label: 'P2 Major', code: 'P2', color: '#5ef0f0', bg: 'rgba(94, 240, 240, 0.12)' },
  low: { label: 'P3 Medium', code: 'P3', color: '#00ff9d', bg: 'rgba(0, 255, 157, 0.12)' },
  none: { label: 'P4 Minor', code: 'P4', color: '#9eadab', bg: 'rgba(158, 173, 171, 0.12)' },
};

// Helper: Parse Loom, YouTube, and direct video URLs
export function parseVideoEmbed(url?: string): { type: 'loom' | 'youtube' | 'direct' | 'none'; embedUrl?: string } {
  if (!url) return { type: 'none' };
  const trimmed = url.trim();
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/);
  if (loomMatch && loomMatch[1]) {
    return { type: 'loom', embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` };
  }
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch && ytMatch[1]) {
    return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}` };
  }
  if (trimmed.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i) || trimmed.startsWith('data:video/')) {
    return { type: 'direct', embedUrl: trimmed };
  }
  return { type: 'none' };
}

// ─── INITIAL SEED TICKET (SP-101) — ZERO WATCHERS BY DEFAULT ─────────────
const INITIAL_SEED_ISSUES: TriageIssue[] = [
  {
    id: 'SP-101',
    sequence_id: 101,
    name: 'Intermittent Media Unlock Timeout Under Peak Concurrency',
    description_text:
      'High-latency WebSocket handshake during peak traffic causes creator media unlock state to stall before payment receipt acknowledgement.',
    priority: 'urgent',
    state: 'OPEN',
    affected_platforms: ['Web', 'Mobile Web', 'API Gateway', 'iOS Safari'],
    blocker_active: false,
    blocker_text: '',
    blocker_resolved_text: '',
    acceptance_criteria: [
      {
        id: 'ac-1',
        text: 'Deterministic idempotent transaction tokens attached to unlock payload.',
        done: true,
      },
      {
        id: 'ac-2',
        text: 'Client-side optimistic unlock state verified with automated rollback on failed webhook.',
        done: false,
      },
      {
        id: 'ac-3',
        text: 'Synthetic Playwright test simulates 100 concurrent unlocks with zero stalled UI states.',
        done: false,
      },
    ],
    steps_to_reproduce: [
      'Initiate concurrent unlock requests (50+ simultaneous fan users) on paywalled video vault.',
      "Observe client state stalls on 'Processing Unlock' while billing webhook resolves asynchronously.",
      'User refreshes page, triggering duplicate transaction prompt.',
    ],
    remediation:
      'Added Redis-backed mutex locks on unlock transactions and deployed automated K6 load test gate in CI/CD pipeline to reject merges that breach 120ms latency ceiling.',
    links: [
      {
        id: 'link-1',
        url: 'https://buildghost.site',
        label: 'BuildGhost Live Portal',
      },
    ],
    creator_name: 'DevOps Engineer',
    creator_email: 'devops@buildghost.site',
    watchers: [], // Zero watchers by default
    comments: [
      {
        id: 'sys-0',
        author: 'BuildGhost System // Triage-Desk',
        text: 'Issue SP-101 registered into triage stream. Initial severity classified as P0 Blocker.',
        timestamp: '2026-09-06T06:01:00Z',
        is_system: true,
      },
      {
        id: 'sys-1',
        author: 'BuildGhost System // Triage-Desk',
        text: 'Automated telemetry linked mutex trace artifacts to session worker pool.',
        timestamp: '2026-09-06T06:05:00Z',
        is_system: true,
      },
      {
        id: 'c-1',
        author: 'Systems Lead',
        author_email: 'lead@buildghost.site',
        text: 'Identified root cause: race condition in WebSocket handshake ACK on edge workers. Mutex fence patched in staging.',
        timestamp: '2026-09-06T06:14:00Z',
      },
    ],
    created_at: '2026-09-06T06:00:00Z',
    updated_at: '2026-09-06T06:14:00Z',
  },
];

const LOCAL_STORAGE_KEY = 'bg_triage_desk_issues_v6';
const IDENTITY_STORAGE_KEY = 'buildghost_identity';
const ACCESS_STORAGE_KEY = 'bg_triage_desk_unlocked';
const ADMIN_EMAIL = 'buildghost.dev@gmail.com';

export interface UserIdentity {
  name: string;
  email: string;
}

export interface TriageDeskPageProps {
  isDemoMode?: boolean;
}

export function TriageDeskPage({ isDemoMode: propIsDemoMode }: TriageDeskPageProps = {}) {
  const isPathDemo =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/triage-desk/demo') ||
      window.location.pathname.startsWith('/triage/demo') ||
      window.location.pathname === '/demo' ||
      window.location.pathname.startsWith('/demo/'));
  const isDemoMode = Boolean(propIsDemoMode || isPathDemo);

  const activeStorageKey = isDemoMode ? DEMO_LOCAL_STORAGE_KEY : LOCAL_STORAGE_KEY;

  // Universal Passcode Authentication Gate (Bypassed in Demo Mode)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (isDemoMode) return true;
    try {
      return localStorage.getItem(ACCESS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState<boolean>(false);

  // Admin Passcode Management State
  const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);
  const [currentPassInput, setCurrentPassInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [passChangeError, setPassChangeError] = useState<string>('');
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState<boolean>(false);
  const [isEmailSafeMode, setIsEmailSafeMode] = useState<boolean>(true);

  // Fullscreen Demo Intro Video Overlay (Plays once on demo hit, then fades away)
  const [showIntroOverlay, setShowIntroOverlay] = useState<boolean>(() => isDemoMode);
  const [isIntroFading, setIsIntroFading] = useState<boolean>(false);

  const handleDismissIntro = () => {
    if (isIntroFading) return;
    setIsIntroFading(true);
    setTimeout(() => {
      setShowIntroOverlay(false);
    }, 800);
  };

  // Sync Email Mode status (Skip in Demo Mode)
  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/plane/email-mode')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.safeMode === 'boolean') {
          setIsEmailSafeMode(data.safeMode);
        }
      })
      .catch(() => {});
  }, [isDemoMode]);

  // State: Issues Collection
  const [issues, setIssues] = useState<TriageIssue[]>(() => {
    try {
      const saved = localStorage.getItem(activeStorageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isDemoMode) {
            return parsed.map((iss) => {
              if (iss.id === 'DEMO-101' && (!iss.attachments || iss.attachments.length < 2)) {
                return {
                  ...iss,
                  attachments: DEMO_SEED_ISSUES[0]?.attachments || [],
                };
              }
              return iss;
            });
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return isDemoMode ? DEMO_SEED_ISSUES : INITIAL_SEED_ISSUES;
  });

  // Contributor Identity (Stored in localStorage)
  const [identity, setIdentity] = useState<UserIdentity | null>(() => {
    try {
      const saved = localStorage.getItem(IDENTITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.name === 'string' &&
          typeof parsed.email === 'string' &&
          parsed.name.trim() &&
          parsed.email.trim()
        ) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Admin Verification (buildghost.dev@gmail.com)
  const isAdmin = useMemo(() => {
    return (identity?.email || '').toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
  }, [identity]);

  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Identity Modal & Action Interception State
  const [showIdentityModal, setShowIdentityModal] = useState<boolean>(false);
  const [identityNameInput, setIdentityNameInput] = useState<string>('');
  const [identityEmailInput, setIdentityEmailInput] = useState<string>('');
  const [identityError, setIdentityError] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<((id: UserIdentity) => void) | null>(null);

  const requireIdentity = (actionCallback: (currentIdentity: UserIdentity) => void) => {
    if (identity && identity.name.trim() && identity.email.trim()) {
      actionCallback(identity);
      return;
    }

    setPendingAction(() => actionCallback);
    setIdentityNameInput('');
    setIdentityEmailInput('');
    setIdentityError('');
    setShowIdentityModal(true);
  };

  const handleOpenChangeIdentity = () => {
    setIdentityNameInput(identity?.name || '');
    setIdentityEmailInput(identity?.email || '');
    setIdentityError('');
    setPendingAction(null);
    setShowIdentityModal(true);
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = identityNameInput.trim();
    const trimmedEmail = identityEmailInput.trim();

    if (!trimmedName) {
      setIdentityError('Please enter a display name or username.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setIdentityError('Please enter a valid email address.');
      return;
    }

    const newId: UserIdentity = { name: trimmedName, email: trimmedEmail };
    try {
      localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(newId));
    } catch (err) {
      console.warn('LocalStorage identity error:', err);
    }
    setIdentity(newId);
    setShowIdentityModal(false);
    setIdentityError('');
    triggerToast('success', 'Identity Established', `Logged in as ${trimmedName} (${trimmedEmail})`);

    if (pendingAction) {
      const fn = pendingAction;
      setPendingAction(null);
      setTimeout(() => {
        fn(newId);
      }, 50);
    }
  };

  // Selected Issue ID or Mode
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(() => {
    return isDemoMode ? 'DEMO-101' : 'SP-101';
  });
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // UI Drawer / Guides
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);

  // New Comment State
  const [commentInput, setCommentInput] = useState<string>('');
  const [expandedSystemStacks, setExpandedSystemStacks] = useState<Record<string, boolean>>({});

  const toggleSystemStack = (stackId: string) => {
    setExpandedSystemStacks((prev) => ({
      ...prev,
      [stackId]: !prev[stackId],
    }));
  };

  // Blocker edit state
  const [blockerInput, setBlockerInput] = useState<string>('');
  const [blockerResolvedInput, setBlockerResolvedInput] = useState<string>('');
  const [isEditingBlocker, setIsEditingBlocker] = useState<boolean>(false);

  // Watcher input state
  const [newWatcherInput, setNewWatcherInput] = useState<string>('');

  // ─── IN-PLACE EDITING STATES ─────────────────────────────────────────────
  // Title inline edit
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleEditInput, setTitleEditInput] = useState<string>('');

  // Summary inline edit
  const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);
  const [summaryEditInput, setSummaryEditInput] = useState<string>('');

  // Steps inline edit & add
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [stepEditInput, setStepEditInput] = useState<string>('');
  const [isAddingStep, setIsAddingStep] = useState<boolean>(false);
  const [newStepInput, setNewStepInput] = useState<string>('');

  // AC inline edit & add
  const [editingAcId, setEditingAcId] = useState<string | null>(null);
  const [acEditInput, setAcEditInput] = useState<string>('');
  const [isAddingAc, setIsAddingAc] = useState<boolean>(false);
  const [newAcInput, setNewAcInput] = useState<string>('');

  // Detail Links add
  const [isAddingDetailLink, setIsAddingDetailLink] = useState<boolean>(false);
  const [newDetailLinkUrl, setNewDetailLinkUrl] = useState<string>('');
  const [newDetailLinkLabel, setNewDetailLinkLabel] = useState<string>('');

  // Severity in-place dropdown
  const [isSeverityDropdownOpen, setIsSeverityDropdownOpen] = useState<boolean>(false);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Connectivity status
  const [planeSyncStatus, setPlaneSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'offline'>('idle');

  // New Ticket Form State (Default empty watchers)
  const [formTitle, setFormTitle] = useState('');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('urgent');
  const [formPlatforms, setFormPlatforms] = useState<string[]>(['Web']);
  const [formSummary, setFormSummary] = useState('');
  const [formSteps, setFormSteps] = useState<string[]>(['']);
  const [formAC, setFormAC] = useState<string[]>(['']);
  const [formRemediation, setFormRemediation] = useState('');
  const [formWatchers, setFormWatchers] = useState<string>('');
  const [formLinks, setFormLinks] = useState<Array<{ url: string; label: string }>>([]);
  const [isAddingFormLink, setIsAddingFormLink] = useState<boolean>(false);
  const [formLinkUrl, setFormLinkUrl] = useState<string>('');
  const [formLinkLabel, setFormLinkLabel] = useState<string>('');

  // Media & Evidence State
  const [lightboxMedia, setLightboxMedia] = useState<MediaAttachment | null>(null);
  const [formAttachments, setFormAttachments] = useState<MediaAttachment[]>([]);
  const [isAddingFormMediaUrl, setIsAddingFormMediaUrl] = useState<boolean>(false);
  const [formMediaUrl, setFormMediaUrl] = useState<string>('');
  const [formMediaLabel, setFormMediaLabel] = useState<string>('');

  // Detail Media State
  const [isAddingDetailMedia, setIsAddingDetailMedia] = useState<boolean>(false);
  const [newDetailMediaUrl, setNewDetailMediaUrl] = useState<string>('');
  const [newDetailMediaLabel, setNewDetailMediaLabel] = useState<string>('');

  // Comment Attachments State
  const [commentAttachments, setCommentAttachments] = useState<MediaAttachment[]>([]);

  // Save issues to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(activeStorageKey, JSON.stringify(issues));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [issues, activeStorageKey]);

  // Toast Helper
  const triggerToast = (type: ToastMessage['type'], title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { id, type, title, description };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Helper: Create System Auto-Comment
  const createSystemComment = (text: string): CommentItem => ({
    id: `c-sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: isDemoMode ? 'BuildGhost System // Demo-Desk' : 'BuildGhost System // Triage-Desk',
    author_email: 'noreply@buildghost.site',
    text,
    timestamp: new Date().toISOString(),
    is_system: true,
  });

  // Helper: Group sequential system events for collapsible card stacking
  const groupCommentsForFeed = (commentList: CommentItem[] = []) => {
    type FeedItem =
      | { type: 'single'; comment: CommentItem }
      | { type: 'system_stack'; id: string; comments: CommentItem[] };

    const feed: FeedItem[] = [];
    let currentSystemStack: CommentItem[] = [];

    for (let i = 0; i < commentList.length; i++) {
      const c = commentList[i];
      if (c.is_system) {
        currentSystemStack.push(c);
      } else {
        if (currentSystemStack.length === 1) {
          feed.push({ type: 'single', comment: currentSystemStack[0] });
          currentSystemStack = [];
        } else if (currentSystemStack.length > 1) {
          feed.push({
            type: 'system_stack',
            id: `stack-${currentSystemStack[0].id}`,
            comments: currentSystemStack,
          });
          currentSystemStack = [];
        }
        feed.push({ type: 'single', comment: c });
      }
    }

    if (currentSystemStack.length === 1) {
      feed.push({ type: 'single', comment: currentSystemStack[0] });
    } else if (currentSystemStack.length > 1) {
      feed.push({
        type: 'system_stack',
        id: `stack-${currentSystemStack[0].id}`,
        comments: currentSystemStack,
      });
    }

    return feed;
  };

  // Attempt Plane API initialization & sync on mount (Skip in Demo Mode)
  useEffect(() => {
    if (isDemoMode) {
      setPlaneSyncStatus('connected');
      return;
    }
    let mounted = true;

    async function initPlaneSync() {
      setPlaneSyncStatus('syncing');
      try {
        const initRes = await fetch('/api/plane/init', { method: 'POST' });
        if (initRes.ok) {
          if (mounted) setPlaneSyncStatus('connected');
        } else {
          if (mounted) setPlaneSyncStatus('offline');
        }
      } catch {
        if (mounted) setPlaneSyncStatus('offline');
      }
    }

    initPlaneSync();

    return () => {
      mounted = false;
    };
  }, [isDemoMode]);

  // Filtered issues list
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Priority filter
      if (priorityFilter !== 'ALL') {
        const conf = SEVERITY_CONFIG[issue.priority];
        if (conf.code !== priorityFilter && issue.priority !== priorityFilter.toLowerCase()) {
          return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = issue.name.toLowerCase().includes(q);
        const matchesId = (issue.id || '').toLowerCase().includes(q);
        const matchesSummary = (issue.description_text || '').toLowerCase().includes(q);
        const matchesPlatform = issue.affected_platforms.some((p) => p.toLowerCase().includes(q));
        if (!matchesName && !matchesId && !matchesSummary && !matchesPlatform) {
          return false;
        }
      }
      return true;
    });
  }, [issues, priorityFilter, searchQuery]);

  // Sort issues: active first, archived at bottom
  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      if (a.state === 'ARCHIVED' && b.state !== 'ARCHIVED') return 1;
      if (a.state !== 'ARCHIVED' && b.state === 'ARCHIVED') return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredIssues]);

  // Currently viewed issue
  const activeIssue = useMemo(() => {
    return issues.find((i) => i.id === selectedIssueId) || issues[0] || null;
  }, [issues, selectedIssueId]);

  // Reset in-place edit inputs when switching tickets
  useEffect(() => {
    setIsEditingTitle(false);
    setIsEditingSummary(false);
    setEditingStepIndex(null);
    setIsAddingStep(false);
    setEditingAcId(null);
    setIsAddingAc(false);
    setIsEditingBlocker(false);
    setIsAddingDetailLink(false);
    setIsSeverityDropdownOpen(false);
  }, [selectedIssueId]);

  // ─── ACTION HANDLERS ──────────────────────────────────────────────────────

  // Change Severity / Priority In-Place (with Auto-Comment)
  const handleChangeSeverity = (newPriority: PriorityLevel) => {
    requireIdentity((currentIdentity) => {
      if (!activeIssue || activeIssue.priority === newPriority) {
        setIsSeverityDropdownOpen(false);
        return;
      }

      const oldLabel = SEVERITY_CONFIG[activeIssue.priority].label;
      const newLabel = SEVERITY_CONFIG[newPriority].label;
      const sysComment = createSystemComment(
        `Severity level changed from ${oldLabel} to ${newLabel} by ${currentIdentity.name}.`
      );

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                priority: newPriority,
                comments: [...(iss.comments || []), sysComment],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      setIsSeverityDropdownOpen(false);
      triggerToast('info', 'Severity Updated', `Changed priority to ${newLabel}`);
    });
  };

  // Toggle Acceptance Criteria
  const handleToggleAC = (acId: string) => {
    requireIdentity(() => {
      if (!activeIssue) return;

      let allCompletedAfter = false;

      const updatedIssues = issues.map((iss) => {
        if (iss.id !== activeIssue.id) return iss;

        const newAC = iss.acceptance_criteria.map((item) =>
          item.id === acId ? { ...item, done: !item.done } : item
        );

        const allDone = newAC.length > 0 && newAC.every((item) => item.done);
        if (allDone && iss.state !== 'ARCHIVED') {
          allCompletedAfter = true;
        }

        return {
          ...iss,
          acceptance_criteria: newAC,
          updated_at: new Date().toISOString(),
        };
      });

      setIssues(updatedIssues);

      if (allCompletedAfter) {
        setPendingArchiveId(activeIssue.id);
        setShowArchiveModal(true);
        triggerToast(
          'success',
          'All Acceptance Criteria Satisfied',
          `Prompting archive confirmation for ${activeIssue.id}`
        );
      } else {
        triggerToast('info', 'Criteria Updated', 'Acceptance checklist state saved.');
      }
    });
  };

  // Confirm Archive (with Auto-Comment)
  const handleConfirmArchive = () => {
    if (!pendingArchiveId) return;

    requireIdentity((currentIdentity) => {
      const sysComment = createSystemComment(
        `Ticket archived by ${currentIdentity.name}. All acceptance criteria satisfied and remediation verified.`
      );

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === pendingArchiveId
            ? {
                ...iss,
                state: 'ARCHIVED',
                comments: [...(iss.comments || []), sysComment],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      setShowArchiveModal(false);
      triggerToast('success', 'Ticket Archived', `${pendingArchiveId} moved to historical archive.`);
      setPendingArchiveId(null);
    });
  };

  // Re-open Ticket (with Auto-Comment)
  const handleReopenTicket = (issueId: string) => {
    requireIdentity((currentIdentity) => {
      const sysComment = createSystemComment(`Ticket reopened to active triage queue by ${currentIdentity.name}.`);

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId
            ? {
                ...iss,
                state: 'OPEN',
                comments: [...(iss.comments || []), sysComment],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      triggerToast('info', 'Ticket Reopened', `${issueId} returned to active triage queue.`);
    });
  };

  // Delete Issue
  const handleDeleteIssue = (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation();
    requireIdentity(() => {
      if (window.confirm(`Are you sure you want to delete ticket ${issueId}?`)) {
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
        triggerToast('alert', 'Ticket Deleted', `${issueId} has been removed.`);
        if (selectedIssueId === issueId) {
          const remaining = issues.filter((i) => i.id !== issueId);
          if (remaining.length > 0) {
            setSelectedIssueId(remaining[0].id);
          } else {
            setSelectedIssueId(null);
            setIsCreatingNew(false);
          }
        }
      }
    });
  };

  // Blocker Management (with Auto-Comment & Clean State Reset)
  const handleToggleBlockerState = () => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIsEditingBlocker(true);
      setBlockerInput(activeIssue.blocker_text || '');
      setBlockerResolvedInput(activeIssue.blocker_resolved_text || '');
    });
  };

  const handleSaveBlocker = (setBlockerActive: boolean) => {
    if (!activeIssue) return;

    requireIdentity((currentIdentity) => {
      const sysComment = setBlockerActive
        ? createSystemComment(
            `Flagged as CRITICAL BLOCKER by ${currentIdentity.name}: "${blockerInput || 'Active regression blockage reported.'}"`
          )
        : createSystemComment(
            `Blocker RESOLVED by ${currentIdentity.name}: "${blockerResolvedInput || 'Blocker resolved and regression fence verified.'}"`
          );

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                blocker_active: setBlockerActive,
                blocker_text: setBlockerActive ? blockerInput : '',
                blocker_resolved_text: !setBlockerActive
                  ? blockerResolvedInput || 'Blocker resolved and regression fence verified.'
                  : '',
                comments: [...(iss.comments || []), sysComment],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      setIsEditingBlocker(false);
      triggerToast(
        setBlockerActive ? 'alert' : 'success',
        setBlockerActive ? 'Blocker Declared' : 'Blocker Resolved',
        setBlockerActive ? 'Blocker flagged in triage queue.' : 'Blocker resolved and cleared.'
      );
    });
  };

  // In-Place Title Edit
  const handleStartEditingTitle = () => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setTitleEditInput(activeIssue.name);
      setIsEditingTitle(true);
    });
  };

  const handleSaveTitle = () => {
    if (!activeIssue || !titleEditInput.trim()) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? { ...iss, name: titleEditInput.trim(), updated_at: new Date().toISOString() }
            : iss
        )
      );
      setIsEditingTitle(false);
      triggerToast('success', 'Title Updated', 'Ticket title saved.');
    });
  };

  // In-Place Summary Edit
  const handleStartEditingSummary = () => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setSummaryEditInput(activeIssue.description_text || '');
      setIsEditingSummary(true);
    });
  };

  const handleSaveSummary = () => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? { ...iss, description_text: summaryEditInput.trim(), updated_at: new Date().toISOString() }
            : iss
        )
      );
      setIsEditingSummary(false);
      triggerToast('success', 'Summary Updated', 'Ticket summary saved.');
    });
  };

  // In-Place Steps Edit / Delete / Add
  const handleStartEditingStep = (idx: number, currentText: string) => {
    requireIdentity(() => {
      setEditingStepIndex(idx);
      setStepEditInput(currentText);
    });
  };

  const handleSaveStep = (idx: number) => {
    if (!activeIssue || !stepEditInput.trim()) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== activeIssue.id) return iss;
          const updatedSteps = [...iss.steps_to_reproduce];
          updatedSteps[idx] = stepEditInput.trim();
          return { ...iss, steps_to_reproduce: updatedSteps, updated_at: new Date().toISOString() };
        })
      );
      setEditingStepIndex(null);
      triggerToast('info', 'Step Updated', `Step ${idx + 1} saved.`);
    });
  };

  const handleDeleteStep = (idx: number) => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== activeIssue.id) return iss;
          const updatedSteps = iss.steps_to_reproduce.filter((_, i) => i !== idx);
          return { ...iss, steps_to_reproduce: updatedSteps, updated_at: new Date().toISOString() };
        })
      );
      triggerToast('info', 'Step Removed', `Step ${idx + 1} deleted.`);
    });
  };

  const handleAddStepToActive = () => {
    if (!activeIssue || !newStepInput.trim()) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                steps_to_reproduce: [...(iss.steps_to_reproduce || []), newStepInput.trim()],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      setNewStepInput('');
      setIsAddingStep(false);
      triggerToast('success', 'Step Added', 'New step appended.');
    });
  };

  // In-Place Acceptance Criteria Edit / Delete / Add
  const handleStartEditingAc = (acId: string, currentText: string) => {
    requireIdentity(() => {
      setEditingAcId(acId);
      setAcEditInput(currentText);
    });
  };

  const handleSaveAc = (acId: string) => {
    if (!activeIssue || !acEditInput.trim()) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== activeIssue.id) return iss;
          const updatedAC = iss.acceptance_criteria.map((item) =>
            item.id === acId ? { ...item, text: acEditInput.trim() } : item
          );
          return { ...iss, acceptance_criteria: updatedAC, updated_at: new Date().toISOString() };
        })
      );
      setEditingAcId(null);
      triggerToast('info', 'Criterion Updated', 'Acceptance criterion saved.');
    });
  };

  const handleDeleteAc = (acId: string) => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== activeIssue.id) return iss;
          const updatedAC = iss.acceptance_criteria.filter((item) => item.id !== acId);
          return { ...iss, acceptance_criteria: updatedAC, updated_at: new Date().toISOString() };
        })
      );
      triggerToast('info', 'Criterion Removed', 'Acceptance criterion deleted.');
    });
  };

  const handleAddAcToActive = () => {
    if (!activeIssue || !newAcInput.trim()) return;
    requireIdentity(() => {
      const newAcItem: AcceptanceCriterion = {
        id: `ac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: newAcInput.trim(),
        done: false,
      };
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                acceptance_criteria: [...iss.acceptance_criteria, newAcItem],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      setNewAcInput('');
      setIsAddingAc(false);
      triggerToast('success', 'Criterion Added', 'New acceptance criterion appended.');
    });
  };

  // Detail Links Add & Delete
  const handleAddLinkToActive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue || !newDetailLinkUrl.trim()) return;

    requireIdentity(() => {
      const finalUrl = newDetailLinkUrl.trim().startsWith('http')
        ? newDetailLinkUrl.trim()
        : `https://${newDetailLinkUrl.trim()}`;

      const newLink: IssueLink = {
        id: `link-${Date.now()}`,
        url: finalUrl,
        label: newDetailLinkLabel.trim() || finalUrl,
      };

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                links: [...(iss.links || []), newLink],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      setNewDetailLinkUrl('');
      setNewDetailLinkLabel('');
      setIsAddingDetailLink(false);
      triggerToast('success', 'Link Attached', 'External reference link added.');
    });
  };

  const handleDeleteLinkFromActive = (linkId: string) => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                links: (iss.links || []).filter((l) => l.id !== linkId),
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      triggerToast('info', 'Link Removed', 'External link detached.');
    });
  };

  // ─── MEDIA & EVIDENCE PROCESSING (SCREENSHOTS, VIDEOS, LOOM) ─────────────
  const processUploadedFiles = async (files: FileList | File[]): Promise<MediaAttachment[]> => {
    const results: MediaAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
      const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
      if (!isImg && !isVid) continue;

      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      });

      results.push({
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        type: isVid ? 'video' : 'image',
        url,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: identity?.name || 'Contributor',
      });
    }
    return results;
  };

  // Clipboard Paste Handler (Screenshots)
  const handlePasteEvent = async (
    e: React.ClipboardEvent,
    target: 'form' | 'detail' | 'comment'
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const renamed = new File([file], `screenshot-${timestamp}.png`, { type: file.type });
          files.push(renamed);
        }
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const processed = await processUploadedFiles(files);
      if (target === 'form') {
        setFormAttachments((prev) => [...prev, ...processed]);
        triggerToast('info', 'Screenshot Attached', `${processed.length} image(s) pasted into new ticket.`);
      } else if (target === 'comment') {
        setCommentAttachments((prev) => [...prev, ...processed]);
        triggerToast('info', 'Screenshot Attached', `${processed.length} image(s) attached to pending note.`);
      } else if (target === 'detail' && activeIssue) {
        handleAddMediaToActiveDirect(processed);
      }
    }
  };

  // File Input Handler
  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'form' | 'detail' | 'comment'
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const processed = await processUploadedFiles(e.target.files);
    if (target === 'form') {
      setFormAttachments((prev) => [...prev, ...processed]);
      triggerToast('success', 'Media Attached', `${processed.length} file(s) attached to ticket.`);
    } else if (target === 'comment') {
      setCommentAttachments((prev) => [...prev, ...processed]);
      triggerToast('success', 'Media Attached', `${processed.length} file(s) attached to note.`);
    } else if (target === 'detail' && activeIssue) {
      handleAddMediaToActiveDirect(processed);
    }
    e.target.value = '';
  };

  // Add Direct Media to Active Issue
  const handleAddMediaToActiveDirect = (newMedia: MediaAttachment[]) => {
    if (!activeIssue || newMedia.length === 0) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                attachments: [...(iss.attachments || []), ...newMedia],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      triggerToast('success', 'Media Attached', `Added ${newMedia.length} artifact(s) to ${activeIssue.id}.`);
    });
  };

  // Add External Video or Link to Active Issue
  const handleAddExternalMediaToActive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetailMediaUrl.trim() || !activeIssue) return;
    requireIdentity((currentIdentity) => {
      const url = newDetailMediaUrl.trim();
      const vidInfo = parseVideoEmbed(url);
      const isImg = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url);
      const mediaType: 'image' | 'video' | 'link' = vidInfo.type !== 'none' ? 'video' : isImg ? 'image' : 'link';

      const newAtt: MediaAttachment = {
        id: `media-${Date.now()}`,
        name:
          newDetailMediaLabel.trim() ||
          (vidInfo.type === 'loom'
            ? 'Loom Screen Recording'
            : vidInfo.type === 'youtube'
            ? 'YouTube Recording'
            : 'Media Evidence'),
        type: mediaType,
        url,
        uploaded_at: new Date().toISOString(),
        uploaded_by: currentIdentity.name,
      };

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                attachments: [...(iss.attachments || []), newAtt],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      setNewDetailMediaUrl('');
      setNewDetailMediaLabel('');
      setIsAddingDetailMedia(false);
      triggerToast('success', 'Media Attached', 'External media link added to ticket.');
    });
  };

  // Delete Media from Active Issue
  const handleDeleteMediaFromActive = (mediaId: string) => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                attachments: (iss.attachments || []).filter((m) => m.id !== mediaId),
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      triggerToast('info', 'Media Removed', 'Artifact deleted from ticket.');
    });
  };

  // Delete Individual Comment
  const handleDeleteComment = (commentId: string) => {
    if (!activeIssue) return;
    requireIdentity(() => {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                comments: (iss.comments || []).filter((c) => c.id !== commentId),
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );
      triggerToast('info', 'Comment Deleted', 'Note removed from stream.');
    });
  };

  // Add Comment (User)
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!commentInput.trim() && commentAttachments.length === 0) || !activeIssue) return;

    requireIdentity((currentIdentity) => {
      const noteText =
        commentInput.trim() ||
        (commentAttachments.length > 0
          ? `[Attached ${commentAttachments.length} media artifact(s)]`
          : '');

      const newComment: CommentItem = {
        id: `c-${Date.now()}`,
        author: currentIdentity.name,
        author_email: currentIdentity.email,
        text: noteText,
        timestamp: new Date().toISOString(),
        attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
      };

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                comments: [...(iss.comments || []), newComment],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      // Trigger serverless Resend dispatch or simulated notification
      if (isDemoMode) {
        const watcherListStr = activeIssue.watchers.length > 0 ? activeIssue.watchers.join(', ') : 'team';
        triggerToast(
          'info',
          'Simulated Note Dispatch',
          `Demo Mode: Email dispatch simulated for ${watcherListStr} from noreply@buildghost.site (live emails disabled in sandbox).`
        );
      } else {
        fetch('/api/plane/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'comment_added',
            issue: activeIssue,
            actor: currentIdentity,
            comment: noteText,
          }),
        }).catch((err) => console.warn('Dispatch error:', err));
      }

      setCommentInput('');
      setCommentAttachments([]);
      const watcherCount = activeIssue.watchers.length;
      if (!isDemoMode) {
        triggerToast(
          'info',
          'Note Posted',
          watcherCount > 0
            ? `Dispatched note to ${watcherCount} subscribed watcher(s).`
            : 'Note added to ticket stream (0 external watchers).'
        );
      }
    });
  };

  // Add Watcher
  const handleAddWatcher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatcherInput.trim() || !activeIssue) return;

    requireIdentity((currentIdentity) => {
      const emailToAdd = newWatcherInput.trim();
      if (activeIssue.watchers.includes(emailToAdd)) {
        triggerToast('warning', 'Already Watching', `${emailToAdd} is already in the watcher list.`);
        setNewWatcherInput('');
        return;
      }

      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === activeIssue.id
            ? {
                ...iss,
                watchers: [...iss.watchers, emailToAdd],
                updated_at: new Date().toISOString(),
              }
            : iss
        )
      );

      if (isDemoMode) {
        triggerToast(
          'info',
          'Watcher Alert Simulated',
          `Demo Mode: Email dispatch simulated for ${emailToAdd} from noreply@buildghost.site (live emails disabled in sandbox).`
        );
      } else {
        // Trigger serverless Resend dispatch
        fetch('/api/plane/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'watcher_added',
            issue: { ...activeIssue, watchers: [...activeIssue.watchers, emailToAdd] },
            actor: { name: emailToAdd, email: emailToAdd },
          }),
        }).catch((err) => console.warn('Dispatch error:', err));

        triggerToast('success', 'Watcher Added', `${emailToAdd} added to this ticket's watchers.`);
      }

      setNewWatcherInput('');
    });
  };

  // Toggle Current User Watch
  const handleToggleMyWatch = () => {
    if (!activeIssue) return;
    requireIdentity((currentIdentity) => {
      const isWatching = activeIssue.watchers.includes(currentIdentity.email);

      setIssues((prev) =>
        prev.map((iss) => {
          if (iss.id !== activeIssue.id) return iss;
          const newWatchers = isWatching
            ? iss.watchers.filter((w) => w !== currentIdentity.email)
            : [...iss.watchers, currentIdentity.email];
          return {
            ...iss,
            watchers: newWatchers,
            updated_at: new Date().toISOString(),
          };
        })
      );

      if (!isWatching) {
        if (isDemoMode) {
          triggerToast(
            'info',
            'Watcher Alert Simulated',
            `Demo Mode: Email dispatch simulated for ${currentIdentity.email} from noreply@buildghost.site (live emails disabled in sandbox).`
          );
        } else {
          // Trigger serverless Resend dispatch
          fetch('/api/plane/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'watcher_added',
              issue: { ...activeIssue, watchers: [...activeIssue.watchers, currentIdentity.email] },
              actor: currentIdentity,
            }),
          }).catch((err) => console.warn('Dispatch error:', err));
        }
      }

      triggerToast(
        isWatching ? 'info' : 'success',
        isWatching ? 'Unsubscribed' : 'Subscribed to Watchers',
        isWatching ? 'You will no longer receive alerts.' : `Alerts will be sent to ${currentIdentity.email}`
      );
    });
  };

  // Insert @mention into comment
  const handleInsertMention = (handle: string) => {
    setCommentInput((prev) => (prev ? `${prev} @${handle} ` : `@${handle} `));
  };

  // Platform checkbox toggle in form
  const togglePlatform = (p: string) => {
    setFormPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  // Form Link helpers
  const handleAddFormLink = () => {
    if (!formLinkUrl.trim()) return;
    const finalUrl = formLinkUrl.trim().startsWith('http')
      ? formLinkUrl.trim()
      : `https://${formLinkUrl.trim()}`;
    setFormLinks((prev) => [
      ...prev,
      { url: finalUrl, label: formLinkLabel.trim() || finalUrl },
    ]);
    setFormLinkUrl('');
    setFormLinkLabel('');
    setIsAddingFormLink(false);
  };

  // Form Media URL helper
  const handleAddFormMediaUrl = () => {
    if (!formMediaUrl.trim()) return;
    const finalUrl = formMediaUrl.trim().startsWith('http') || formMediaUrl.trim().startsWith('data:')
      ? formMediaUrl.trim()
      : `https://${formMediaUrl.trim()}`;
    const vidInfo = parseVideoEmbed(finalUrl);
    const isImg = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(finalUrl);
    const mediaType: 'image' | 'video' | 'link' = vidInfo.type !== 'none' ? 'video' : isImg ? 'image' : 'link';

    setFormAttachments((prev) => [
      ...prev,
      {
        id: `media-${Date.now()}`,
        name:
          formMediaLabel.trim() ||
          (vidInfo.type === 'loom'
            ? 'Loom Recording'
            : vidInfo.type === 'youtube'
            ? 'YouTube Recording'
            : 'Media Evidence'),
        type: mediaType,
        url: finalUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: identity?.name || 'Contributor',
      },
    ]);
    setFormMediaUrl('');
    setFormMediaLabel('');
    setIsAddingFormMediaUrl(false);
  };

  // Submit New Issue Form
  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      triggerToast('alert', 'Title Required', 'Please enter a summary title for the ticket.');
      return;
    }

    requireIdentity((currentIdentity) => {
      const nextSeq = issues.reduce((max, i) => Math.max(max, i.sequence_id || 100), 100) + 1;
      const newId = isDemoMode ? `DEMO-${nextSeq}` : `SP-${nextSeq}`;

      const cleanedSteps = formSteps.map((s) => s.trim()).filter(Boolean);
      const cleanedAC: AcceptanceCriterion[] = formAC
        .map((ac) => ac.trim())
        .filter(Boolean)
        .map((text, idx) => ({
          id: `ac-${Date.now()}-${idx}`,
          text,
          done: false,
        }));

      const cleanedWatchers = formWatchers
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);

      const cleanedLinks: IssueLink[] = formLinks.map((l, i) => ({
        id: `link-${Date.now()}-${i}`,
        url: l.url,
        label: l.label,
      }));

      const newIssue: TriageIssue = {
        id: newId,
        sequence_id: nextSeq,
        name: formTitle.trim(),
        description_text: formSummary.trim(),
        priority: formPriority,
        state: 'OPEN',
        affected_platforms: formPlatforms.length > 0 ? formPlatforms : ['Web'],
        blocker_active: false,
        blocker_text: '',
        blocker_resolved_text: '',
        acceptance_criteria:
          cleanedAC.length > 0
            ? cleanedAC
            : [
                {
                  id: `ac-${Date.now()}`,
                  text: 'Root cause investigated and automated test gate passes.',
                  done: false,
                },
              ],
        steps_to_reproduce:
          cleanedSteps.length > 0 ? cleanedSteps : ['Inspect telemetry and reproduce fault conditions.'],
        remediation: formRemediation.trim(),
        links: cleanedLinks,
        attachments: formAttachments.length > 0 ? formAttachments : undefined,
        creator_name: currentIdentity.name,
        creator_email: currentIdentity.email,
        watchers: cleanedWatchers,
        comments: [
          {
            id: `c-${Date.now()}`,
            author: currentIdentity.name,
            author_email: currentIdentity.email,
            text: `Ticket filed into ${isDemoMode ? 'sandbox demo queue' : 'live triage queue'} by ${currentIdentity.name}.`,
            timestamp: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Prepend new issue to list
      setIssues((prev) => [newIssue, ...prev]);
      setSelectedIssueId(newId);
      setIsCreatingNew(false);

      // Reset Form
      setFormTitle('');
      setFormSummary('');
      setFormSteps(['']);
      setFormAC(['']);
      setFormRemediation('');
      setFormWatchers('');
      setFormLinks([]);
      setFormAttachments([]);

      triggerToast('success', 'Ticket Registered', `${newId} published to queue.`);
    });
  };

  // ─── Reset Demo Sandbox Data Handler ──────────────────────────────────────
  const handleResetDemoData = () => {
    try {
      localStorage.removeItem(DEMO_LOCAL_STORAGE_KEY);
    } catch {}
    setIssues(DEMO_SEED_ISSUES);
    setSelectedIssueId('DEMO-101');
    setIsCreatingNew(false);
    triggerToast('info', 'Demo Sandbox Reset', 'Restored initial sandbox ticket DEMO-101.');
  };

  // ─── Factory Reset Handler (Admin Only in Prod, Sandbox Reset in Demo) ────
  const handleFactoryReset = async () => {
    if (isDemoMode) {
      handleResetDemoData();
      return;
    }
    if (!isAdmin) return;
    const confirmed = window.confirm('Delete ALL tickets? This cannot be undone.');
    if (!confirmed) return;

    setIsResetting(true);
    try {
      // Call DELETE /api/plane/reset to purge all issues in Plane workspace
      await fetch('/api/plane/reset', { method: 'DELETE' }).catch((err) => {
        console.warn('Plane API reset call warning:', err);
      });

      // Clear local state and localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      setIssues([]);
      setSelectedIssueId(null);
      setIsCreatingNew(false);

      triggerToast('success', 'Board reset to factory', 'All tickets and local cache cleared.');
    } catch (err) {
      console.error('Factory reset error:', err);
      triggerToast('alert', 'Reset Failed', 'Could not complete factory reset.');
    } finally {
      setIsResetting(false);
    }
  };

  // ─── Test Dispatch Handler (Admin Only) ──────────────────────────────────
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const handleSendTestEmail = async () => {
    if (isDemoMode) {
      triggerToast(
        'info',
        'Simulated Test Dispatch',
        `Demo Mode: Test email simulated for ${identity?.email || 'admin'} from noreply@buildghost.site (disabled in sandbox).`
      );
      return;
    }
    if (!isAdmin || !identity?.email) return;
    setIsSendingTestEmail(true);
    triggerToast('info', 'Sending Test Dispatch…', 'Connecting to Resend email gateway…');
    try {
      const res = await fetch('/api/plane/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test_email',
          issue: activeIssue,
          actor: identity,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('success', 'Test Email Delivered', `Sent to admin address: ${identity.email}`);
      } else if (data.warning) {
        triggerToast('warning', 'Resend Notice', data.warning);
      } else {
        triggerToast('alert', 'Dispatch Error', data.error || 'Could not send test email.');
      }
    } catch (err) {
      console.error('Test dispatch error:', err);
      triggerToast('alert', 'Dispatch Failed', 'Could not reach /api/plane/notify endpoint.');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // ─── Email Safe Mode Toggle Handler (Admin Only) ─────────────────────────
  const [isTogglingEmailMode, setIsTogglingEmailMode] = useState<boolean>(false);
  const handleToggleEmailMode = async () => {
    if (isDemoMode) {
      setIsEmailSafeMode(!isEmailSafeMode);
      triggerToast(
        'info',
        'Email Mode Simulated',
        `Demo Mode: Toggled safe mode to ${!isEmailSafeMode ? 'ON' : 'OFF'} (local simulation).`
      );
      return;
    }
    if (!isAdmin || !identity?.email) return;
    const newMode = !isEmailSafeMode;
    setIsTogglingEmailMode(true);
    try {
      const res = await fetch('/api/plane/email-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: identity.email,
          safeMode: newMode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEmailSafeMode(newMode);
        triggerToast(
          newMode ? 'info' : 'warning',
          newMode ? 'Safe Mode: ON (Admin Only)' : 'Live Broadcast: ON',
          newMode
            ? 'Dispatches will be delivered exclusively to your admin address.'
            : 'Dispatches will broadcast live to all subscribed watchers & creators.'
        );
      } else {
        triggerToast('alert', 'Mode Change Failed', data.error || 'Could not update email mode.');
      }
    } catch (err) {
      console.error('Email mode toggle error:', err);
      triggerToast('alert', 'Mode Change Failed', 'Could not reach /api/plane/email-mode endpoint.');
    } finally {
      setIsTogglingEmailMode(false);
    }
  };

  // ─── Demo Ticket Generator Handler ─────────────────────────────────────────
  const handleCreateDemoTicket = async () => {
    const nextSeq = issues.reduce((max, i) => Math.max(max, i.sequence_id || 100), 100) + 1;
    const demoId = `DEMO-${nextSeq}`;

    const demoTicket: TriageIssue = {
      id: demoId,
      sequence_id: nextSeq,
      name: 'DEMO — How This Triage Desk Works',
      description_text:
        'Welcome to the BuildGhost Triage Desk. This demo ticket showcases real-time issue ingestion, interactive blocker declaration, acceptance criteria gates, and automated notifications.',
      priority: 'medium', // P2 Example / P2 Major
      state: 'OPEN',
      affected_platforms: ['Web'],
      blocker_active: false,
      blocker_text: '',
      blocker_resolved_text: '',
      acceptance_criteria: [
        {
          id: `ac-demo-${Date.now()}-1`,
          text: 'This checklist defines when the ticket is DONE. Check all to auto-archive.',
          done: false,
        },
        {
          id: `ac-demo-${Date.now()}-2`,
          text: 'Example criteria 2.',
          done: false,
        },
        {
          id: `ac-demo-${Date.now()}-3`,
          text: 'Example criteria 3.',
          done: false,
        },
      ],
      steps_to_reproduce: [
        '1. This field is where you describe how to reproduce the bug...',
        '2. Keep it short and actionable.',
      ],
      remediation:
        'Blocker Toggle: Flag as Blocker if this stops a release. Watchers: Add your email here to get Resend updates from noreply@buildghost.site.',
      links: [
        {
          id: `link-demo-${Date.now()}`,
          url: 'https://buildghost.site',
          label: 'BuildGhost Live Platform',
        },
      ],
      creator_name: identity?.name || 'DevOps Engineer',
      creator_email: identity?.email || 'devops@buildghost.site',
      watchers: [],
      comments: [
        {
          id: `demo-c-${Date.now()}`,
          author: 'BuildGhost System // Triage-Desk',
          text: 'This is the activity feed. @mentions notify watchers.',
          timestamp: new Date().toISOString(),
          is_system: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setIssues((prev) => [demoTicket, ...prev]);
    setSelectedIssueId(demoId);
    setIsCreatingNew(false);

    // Sync to Plane API proxy if reachable
    try {
      fetch('/api/plane/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: demoTicket.name,
          description_html: `<p>${demoTicket.description_text}</p>`,
          priority: demoTicket.priority,
          extra_data: {
            affected_platforms: demoTicket.affected_platforms.join(', '),
            blocker_active: false,
            ac_json: JSON.stringify(demoTicket.acceptance_criteria.map((a) => a.text)),
            steps: demoTicket.steps_to_reproduce,
            remediation: demoTicket.remediation,
            creator_name: demoTicket.creator_name,
            creator_email: demoTicket.creator_email,
            watchers: demoTicket.watchers,
          },
        }),
      }).catch(() => {});
    } catch {}

    triggerToast(
      'success',
      'Demo Portfolio Ticket Created',
      'Interactive checklist, blocker toggle, and activity feed loaded.'
    );
  };

  // ─── Universal Passcode Authentication Gate Handlers ─────────────────────
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = passcodeInput.trim();
    if (!entered) return;

    setIsVerifyingPasscode(true);
    setPasscodeError('');

    try {
      const res = await fetch('/api/plane/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: entered }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        try {
          localStorage.setItem(ACCESS_STORAGE_KEY, 'true');
          if (data.token) {
            localStorage.setItem('bg_triage_desk_token', data.token);
          }
        } catch {}
        setIsUnlocked(true);
        setPasscodeError('');
        triggerToast('success', 'Console Unlocked', 'Zero-knowledge serverless session established.');
      } else {
        setPasscodeError(data.error || 'Invalid access passcode. Please try again.');
      }
    } catch (err) {
      console.error('Auth gateway error:', err);
      // Offline fallback for local development or disconnected state
      const customLocalPass = localStorage.getItem('bg_custom_passcode') || '';
      if (
        ['harleydyna1!', 'buildghost', 'ghostops', 'buildghost2026', 'triage2026', 'sextpanther'].includes(entered.toLowerCase()) ||
        entered === 'Harleydyna1!' ||
        (customLocalPass && entered === customLocalPass)
      ) {
        try {
          localStorage.setItem(ACCESS_STORAGE_KEY, 'true');
        } catch {}
        setIsUnlocked(true);
        setPasscodeError('');
        triggerToast('success', 'Console Unlocked', 'Local session initialized.');
      } else {
        setPasscodeError('Authentication gateway unreachable. Please try again.');
      }
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const handleLockConsole = () => {
    try {
      localStorage.removeItem(ACCESS_STORAGE_KEY);
      localStorage.removeItem('bg_triage_desk_token');
    } catch {}
    setIsUnlocked(false);
    setPasscodeInput('');
    setPasscodeError('');
    triggerToast('info', 'Console Locked', 'Universal access passcode required to re-enter.');
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !identity?.email) return;

    if (!newPassInput.trim() || newPassInput.trim().length < 3) {
      setPassChangeError('New passcode must be at least 3 characters long.');
      return;
    }
    if (newPassInput.trim() !== confirmPassInput.trim()) {
      setPassChangeError('New passcodes do not match.');
      return;
    }

    setIsUpdatingPasscode(true);
    setPassChangeError('');

    try {
      const res = await fetch('/api/plane/change-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: identity.email,
          newPasscode: newPassInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        try {
          localStorage.setItem('bg_custom_passcode', newPassInput.trim());
        } catch {}
        setShowPasscodeModal(false);
        setCurrentPassInput('');
        setNewPassInput('');
        setConfirmPassInput('');
        setPassChangeError('');
        triggerToast('success', 'Passcode Updated', 'New passcode is active across all server endpoints.');
      } else {
        setPassChangeError(data.error || 'Failed to update passcode.');
      }
    } catch (err) {
      console.error('Passcode update error:', err);
      // Save locally even if offline
      try {
        localStorage.setItem('bg_custom_passcode', newPassInput.trim());
      } catch {}
      setShowPasscodeModal(false);
      triggerToast('success', 'Passcode Updated (Local)', 'Passcode saved to current session.');
    } finally {
      setIsUpdatingPasscode(false);
    }
  };

  // ─── Gatekeeper Screen If Locked (Bypassed in Demo Mode) ───────────────
  if (!isUnlocked && !isDemoMode) {
    return (
      <div className="td-root td-gate-root">
        <div className="td-gate-container">
          <div className="td-gate-card">
            <div className="td-gate-header">
              <div className="td-gate-icon">🔒</div>
              <span className="td-gate-eyebrow">AUTHENTICATION GATE // RESTRICTED ACCESS</span>
              <h2 className="td-gate-title">BUILDGHOST // TRIAGE-DESK</h2>
              <p className="td-gate-desc">
                Engineering triage console for defect remediation, blocker isolation, and acceptance gates. Enter the access passcode to initialize your session.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="td-gate-form">
              {passcodeError && (
                <div className="td-gate-error">
                  <span className="td-gate-error-icon">⚠️</span>
                  <span>{passcodeError}</span>
                </div>
              )}

              <div className="td-form-group">
                <label className="td-form-label">Access Passcode</label>
                <div className="td-gate-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    placeholder="Enter access passcode…"
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      if (passcodeError) setPasscodeError('');
                    }}
                    className="td-input-text td-gate-input"
                  />
                  <button
                    type="button"
                    className="td-btn-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button type="submit" className="td-btn-gate-unlock" disabled={isVerifyingPasscode}>
                {isVerifyingPasscode ? 'Verifying Gateway…' : 'Unlock Console ↗'}
              </button>
            </form>

            <div className="td-gate-footer">
              <a href="https://buildghost.site" className="td-gate-back-link">
                ← Return to Platform Overview
              </a>
            </div>
          </div>
        </div>

        {/* Sequential Toast Queue */}
        <div className="td-toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`td-toast-card ${toast.type}`}>
              <div className="td-toast-icon">
                {toast.type === 'success' && '✓'}
                {toast.type === 'alert' && '⚠️'}
                {toast.type === 'warning' && '!'}
                {toast.type === 'info' && '●'}
              </div>
              <div className="td-toast-content">
                <h5 className="td-toast-title">{toast.title}</h5>
                {toast.description && <p className="td-toast-desc">{toast.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="td-root">
      {/* ─── Fullscreen Demo Intro Splash Video (Plays once, then fades away) ── */}
      {showIntroOverlay && isDemoMode && (
        <div
          className={`td-intro-overlay ${isIntroFading ? 'fading' : ''}`}
          onClick={handleDismissIntro}
        >
          <button
            type="button"
            className="td-intro-skip-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDismissIntro();
            }}
            title="Skip intro and go directly to triage desk"
          >
            Skip Intro ✕
          </button>
          <video
            ref={(el) => {
              if (el) {
                el.muted = true;
                el.defaultMuted = true;
                const p = el.play();
                if (p !== undefined) {
                  p.catch(() => {
                    // Auto-dismiss after brief poster show if autoplay strictly blocked
                    setTimeout(handleDismissIntro, 2500);
                  });
                }
              }
            }}
            autoPlay
            muted
            playsInline
            preload="auto"
            poster="/triage-desk/assets/TRIAGE.png"
            className="td-intro-video"
            onEnded={handleDismissIntro}
            onError={handleDismissIntro}
          >
            <source src="/triage-desk/assets/triage.mp4" type="video/mp4" />
            <source src="/assets/triage.mp4" type="video/mp4" />
            <source src="/triage-desk/assets/triage.webm" type="video/webm" />
            <source src="/assets/triage.webm" type="video/webm" />
            <img
              src="/triage-desk/assets/TRIAGE.png"
              alt="BuildGhost Triage Logo Fallback"
              style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
            />
          </video>
        </div>
      )}

      {/* ─── Top Demo Mode Banner ───────────────────────────────────────── */}
      {isDemoMode && (
        <div className="td-demo-banner">
          <div className="td-demo-banner-content">
            <span className="td-demo-pill">DEMO MODE</span>
            <span className="td-demo-text">
              Local only, resets on refresh. No emails sent to team.
            </span>
          </div>
          <button
            type="button"
            className="td-demo-reset-btn"
            onClick={handleResetDemoData}
            title="Reset sandbox tickets to initial seed"
          >
            ↺ Reset Demo Data
          </button>
        </div>
      )}

      {/* ─── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="td-header">
        <div className="td-header-left">
          <a href="https://buildghost.site" className="td-brand">
            <span>BUILDGHOST</span> // TRIAGE-DESK
          </a>
          <span className="td-brand-tag">
            {isDemoMode ? 'SANDBOX DEMO MODE' : 'PRODUCTION ISSUE TRACKER'}
          </span>
          <div className="td-connection-pill">
            <span
              className={`td-status-indicator ${
                isDemoMode || planeSyncStatus === 'connected' ? 'connected' : 'offline'
              }`}
            />
            <span>
              {isDemoMode
                ? 'SANDBOX SIMULATION'
                : planeSyncStatus === 'connected'
                ? 'PLANE API SYNC'
                : 'ACTIVE QUEUE'}
            </span>
          </div>
        </div>

        <div className="td-header-right">
          {identity ? (
            <div className="td-identity-chip">
              <span className="td-identity-dot" />
              <span className="td-identity-label">
                You are: <strong className="td-identity-name">{identity.name}</strong>{' '}
                <span className="td-identity-email">({identity.email})</span>
              </span>
              <button
                type="button"
                className="td-btn-change-identity"
                onClick={handleOpenChangeIdentity}
                title="Change your contributor identity"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="td-btn-set-identity"
              onClick={handleOpenChangeIdentity}
              title="Set display name and email for submitting and editing"
            >
              <span>👤 Set Identity</span>
            </button>
          )}

          {isDemoMode ? (
            <a
              href="/triage-desk"
              className="td-btn-lock"
              title="Switch to live passcode-gated console"
              style={{ textDecoration: 'none' }}
            >
              🔒 Live Gate ↗
            </a>
          ) : (
            <button
              type="button"
              className="td-btn-lock"
              onClick={handleLockConsole}
              title="Lock console session"
            >
              🔒 Lock
            </button>
          )}

          <button
            type="button"
            className="td-btn-guide"
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? 'Hide Guide ▲' : 'Field Guide ▾'}
          </button>
        </div>
      </header>

      {/* ─── Field Guide Dropdown / Drawer ──────────────────────────────── */}
      {showGuide && (
        <div className="td-guide-drawer">
          <div className="td-guide-content">
            <div className="td-guide-badge">TRIAGE DESK // ISSUE TRACKER</div>
            <h3 className="td-guide-title">How to File High-Leverage Triage Tickets</h3>
            <p className="td-guide-desc">
              Interactive triage console for real-time defect remediation, root-cause investigation, and release management.
              All ticket properties (title, summary, steps, acceptance criteria, links, and comments) are editable directly in place.
            </p>
            <div className="td-guide-grid">
              <div className="td-guide-card">
                <h4>1. In-Place Editing</h4>
                <p>Hover over any title, summary, step, or criterion to click the ✎ pencil and edit immediately.</p>
              </div>
              <div className="td-guide-card">
                <h4>2. External Links & Artifacts</h4>
                <p>Attach Sentry issues, Datadog traces, or GitHub PRs using the + Add Link tool.</p>
              </div>
              <div className="td-guide-card">
                <h4>3. Automated Event Log</h4>
                <p>Blocker declarations, resolutions, and archive events automatically register system comments.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3-Column Triage Console ────────────────────────────────────── */}
      <div className="td-workspace">
        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 1: LEFT RAIL (320px) — Issue List & Filters
            ═══════════════════════════════════════════════════════════════════ */}
        <aside className="td-col-left">
          <div className="td-left-header">
            <div className="td-left-title-row">
              <span className="td-rail-title">TRIAGE QUEUE</span>
              <span className="td-count-badge">{issues.length}</span>
            </div>

            <button
              type="button"
              className={`td-btn-add-ticket ${isCreatingNew ? 'active' : ''}`}
              onClick={() => requireIdentity(() => setIsCreatingNew(true))}
            >
              + Add Another Issue
            </button>
          </div>

          {/* Search Bar */}
          <div className="td-search-box">
            <input
              type="text"
              placeholder="Search tickets, IDs, platforms…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="td-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="td-clear-search"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity Filter Pills */}
          <div className="td-filter-pills">
            {['ALL', 'P0', 'P1', 'P2', 'P3'].map((code) => (
              <button
                key={code}
                type="button"
                className={`td-filter-pill ${priorityFilter === code ? 'active' : ''}`}
                onClick={() => setPriorityFilter(code)}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Ticket Cards List */}
          <div className="td-ticket-list">
            {sortedIssues.length === 0 ? (
              <div className="td-empty-rail">
                {issues.length === 0 ? (
                  <div className="td-empty-queue-box">
                    <div className="td-empty-icon">📂</div>
                    <h4 className="td-empty-title">Queue is Empty</h4>
                    <p className="td-empty-sub">No tickets currently in triage desk.</p>
                    <button
                      type="button"
                      className="td-btn-create-demo-rail"
                      onClick={handleCreateDemoTicket}
                    >
                      ★ Create Demo Portfolio Ticket
                    </button>
                  </div>
                ) : (
                  <>
                    <p>No tickets match current filter.</p>
                    <button
                      type="button"
                      className="td-btn-reset-filters"
                      onClick={() => {
                        setPriorityFilter('ALL');
                        setSearchQuery('');
                      }}
                    >
                      Clear Filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              sortedIssues.map((issue) => {
                const isSelected = !isCreatingNew && activeIssue?.id === issue.id;
                const isArchived = issue.state === 'ARCHIVED';
                const sev = SEVERITY_CONFIG[issue.priority];
                const completedAC = issue.acceptance_criteria.filter((a) => a.done).length;
                const totalAC = issue.acceptance_criteria.length;

                return (
                  <div
                    key={issue.id}
                    className={`td-ticket-card ${isSelected ? 'selected' : ''} ${
                      isArchived ? 'archived' : ''
                    }`}
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setIsCreatingNew(false);
                    }}
                  >
                    <div className="td-card-top">
                      <div className="td-card-id-row">
                        <span className="td-card-id">{issue.id}</span>
                        <span
                          className="td-card-severity"
                          style={{ color: sev.color, borderColor: sev.color, background: sev.bg }}
                        >
                          {sev.code}
                        </span>
                        {issue.blocker_active && (
                          <span className="td-blocker-tag">BLOCKER</span>
                        )}
                        {isArchived && (
                          <span className="td-archived-tag">ARCHIVED</span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="td-btn-delete-card"
                        title="Delete ticket"
                        onClick={(e) => handleDeleteIssue(e, issue.id)}
                      >
                        ✕
                      </button>
                    </div>

                    <h4 className="td-card-title">{issue.name}</h4>

                    <div className="td-card-platforms">
                      {issue.affected_platforms.slice(0, 3).map((p) => (
                        <span key={p} className="td-card-platform-chip">
                          {p}
                        </span>
                      ))}
                      {issue.affected_platforms.length > 3 && (
                        <span className="td-card-platform-chip">
                          +{issue.affected_platforms.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="td-card-meta">
                      <div className="td-card-ac-stat">
                        <span>AC:</span> {completedAC}/{totalAC}
                      </div>
                      <div className="td-card-comments-stat">
                        💬 {issue.comments?.length || 0}
                      </div>
                      {issue.links && issue.links.length > 0 && (
                        <div className="td-card-links-stat">
                          🔗 {issue.links.length}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 2: CENTER PANEL (FLUID) — Detail or Creation Form
            ═══════════════════════════════════════════════════════════════════ */}
        <main className="td-col-center">
          {isCreatingNew ? (
            /* ─────────────────────────────────────────────────────────────
               CRUD TICKET CREATION FORM
               ───────────────────────────────────────────────────────────── */
            <div className="td-form-container">
              <div className="td-form-header">
                <span className="td-eyebrow-form">INGESTION // NEW TICKET</span>
                <h2 className="td-form-title">Submit Triage Issue to Pipeline</h2>
                <p className="td-form-subtitle">
                  Define issue parameters and acceptance criteria for immediate CI/CD automated reproduction.
                </p>
              </div>

              <form onSubmit={handleCreateIssue} className="td-crud-form">
                {/* Issue Title */}
                <div className="td-form-group">
                  <label className="td-form-label">
                    Issue Title / Summary <span className="td-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WebSocket handshake drop during creator peak concurrent broadcast"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="td-input-text"
                  />
                </div>

                {/* Priority Selection */}
                <div className="td-form-group">
                  <label className="td-form-label">Severity Level</label>
                  <div className="td-priority-selector">
                    {(Object.keys(SEVERITY_CONFIG) as PriorityLevel[]).map((pKey) => {
                      const conf = SEVERITY_CONFIG[pKey];
                      return (
                        <button
                          key={pKey}
                          type="button"
                          className={`td-priority-btn ${formPriority === pKey ? 'active' : ''}`}
                          style={
                            formPriority === pKey
                              ? { borderColor: conf.color, color: conf.color, background: conf.bg }
                              : {}
                          }
                          onClick={() => setFormPriority(pKey)}
                        >
                          {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Affected Platforms */}
                <div className="td-form-group">
                  <label className="td-form-label">Affected Surface / Platform</label>
                  <div className="td-platform-picker">
                    {AVAILABLE_PLATFORMS.map((plat) => {
                      const isChecked = formPlatforms.includes(plat);
                      return (
                        <button
                          key={plat}
                          type="button"
                          className={`td-platform-pill ${isChecked ? 'active' : ''}`}
                          onClick={() => togglePlatform(plat)}
                        >
                          {isChecked ? '✓ ' : '+ '}
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Summary */}
                <div className="td-form-group">
                  <label className="td-form-label">Failure Description & Telemetry</label>
                  <textarea
                    rows={4}
                    placeholder="Describe observed behavior, latency thresholds, and server telemetry codes..."
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    className="td-textarea"
                  />
                </div>

                {/* Steps to Reproduce Builder */}
                <div className="td-form-group">
                  <label className="td-form-label">Steps to Reproduce</label>
                  <div className="td-dynamic-list">
                    {formSteps.map((step, idx) => (
                      <div key={idx} className="td-dynamic-row">
                        <span className="td-step-num">{idx + 1}.</span>
                        <input
                          type="text"
                          placeholder={`Step ${idx + 1} action...`}
                          value={step}
                          onChange={(e) => {
                            const updated = [...formSteps];
                            updated[idx] = e.target.value;
                            setFormSteps(updated);
                          }}
                          className="td-input-text"
                        />
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            className="td-btn-remove-row"
                            onClick={() => setFormSteps(formSteps.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="td-btn-add-row"
                      onClick={() => setFormSteps([...formSteps, ''])}
                    >
                      + Add Step
                    </button>
                  </div>
                </div>

                {/* Acceptance Criteria Builder */}
                <div className="td-form-group">
                  <label className="td-form-label">
                    Acceptance Criteria <span className="td-label-hint">(Pass/Fail Gate)</span>
                  </label>
                  <div className="td-dynamic-list">
                    {formAC.map((crit, idx) => (
                      <div key={idx} className="td-dynamic-row">
                        <span className="td-ac-check">□</span>
                        <input
                          type="text"
                          placeholder={`Acceptance criterion ${idx + 1}...`}
                          value={crit}
                          onChange={(e) => {
                            const updated = [...formAC];
                            updated[idx] = e.target.value;
                            setFormAC(updated);
                          }}
                          className="td-input-text"
                        />
                        {formAC.length > 1 && (
                          <button
                            type="button"
                            className="td-btn-remove-row"
                            onClick={() => setFormAC(formAC.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="td-btn-add-row"
                      onClick={() => setFormAC([...formAC, ''])}
                    >
                      + Add Acceptance Criterion
                    </button>
                  </div>
                </div>

                {/* Proposed Remediation */}
                <div className="td-form-group">
                  <label className="td-form-label">Proposed Fix / Automated Fence (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Implement Redis distributed lock and K6 latency check gate"
                    value={formRemediation}
                    onChange={(e) => setFormRemediation(e.target.value)}
                    className="td-input-text"
                  />
                </div>

                {/* External References & Links */}
                <div className="td-form-group">
                  <label className="td-form-label">External References & Links</label>
                  <div className="td-links-builder">
                    {formLinks.map((link, idx) => (
                      <div key={idx} className="td-link-chip-row">
                        <span className="td-link-icon">🔗</span>
                        <span className="td-link-text">{link.label}</span>
                        <span className="td-link-sub">({link.url})</span>
                        <button
                          type="button"
                          className="td-btn-delete-chip"
                          onClick={() => setFormLinks(formLinks.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {isAddingFormLink ? (
                      <div className="td-link-input-box">
                        <input
                          type="url"
                          placeholder="Paste URL (e.g. https://sentry.io/...)"
                          value={formLinkUrl}
                          onChange={(e) => {
                            setFormLinkUrl(e.target.value);
                            if (!formLinkLabel || formLinkLabel === formLinkUrl) {
                              setFormLinkLabel(e.target.value);
                            }
                          }}
                          className="td-input-text"
                        />
                        <input
                          type="text"
                          placeholder="Display Text (optional short label)"
                          value={formLinkLabel}
                          onChange={(e) => setFormLinkLabel(e.target.value)}
                          className="td-input-text"
                        />
                        <div className="td-link-input-actions">
                          <button
                            type="button"
                            className="td-btn-confirm-link"
                            onClick={handleAddFormLink}
                          >
                            Attach Link
                          </button>
                          <button
                            type="button"
                            className="td-btn-cancel-link"
                            onClick={() => setIsAddingFormLink(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="td-btn-add-link"
                        onClick={() => setIsAddingFormLink(true)}
                      >
                        + Add Links
                      </button>
                    )}
                  </div>
                </div>

                {/* Evidence & Media Attachments (Screenshots / Videos) */}
                <div
                  className="td-form-group"
                  onPaste={(e) => handlePasteEvent(e, 'form')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="td-form-label">
                      Evidence & Media (Screenshots / Video ≤ 5 min)
                    </label>
                    <span className="td-label-hint">Paste clipboard (Cmd+V) or drop files</span>
                  </div>

                  <div
                    className="td-media-dropzone"
                    onClick={() => {
                      const input = document.getElementById('td-form-media-file-input');
                      if (input) (input as HTMLInputElement).click();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('td-dropzone-active');
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('td-dropzone-active');
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('td-dropzone-active');
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const processed = await processUploadedFiles(e.dataTransfer.files);
                        setFormAttachments((prev) => [...prev, ...processed]);
                        triggerToast('success', 'Media Attached', `${processed.length} file(s) attached.`);
                      }
                    }}
                  >
                    <input
                      id="td-form-media-file-input"
                      type="file"
                      multiple
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileInputChange(e, 'form')}
                    />
                    <span className="td-dropzone-icon">📸</span>
                    <span className="td-dropzone-text">
                      Click to upload, drop media files, or paste clipboard screenshot (Cmd+V)
                    </span>
                    <span className="td-dropzone-hint">Supports PNG, JPG, WebP, MP4, WebM & MOV</span>
                  </div>

                  {/* Form Media Chips */}
                  {formAttachments.length > 0 && (
                    <div className="td-links-builder" style={{ marginTop: '8px' }}>
                      {formAttachments.map((att, idx) => (
                        <div key={idx} className="td-link-chip-row">
                          <span className="td-link-icon">{att.type === 'video' ? '🎬' : '🖼️'}</span>
                          <span className="td-link-text">{att.name}</span>
                          <span className="td-link-sub">
                            ({att.type === 'video' ? 'Video' : 'Screenshot'}
                            {att.size_bytes ? ` • ${(att.size_bytes / 1024).toFixed(0)}KB` : ''})
                          </span>
                          <button
                            type="button"
                            className="td-btn-delete-chip"
                            onClick={() => setFormAttachments(formAttachments.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form External Video Link Button */}
                  {isAddingFormMediaUrl ? (
                    <div className="td-link-input-box" style={{ marginTop: '8px' }}>
                      <input
                        type="url"
                        placeholder="Paste Loom / YouTube / Video URL (e.g. https://www.loom.com/share/...)"
                        value={formMediaUrl}
                        onChange={(e) => {
                          setFormMediaUrl(e.target.value);
                          if (!formMediaLabel) {
                            const vid = parseVideoEmbed(e.target.value);
                            if (vid.type === 'loom') setFormMediaLabel('Loom Recording');
                            else if (vid.type === 'youtube') setFormMediaLabel('YouTube Repro');
                          }
                        }}
                        className="td-input-text"
                      />
                      <input
                        type="text"
                        placeholder="Display Label (e.g. Safari Bug Repro)"
                        value={formMediaLabel}
                        onChange={(e) => setFormMediaLabel(e.target.value)}
                        className="td-input-text"
                      />
                      <div className="td-link-input-actions">
                        <button
                          type="button"
                          className="td-btn-confirm-link"
                          onClick={handleAddFormMediaUrl}
                        >
                          Attach Video
                        </button>
                        <button
                          type="button"
                          className="td-btn-cancel-link"
                          onClick={() => setIsAddingFormMediaUrl(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '6px' }}>
                      <button
                        type="button"
                        className="td-btn-add-link"
                        onClick={() => setIsAddingFormMediaUrl(true)}
                      >
                        + Add Loom / Video URL
                      </button>
                    </div>
                  )}
                </div>

                {/* Watcher notification list */}
                <div className="td-form-group">
                  <label className="td-form-label">Watcher Notification Emails (Optional)</label>
                  <input
                    type="text"
                    placeholder="Optional comma-separated emails (leave empty for zero watchers)"
                    value={formWatchers}
                    onChange={(e) => setFormWatchers(e.target.value)}
                    className="td-input-text"
                  />
                </div>

                {/* Form Buttons */}
                <div className="td-form-actions">
                  <button type="submit" className="td-btn-submit-ticket">
                    🚀 Publish Live Issue
                  </button>
                  <button
                    type="button"
                    className="td-btn-cancel-form"
                    onClick={() => setIsCreatingNew(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : activeIssue ? (
            /* ─────────────────────────────────────────────────────────────
               TICKET DETAIL INSPECTOR VIEW
               ───────────────────────────────────────────────────────────── */
            <div className="td-detail-view">
              {/* Ticket Top Meta Banner */}
              <div className="td-detail-header">
                <div className="td-detail-id-bar">
                  <span className="td-detail-id">{activeIssue.id}</span>
                  <div className="td-severity-dropdown-wrapper">
                    <button
                      type="button"
                      className="td-detail-severity-pill interactive"
                      style={{
                        color: SEVERITY_CONFIG[activeIssue.priority].color,
                        borderColor: SEVERITY_CONFIG[activeIssue.priority].color,
                        background: SEVERITY_CONFIG[activeIssue.priority].bg,
                      }}
                      onClick={() => setIsSeverityDropdownOpen(!isSeverityDropdownOpen)}
                      title="Click to change severity"
                    >
                      {SEVERITY_CONFIG[activeIssue.priority].label} ▾
                    </button>

                    {isSeverityDropdownOpen && (
                      <div className="td-severity-popover">
                        <div className="td-severity-popover-title">CHANGE SEVERITY</div>
                        {(Object.keys(SEVERITY_CONFIG) as PriorityLevel[]).map((pKey) => {
                          const conf = SEVERITY_CONFIG[pKey];
                          const isCurrent = activeIssue.priority === pKey;
                          return (
                            <button
                              key={pKey}
                              type="button"
                              className={`td-severity-popover-item ${isCurrent ? 'active' : ''}`}
                              onClick={() => handleChangeSeverity(pKey)}
                            >
                              <span
                                className="td-severity-menu-dot"
                                style={{ background: conf.color, boxShadow: `0 0 6px ${conf.color}` }}
                              />
                              <span className="td-severity-menu-label">{conf.label}</span>
                              {isCurrent && <span className="td-severity-menu-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span
                    className={`td-detail-state-pill ${
                      activeIssue.state === 'ARCHIVED' ? 'archived' : 'open'
                    }`}
                  >
                    {activeIssue.state}
                  </span>
                </div>

                {activeIssue.state === 'ARCHIVED' ? (
                  <button
                    type="button"
                    className="td-btn-reopen"
                    onClick={() => handleReopenTicket(activeIssue.id)}
                  >
                    ↺ Reopen Ticket
                  </button>
                ) : (
                  <button
                    type="button"
                    className="td-btn-blocker-toggle"
                    onClick={handleToggleBlockerState}
                  >
                    {activeIssue.blocker_active ? '⚠️ Manage Blocker' : '🚩 Flag as Blocker'}
                  </button>
                )}
              </div>

              {/* Title with In-Place Hover Edit */}
              <div className="td-title-container">
                {isEditingTitle ? (
                  <div className="td-title-edit-box">
                    <input
                      type="text"
                      value={titleEditInput}
                      onChange={(e) => setTitleEditInput(e.target.value)}
                      className="td-inline-title-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle();
                        if (e.key === 'Escape') setIsEditingTitle(false);
                      }}
                    />
                    <div className="td-inline-actions">
                      <button type="button" className="td-btn-inline-save" onClick={handleSaveTitle}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="td-btn-inline-cancel"
                        onClick={() => setIsEditingTitle(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="td-title-hover-row" onClick={handleStartEditingTitle}>
                    <h1 className="td-detail-title">{activeIssue.name}</h1>
                    <button
                      type="button"
                      className="td-btn-pencil-edit"
                      title="Click to edit title"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditingTitle();
                      }}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>

              {/* Platforms */}
              <div className="td-detail-platforms">
                {activeIssue.affected_platforms.map((p) => (
                  <span key={p} className="td-platform-tag">
                    {p}
                  </span>
                ))}
              </div>

              {/* Blocker Alert Banner / Management Console */}
              {isEditingBlocker ? (
                <div className="td-blocker-edit-box">
                  <h4>BLOCKER MANAGEMENT CONSOLE</h4>
                  <p>Declare or clear active deployment blockers for this ticket.</p>
                  <div className="td-blocker-inputs">
                    <label>Blocker Reason (if activating):</label>
                    <textarea
                      rows={2}
                      value={blockerInput}
                      onChange={(e) => setBlockerInput(e.target.value)}
                      placeholder="Reason why this issue completely blocks deployment or testing..."
                    />
                    <label>Resolution Notes (if clearing):</label>
                    <textarea
                      rows={2}
                      value={blockerResolvedInput}
                      onChange={(e) => setBlockerResolvedInput(e.target.value)}
                      placeholder="Details on the verification or workaround that clears the blocker..."
                    />
                  </div>
                  <div className="td-blocker-actions">
                    <button
                      type="button"
                      className="td-btn-activate-blocker"
                      onClick={() => handleSaveBlocker(true)}
                    >
                      🚩 Set as ACTIVE Blocker
                    </button>
                    <button
                      type="button"
                      className="td-btn-clear-blocker"
                      onClick={() => handleSaveBlocker(false)}
                    >
                      ✓ Resolve & Clear Blocker
                    </button>
                    <button
                      type="button"
                      className="td-btn-cancel-blocker"
                      onClick={() => setIsEditingBlocker(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                activeIssue.blocker_active && (
                  <div className="td-blocker-active-banner">
                    <div className="td-blocker-icon">⚠️</div>
                    <div className="td-blocker-body">
                      <strong>ACTIVE CRITICAL BLOCKER</strong>
                      <p>{activeIssue.blocker_text || 'Deployment and testing gated by this issue.'}</p>
                    </div>
                  </div>
                )
              )}

              {/* Summary Section with In-Place Edit (No X button) */}
              <div className="td-detail-section">
                <div className="td-section-label-row">
                  <h3 className="td-section-label">ISSUE SUMMARY</h3>
                  {!isEditingSummary && (
                    <button
                      type="button"
                      className="td-btn-section-pencil"
                      title="Edit summary"
                      onClick={handleStartEditingSummary}
                    >
                      ✎ Edit
                    </button>
                  )}
                </div>

                {isEditingSummary ? (
                  <div className="td-summary-edit-box">
                    <textarea
                      rows={4}
                      value={summaryEditInput}
                      onChange={(e) => setSummaryEditInput(e.target.value)}
                      className="td-inline-textarea"
                      autoFocus
                    />
                    <div className="td-inline-actions">
                      <button type="button" className="td-btn-inline-save" onClick={handleSaveSummary}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="td-btn-inline-cancel"
                        onClick={() => setIsEditingSummary(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="td-summary-text">
                    {activeIssue.description_text || 'No detailed summary provided.'}
                  </p>
                )}
              </div>

              {/* Steps to Reproduce with Hover Edit, Delete X & Add */}
              <div className="td-detail-section">
                <div className="td-section-label-row">
                  <h3 className="td-section-label">STEPS TO REPRODUCE</h3>
                  <button
                    type="button"
                    className="td-btn-section-add"
                    onClick={() => setIsAddingStep(true)}
                  >
                    + Add Step
                  </button>
                </div>

                <ol className="td-steps-list">
                  {(!activeIssue.steps_to_reproduce || activeIssue.steps_to_reproduce.length === 0) ? (
                    <li className="td-empty-item-notice">No steps defined. Click + Add Step above.</li>
                  ) : (
                    activeIssue.steps_to_reproduce.map((step, i) => (
                      <li key={i} className="td-step-item-row">
                        <span className="td-step-index">{i + 1}</span>
                        {editingStepIndex === i ? (
                          <div className="td-inline-row-edit">
                            <input
                              type="text"
                              value={stepEditInput}
                              onChange={(e) => setStepEditInput(e.target.value)}
                              className="td-inline-input"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveStep(i);
                                if (e.key === 'Escape') setEditingStepIndex(null);
                              }}
                            />
                            <div className="td-inline-actions-compact">
                              <button
                                type="button"
                                className="td-btn-inline-save"
                                onClick={() => handleSaveStep(i)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="td-btn-inline-cancel"
                                onClick={() => setEditingStepIndex(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="td-step-content-row">
                            <span className="td-step-text">{step}</span>
                            <div className="td-row-hover-actions">
                              <button
                                type="button"
                                className="td-btn-row-pencil"
                                title="Edit step"
                                onClick={() => handleStartEditingStep(i, step)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="td-btn-row-delete"
                                title="Delete step"
                                onClick={() => handleDeleteStep(i)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))
                  )}
                </ol>

                {isAddingStep && (
                  <div className="td-add-item-box">
                    <input
                      type="text"
                      placeholder="Describe new step..."
                      value={newStepInput}
                      onChange={(e) => setNewStepInput(e.target.value)}
                      className="td-inline-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddStepToActive();
                        if (e.key === 'Escape') setIsAddingStep(false);
                      }}
                    />
                    <div className="td-inline-actions">
                      <button
                        type="button"
                        className="td-btn-inline-save"
                        onClick={handleAddStepToActive}
                      >
                        Add Step
                      </button>
                      <button
                        type="button"
                        className="td-btn-inline-cancel"
                        onClick={() => setIsAddingStep(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Acceptance Criteria with Checkbox, Hover Edit, Delete X & Add */}
              <div className="td-detail-section">
                <div className="td-section-label-row">
                  <h3 className="td-section-label">ACCEPTANCE CRITERIA</h3>
                  <div className="td-ac-head-right">
                    <span className="td-ac-count">
                      {activeIssue.acceptance_criteria.filter((a) => a.done).length} /{' '}
                      {activeIssue.acceptance_criteria.length} SATISFIED
                    </span>
                    <button
                      type="button"
                      className="td-btn-section-add"
                      onClick={() => setIsAddingAc(true)}
                    >
                      + Add Criterion
                    </button>
                  </div>
                </div>

                <div className="td-ac-checklist">
                  {activeIssue.acceptance_criteria.length === 0 ? (
                    <div className="td-empty-item-notice">No criteria defined. Click + Add Criterion.</div>
                  ) : (
                    activeIssue.acceptance_criteria.map((crit) => (
                      <div
                        key={crit.id}
                        className={`td-ac-item ${crit.done ? 'checked' : ''}`}
                      >
                        <label className="td-ac-click-area">
                          <input
                            type="checkbox"
                            checked={crit.done}
                            onChange={() => handleToggleAC(crit.id)}
                            className="td-ac-checkbox"
                          />
                          <span className="td-ac-custom-box">{crit.done ? '✓' : ''}</span>
                        </label>

                        {editingAcId === crit.id ? (
                          <div className="td-inline-row-edit">
                            <input
                              type="text"
                              value={acEditInput}
                              onChange={(e) => setAcEditInput(e.target.value)}
                              className="td-inline-input"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveAc(crit.id);
                                if (e.key === 'Escape') setEditingAcId(null);
                              }}
                            />
                            <div className="td-inline-actions-compact">
                              <button
                                type="button"
                                className="td-btn-inline-save"
                                onClick={() => handleSaveAc(crit.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="td-btn-inline-cancel"
                                onClick={() => setEditingAcId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="td-ac-content-row">
                            <span
                              className="td-ac-title"
                              onClick={() => handleToggleAC(crit.id)}
                            >
                              {crit.text}
                            </span>
                            <div className="td-row-hover-actions">
                              <button
                                type="button"
                                className="td-btn-row-pencil"
                                title="Edit criterion"
                                onClick={() => handleStartEditingAc(crit.id, crit.text)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="td-btn-row-delete"
                                title="Delete criterion"
                                onClick={() => handleDeleteAc(crit.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {isAddingAc && (
                  <div className="td-add-item-box">
                    <input
                      type="text"
                      placeholder="e.g. Edge worker WebSocket retry ceiling capped at 120ms..."
                      value={newAcInput}
                      onChange={(e) => setNewAcInput(e.target.value)}
                      className="td-inline-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddAcToActive();
                        if (e.key === 'Escape') setIsAddingAc(false);
                      }}
                    />
                    <div className="td-inline-actions">
                      <button
                        type="button"
                        className="td-btn-inline-save"
                        onClick={handleAddAcToActive}
                      >
                        Add Criterion
                      </button>
                      <button
                        type="button"
                        className="td-btn-inline-cancel"
                        onClick={() => setIsAddingAc(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* External References & Links Section */}
              <div className="td-detail-section">
                <div className="td-section-label-row">
                  <h3 className="td-section-label">EXTERNAL REFERENCES & ARTIFACTS</h3>
                  <button
                    type="button"
                    className="td-btn-section-add"
                    onClick={() => setIsAddingDetailLink(true)}
                  >
                    + Add Link
                  </button>
                </div>

                <div className="td-links-display-grid">
                  {(!activeIssue.links || activeIssue.links.length === 0) ? (
                    <div className="td-empty-item-notice">No external links attached.</div>
                  ) : (
                    activeIssue.links.map((link) => (
                      <div key={link.id} className="td-link-badge-pill">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="td-link-anchor"
                          title={link.url}
                        >
                          <span className="td-link-icon">🔗</span>
                          <span className="td-link-name">{link.label}</span>
                          <span className="td-link-external-arrow">↗</span>
                        </a>
                        <button
                          type="button"
                          className="td-btn-delete-link"
                          title="Remove link"
                          onClick={() => handleDeleteLinkFromActive(link.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {isAddingDetailLink && (
                  <form onSubmit={handleAddLinkToActive} className="td-link-input-box">
                    <input
                      type="url"
                      required
                      placeholder="Paste link URL (e.g. https://sentry.io/...)"
                      value={newDetailLinkUrl}
                      onChange={(e) => {
                        setNewDetailLinkUrl(e.target.value);
                        if (!newDetailLinkLabel || newDetailLinkLabel === newDetailLinkUrl) {
                          setNewDetailLinkLabel(e.target.value);
                        }
                      }}
                      className="td-input-text"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Display Text (optional, e.g. Sentry Issue #402)"
                      value={newDetailLinkLabel}
                      onChange={(e) => setNewDetailLinkLabel(e.target.value)}
                      className="td-input-text"
                    />
                    <div className="td-link-input-actions">
                      <button type="submit" className="td-btn-confirm-link">
                        Attach Link
                      </button>
                      <button
                        type="button"
                        className="td-btn-cancel-link"
                        onClick={() => setIsAddingDetailLink(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                 ATTACHED EVIDENCE & MEDIA (SCREENSHOTS & VIDEO CLIPS)
                 ───────────────────────────────────────────────────────────── */}
              <div
                className="td-detail-section"
                onPaste={(e) => handlePasteEvent(e, 'detail')}
              >
                <div className="td-section-label-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="td-section-label">ATTACHED EVIDENCE & MEDIA</h3>
                    <span className="td-ac-count">{activeIssue.attachments?.length || 0} ITEMS</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <label className="td-btn-section-add" style={{ cursor: 'pointer', margin: 0 }}>
                      + Upload File
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileInputChange(e, 'detail')}
                      />
                    </label>
                    <button
                      type="button"
                      className="td-btn-section-add"
                      onClick={() => setIsAddingDetailMedia(true)}
                    >
                      + Video Link
                    </button>
                  </div>
                </div>

                {/* Dropzone Hint */}
                <div
                  className="td-media-dropzone"
                  onClick={() => {
                    const input = document.getElementById('td-detail-media-file-input');
                    if (input) (input as HTMLInputElement).click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('td-dropzone-active');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('td-dropzone-active');
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('td-dropzone-active');
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const processed = await processUploadedFiles(e.dataTransfer.files);
                      handleAddMediaToActiveDirect(processed);
                    }
                  }}
                >
                  <input
                    id="td-detail-media-file-input"
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileInputChange(e, 'detail')}
                  />
                  <span className="td-dropzone-icon">📸</span>
                  <span className="td-dropzone-text">
                    Drag & drop screenshots or videos (≤ 5 min), paste clipboard (Cmd+V), or click to upload
                  </span>
                  <span className="td-dropzone-hint">Supports PNG, JPG, WebP, MP4, WebM, MOV & Loom embeds</span>
                </div>

                {/* Media Cards Grid */}
                {activeIssue.attachments && activeIssue.attachments.length > 0 && (
                  <div className="td-media-grid">
                    {activeIssue.attachments.map((att) => {
                      const vidInfo = parseVideoEmbed(att.url);
                      return (
                        <div key={att.id} className="td-media-card">
                          {att.type === 'image' && (
                            <div
                              className="td-media-thumb-wrap"
                              onClick={() => setLightboxMedia(att)}
                              title="Click to view full-screen lightbox"
                            >
                              <img src={att.url} alt={att.name} className="td-media-img-thumb" />
                              <div className="td-media-expand-overlay">
                                <span>🔍 View Fullscreen</span>
                              </div>
                            </div>
                          )}

                          {att.type === 'video' && (
                            <div className="td-video-player-wrap">
                              {vidInfo.type === 'loom' || vidInfo.type === 'youtube' ? (
                                <iframe
                                  src={vidInfo.embedUrl}
                                  title={att.name}
                                  className="td-video-iframe"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <>
                                  <video
                                    ref={(el) => {
                                      if (el) {
                                        el.muted = true;
                                        el.defaultMuted = true;
                                        const playPromise = el.play();
                                        if (playPromise !== undefined) {
                                          playPromise.catch(() => {});
                                        }
                                      }
                                    }}
                                    controls
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    preload="auto"
                                    poster={att.thumbnail_url || '/triage-desk/assets/TRIAGE.png'}
                                    className="td-video-element"
                                  >
                                    <source src={att.url} type="video/mp4" />
                                    <source src="/triage-desk/assets/triage.mp4" type="video/mp4" />
                                    <source src="/assets/triage.mp4" type="video/mp4" />
                                    <source src="/triage-desk/assets/triage.webm" type="video/webm" />
                                    <source src="/assets/triage.webm" type="video/webm" />
                                    <img
                                      src={att.thumbnail_url || '/triage-desk/assets/TRIAGE.png'}
                                      alt={att.name || 'BuildGhost Triage Logo Fallback'}
                                      className="td-video-fallback-img"
                                    />
                                  </video>
                                </>
                              )}
                            </div>
                          )}

                          {att.type === 'link' && (
                            <div className="td-media-thumb-wrap" style={{ background: '#091512' }}>
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#5ef0f0',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span style={{ fontSize: '1.5rem' }}>🔗</span>
                                <span style={{ fontSize: '0.7rem' }}>External Evidence</span>
                              </a>
                            </div>
                          )}

                          <div className="td-media-meta">
                            <div className="td-media-info">
                              <span className="td-media-name">{att.name || 'Evidence Artifact'}</span>
                              <span className="td-media-sub">
                                {att.type === 'video' ? '🎬 Video Clip' : '🖼️ Screenshot'}
                                {att.size_bytes ? ` • ${(att.size_bytes / (1024 * 1024)).toFixed(1)}MB` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="td-btn-delete-media"
                              title="Remove attachment"
                              onClick={() => handleDeleteMediaFromActive(att.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Video / Loom Link Input Box */}
                {isAddingDetailMedia && (
                  <form
                    onSubmit={handleAddExternalMediaToActive}
                    className="td-link-input-box"
                    style={{ marginTop: '12px' }}
                  >
                    <input
                      type="url"
                      required
                      placeholder="Paste Loom URL, YouTube URL, or MP4 link (e.g. https://www.loom.com/share/...)"
                      value={newDetailMediaUrl}
                      onChange={(e) => {
                        setNewDetailMediaUrl(e.target.value);
                        if (!newDetailMediaLabel) {
                          const vid = parseVideoEmbed(e.target.value);
                          if (vid.type === 'loom') setNewDetailMediaLabel('Loom Recording');
                          else if (vid.type === 'youtube') setNewDetailMediaLabel('YouTube Repro');
                        }
                      }}
                      className="td-input-text"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Display Label (e.g. Bug Repro Clip - Safari 17)"
                      value={newDetailMediaLabel}
                      onChange={(e) => setNewDetailMediaLabel(e.target.value)}
                      className="td-input-text"
                    />
                    <div className="td-link-input-actions">
                      <button type="submit" className="td-btn-confirm-link">
                        Attach Media
                      </button>
                      <button
                        type="button"
                        className="td-btn-cancel-link"
                        onClick={() => setIsAddingDetailMedia(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Automated Remediation Fence */}
              {activeIssue.remediation && (
                <div className="td-detail-section">
                  <h3 className="td-section-label">AUTOMATED REMEDIATION & CI FENCE</h3>
                  <div className="td-remediation-box">
                    <span className="td-remediation-icon">⚡</span>
                    <p>{activeIssue.remediation}</p>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                 COMMENT STREAM & @MENTIONS (WITH COMMENT DELETION X)
                 ───────────────────────────────────────────────────────────── */}
              <div className="td-detail-section td-comments-section">
                <div className="td-section-label-row">
                  <h3 className="td-section-label">INTERACTIVE DISPATCH & COMMENT STREAM</h3>
                  <span className="td-ac-count">{activeIssue.comments?.length || 0} NOTES</span>
                </div>

                {/* Comment List */}
                <div className="td-comment-stream">
                  {(!activeIssue.comments || activeIssue.comments.length === 0) ? (
                    <div className="td-empty-comments">
                      <p>No comments or notes posted yet. Start the stream below.</p>
                    </div>
                  ) : (
                    groupCommentsForFeed(activeIssue.comments).map((item) => {
                      if (item.type === 'single') {
                        const comment = item.comment;
                        return (
                          <div
                            key={comment.id}
                            className={`td-comment-card ${comment.is_system ? 'system-comment' : ''}`}
                          >
                            <div className="td-comment-top">
                              <div className="td-comment-author-badge">
                                <div className={`td-avatar ${comment.is_system ? 'system-avatar' : ''}`}>
                                  {comment.is_system ? '⚙' : comment.author.charAt(0).toUpperCase()}
                                </div>
                                <span className="td-author-name">{comment.author}</span>
                                {comment.author_email && (
                                  <span className="td-author-email">&lt;{comment.author_email}&gt;</span>
                                )}
                                {comment.is_system && (
                                  <span className="td-system-tag">SYSTEM EVENT</span>
                                )}
                              </div>

                              <div className="td-comment-right-actions">
                                <span className="td-comment-time">
                                  {new Date(comment.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <button
                                  type="button"
                                  className="td-btn-delete-comment"
                                  title="Delete comment"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            <div className="td-comment-body">
                              <p>{comment.text}</p>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="td-comment-media-row">
                                  {comment.attachments.map((att) => {
                                    if (att.type === 'image') {
                                      return (
                                        <img
                                          key={att.id}
                                          src={att.url}
                                          alt={att.name || 'Screenshot'}
                                          className="td-comment-media-thumb"
                                          title={`${att.name} (Click to expand)`}
                                          onClick={() => setLightboxMedia(att)}
                                        />
                                      );
                                    }
                                    return (
                                      <div key={att.id} className="td-pending-chip">
                                        <span>🎬 {att.name || 'Video Clip'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // System Event Stack (Multiple consecutive system events)
                      const isExpanded = !!expandedSystemStacks[item.id];
                      const stack = item.comments; // Chronological order [oldest, ..., latest]
                      const latestComment = stack[stack.length - 1];
                      const deckLayersCount = Math.min(stack.length - 1, 5);

                      return (
                        <div key={item.id} className="td-system-event-stack-wrapper">
                          {!isExpanded ? (
                            /* Collapsed: Deck of cards visual with latest on top */
                            <div
                              className="td-system-stack-collapsed"
                              style={{ marginBottom: `${deckLayersCount * 5 + 4}px` }}
                            >
                              {/* Layered deck cards underneath */}
                              {Array.from({ length: deckLayersCount }).map((_, idx) => (
                                <div
                                  key={`layer-${idx}`}
                                  className={`td-stack-deck-layer td-stack-deck-layer-${idx + 1}`}
                                  style={{
                                    bottom: `-${(idx + 1) * 4}px`,
                                    left: `${(idx + 1) * 6}px`,
                                    right: `${(idx + 1) * 6}px`,
                                    zIndex: 5 - idx,
                                  }}
                                />
                              ))}

                              {/* Top card showing latest event */}
                              <div className="td-comment-card system-comment td-stack-top-card">
                                <div className="td-comment-top">
                                  <div className="td-comment-author-badge">
                                    <div className="td-avatar system-avatar">⚙</div>
                                    <span className="td-author-name">{latestComment.author}</span>
                                    <span className="td-system-tag">SYSTEM EVENT</span>
                                    <span className="td-system-stack-badge">
                                      <span className="td-stack-icon">☷</span> {stack.length} EVENTS STACKED
                                    </span>
                                  </div>

                                  <div className="td-comment-right-actions">
                                    <span className="td-comment-time">
                                      {new Date(latestComment.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <button
                                      type="button"
                                      className="td-btn-stack-toggle"
                                      onClick={() => toggleSystemStack(item.id)}
                                      title={`Expand all ${stack.length} system events`}
                                    >
                                      <span>▾ Expand Log ({stack.length})</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="td-btn-delete-comment"
                                      title="Delete event"
                                      onClick={() => handleDeleteComment(latestComment.id)}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                <div className="td-comment-body">
                                  <p>{latestComment.text}</p>
                                </div>

                                <div
                                  className="td-stack-footer-hint"
                                  onClick={() => toggleSystemStack(item.id)}
                                  role="button"
                                  tabIndex={0}
                                  title="Click to expand full audit log"
                                >
                                  <span className="td-stack-deck-hint-text">
                                    ▾ +{stack.length - 1} earlier system event{stack.length - 1 > 1 ? 's' : ''} in stack • Click to expand
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Expanded: Accordion with collapse arrow at the TOP */
                            <div className="td-system-stack-expanded">
                              <div className="td-system-stack-header">
                                <div className="td-stack-header-left">
                                  <div className="td-avatar system-avatar">⚙</div>
                                  <span className="td-stack-header-title">SYSTEM AUDIT TRAIL</span>
                                  <span className="td-system-stack-badge">
                                    {stack.length} EVENTS
                                  </span>
                                </div>
                                <div className="td-stack-header-right">
                                  <button
                                    type="button"
                                    className="td-btn-stack-toggle active"
                                    onClick={() => toggleSystemStack(item.id)}
                                    title="Collapse system event stack"
                                  >
                                    <span>▲ Collapse Log</span>
                                  </button>
                                </div>
                              </div>

                              <div className="td-system-stack-list">
                                {[...stack].reverse().map((eventComment, idx) => (
                                  <div
                                    key={eventComment.id}
                                    className={`td-system-stack-item ${idx === 0 ? 'is-latest' : ''}`}
                                  >
                                    <div className="td-stack-item-track">
                                      <span className="td-stack-item-bullet">{idx === 0 ? '●' : '○'}</span>
                                      {idx < stack.length - 1 && <span className="td-stack-item-line" />}
                                    </div>

                                    <div className="td-stack-item-content">
                                      <div className="td-comment-top">
                                        <div className="td-comment-author-badge">
                                          <span className="td-author-name">{eventComment.author}</span>
                                          {idx === 0 && <span className="td-badge-latest-tag">LATEST</span>}
                                          <span className="td-system-tag">SYSTEM EVENT</span>
                                        </div>
                                        <div className="td-comment-right-actions">
                                          <span className="td-comment-time">
                                            {new Date(eventComment.timestamp).toLocaleTimeString([], {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                          <button
                                            type="button"
                                            className="td-btn-delete-comment"
                                            title="Delete event"
                                            onClick={() => handleDeleteComment(eventComment.id)}
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>
                                      <div className="td-comment-body">
                                        <p>{eventComment.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment Input Form */}
                <form
                  onSubmit={handlePostComment}
                  className="td-comment-composer"
                  onPaste={(e) => handlePasteEvent(e, 'comment')}
                >
                  <div className="td-mention-quick-bar">
                    <span className="td-mention-label">Quick Mention:</span>
                    {['DevOps', 'QA', 'Backend', 'Lead', 'Security'].map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        className="td-btn-quick-mention"
                        onClick={() => handleInsertMention(handle)}
                      >
                        @{handle}
                      </button>
                    ))}
                  </div>

                  <div className="td-composer-row">
                    <textarea
                      rows={2}
                      placeholder="Add dispatch note or paste screenshot (Cmd+V)… (Type @ to mention)"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="td-comment-textarea"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label
                        className="td-btn-section-add"
                        style={{
                          cursor: 'pointer',
                          margin: 0,
                          textAlign: 'center',
                          padding: '0.45rem 0.65rem',
                          background: 'rgba(255,255,255,0.05)',
                        }}
                        title="Attach screenshot or short video clip"
                      >
                        📎 Media
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/mp4,video/webm,video/quicktime"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileInputChange(e, 'comment')}
                        />
                      </label>
                      <button type="submit" className="td-btn-post-comment">
                        Dispatch Note ↗
                      </button>
                    </div>
                  </div>

                  {/* Pending Comment Media Chips */}
                  {commentAttachments.length > 0 && (
                    <div className="td-comment-input-bar">
                      <div className="td-comment-pending-media">
                        <span style={{ fontSize: '0.62rem', color: '#9eadab' }}>Attached to Note:</span>
                        {commentAttachments.map((att, idx) => (
                          <div key={idx} className="td-pending-chip">
                            <span>{att.type === 'video' ? '🎬' : '🖼️'} {att.name}</span>
                            <button
                              type="button"
                              className="td-pending-chip-remove"
                              onClick={() => setCommentAttachments(commentAttachments.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <div className="td-empty-center">
              <div className="td-empty-center-card">
                <div className="td-empty-center-icon">📋</div>
                <h3 className="td-empty-center-title">BuildGhost Triage Desk</h3>
                <p className="td-empty-center-desc">
                  Real-time engineering triage console designed to eliminate defect ambiguity, isolate blockers, and streamline acceptance gates.
                </p>
                <div className="td-empty-center-actions">
                  <button
                    type="button"
                    className="td-btn-create-demo"
                    onClick={handleCreateDemoTicket}
                  >
                    ★ Create Demo Portfolio Ticket
                  </button>
                  <button
                    type="button"
                    className="td-btn-create-empty"
                    onClick={() => requireIdentity(() => setIsCreatingNew(true))}
                  >
                    + Create New Issue
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ═══════════════════════════════════════════════════════════════════
            COLUMN 3: RIGHT RAIL (280px) — Creator, Watchers & Telemetry
            ═══════════════════════════════════════════════════════════════════ */}
        <aside className="td-col-right">
          {activeIssue ? (
            <>
              {/* Creator Card */}
              <div className="td-right-card">
                <span className="td-card-eyebrow">TICKET CREATOR</span>
                <div className="td-creator-info">
                  <div className="td-creator-avatar">
                    {(activeIssue.creator_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="td-creator-name">{activeIssue.creator_name || 'DevOps Engineer'}</h5>
                    <span className="td-creator-email">{activeIssue.creator_email || 'devops@buildghost.site'}</span>
                  </div>
                </div>
                <div className="td-creator-date">
                  <span>Reported:</span>{' '}
                  {new Date(activeIssue.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Watchers Section */}
              <div className="td-right-card">
                <div className="td-watchers-header">
                  <span className="td-card-eyebrow">SUBSCRIBED WATCHERS</span>
                  <span className="td-count-badge">{activeIssue.watchers.length}</span>
                </div>

                {activeIssue.watchers.length === 0 ? (
                  <div className="td-empty-watchers-box">
                    <span className="td-dim-text">
                      Zero watchers subscribed. Enter your email below or click <em>'Watch this Ticket'</em> to opt-in for email alerts.
                    </span>
                  </div>
                ) : (
                  <div className="td-watchers-list">
                    {activeIssue.watchers.map((email, idx) => (
                      <div key={idx} className="td-watcher-item">
                        <span className="td-watcher-bullet">●</span>
                        <span className="td-watcher-email" title={email}>
                          {email}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Watch Ticket Button */}
                <button
                  type="button"
                  className={`td-btn-watch-ticket ${
                    identity?.email && activeIssue.watchers.includes(identity.email) ? 'active' : ''
                  }`}
                  onClick={handleToggleMyWatch}
                >
                  {identity?.email && activeIssue.watchers.includes(identity.email)
                    ? '✓ You are Watching Ticket'
                    : '＋ Watch this Ticket'}
                </button>

                {/* Add Watcher Form */}
                <form onSubmit={handleAddWatcher} className="td-add-watcher-form">
                  <input
                    type="email"
                    placeholder="Enter email to watch…"
                    value={newWatcherInput}
                    onChange={(e) => setNewWatcherInput(e.target.value)}
                    className="td-watcher-input"
                  />
                  <button type="submit" className="td-btn-add-watcher">
                    Add
                  </button>
                </form>
              </div>

              {/* Telemetry & System Links */}
              <div className="td-right-card td-telemetry-card">
                <span className="td-card-eyebrow">DISPATCH ENGINE</span>
                <div className="td-telemetry-stat">
                  <span>Backend:</span> <strong>Plane SO API</strong>
                </div>
                <div className="td-telemetry-stat">
                  <span>Email Delivery:</span>{' '}
                  <strong style={{ color: isEmailSafeMode ? '#f5c778' : '#00ff9d' }}>
                    {isEmailSafeMode ? '🛡️ Safe Mode (Admin Only)' : '📡 Live Broadcast (All Watchers)'}
                  </strong>
                </div>
                <div className="td-telemetry-stat">
                  <span>Sender:</span> <strong>noreply@buildghost.site</strong>
                </div>
                <div className="td-telemetry-stat">
                  <span>Mode:</span> <span className="td-mono-sub">Public Contributor</span>
                </div>

                {/* Admin-Only Controls */}
                {isAdmin && (
                  <div className="td-admin-reset-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      className="td-btn-factory-reset"
                      style={{
                        background: isEmailSafeMode ? 'rgba(245, 199, 120, 0.12)' : 'rgba(0, 255, 157, 0.12)',
                        borderColor: isEmailSafeMode ? 'rgba(245, 199, 120, 0.4)' : 'rgba(0, 255, 157, 0.4)',
                        color: isEmailSafeMode ? '#f5c778' : '#00ff9d',
                      }}
                      onClick={handleToggleEmailMode}
                      disabled={isTogglingEmailMode}
                      title="Toggle between admin-only test mode and live email broadcasting"
                    >
                      {isTogglingEmailMode
                        ? 'Updating Mode…'
                        : isEmailSafeMode
                        ? '🛡️ Safe Mode: ON (Click for Live Delivery)'
                        : '📡 Live Delivery: ON (Click for Safe Mode)'}
                    </button>
                    <button
                      type="button"
                      className="td-btn-factory-reset"
                      style={{ background: 'rgba(101, 231, 236, 0.12)', borderColor: 'rgba(101, 231, 236, 0.4)', color: '#65e7ec' }}
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail}
                    >
                      {isSendingTestEmail ? 'Sending…' : '✉ Test Email Gateway (Admin Only)'}
                    </button>
                    <button
                      type="button"
                      className="td-btn-factory-reset"
                      style={{ background: 'rgba(0, 255, 157, 0.12)', borderColor: 'rgba(0, 255, 157, 0.4)', color: '#00ff9d' }}
                      onClick={() => {
                        setCurrentPassInput('');
                        setNewPassInput('');
                        setConfirmPassInput('');
                        setPassChangeError('');
                        setShowPasscodeModal(true);
                      }}
                    >
                      🔐 Change Access Passcode
                    </button>
                    <button
                      type="button"
                      className="td-btn-factory-reset"
                      onClick={handleFactoryReset}
                      disabled={isResetting}
                    >
                      {isResetting ? 'Resetting…' : '⚠️ Factory Reset (Admin Only)'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="td-right-card">
              <span className="td-card-eyebrow">AWAITING SELECTION</span>
              <p className="td-dim-text">Select or create a ticket to inspect watchers and telemetry.</p>
              {isAdmin && (
                <div className="td-admin-reset-box" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="td-btn-factory-reset"
                    style={{
                      background: isEmailSafeMode ? 'rgba(245, 199, 120, 0.12)' : 'rgba(0, 255, 157, 0.12)',
                      borderColor: isEmailSafeMode ? 'rgba(245, 199, 120, 0.4)' : 'rgba(0, 255, 157, 0.4)',
                      color: isEmailSafeMode ? '#f5c778' : '#00ff9d',
                    }}
                    onClick={handleToggleEmailMode}
                    disabled={isTogglingEmailMode}
                    title="Toggle between admin-only test mode and live email broadcasting"
                  >
                    {isTogglingEmailMode
                      ? 'Updating Mode…'
                      : isEmailSafeMode
                      ? '🛡️ Safe Mode: ON (Click for Live Delivery)'
                      : '📡 Live Delivery: ON (Click for Safe Mode)'}
                  </button>
                  <button
                    type="button"
                    className="td-btn-factory-reset"
                    style={{ background: 'rgba(101, 231, 236, 0.12)', borderColor: 'rgba(101, 231, 236, 0.4)', color: '#65e7ec' }}
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestEmail}
                  >
                    {isSendingTestEmail ? 'Sending…' : '✉ Test Email Gateway (Admin Only)'}
                  </button>
                  <button
                    type="button"
                    className="td-btn-factory-reset"
                    style={{ background: 'rgba(0, 255, 157, 0.12)', borderColor: 'rgba(0, 255, 157, 0.4)', color: '#00ff9d' }}
                    onClick={() => {
                      setCurrentPassInput('');
                      setNewPassInput('');
                      setConfirmPassInput('');
                      setPassChangeError('');
                      setShowPasscodeModal(true);
                    }}
                  >
                    🔐 Change Access Passcode
                  </button>
                  <button
                    type="button"
                    className="td-btn-factory-reset"
                    onClick={handleFactoryReset}
                    disabled={isResetting}
                  >
                    {isResetting ? 'Resetting…' : '⚠️ Factory Reset (Admin Only)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ─── Contributor Identity Setup Modal (No Password) ───────────── */}
      {showIdentityModal && (
        <div className="td-modal-backdrop">
          <div className="td-modal-card td-identity-modal-card">
            <div className="td-identity-modal-header">
              <div className="td-avatar system-avatar">👤</div>
              <div>
                <span className="td-modal-tag">CONTRIBUTOR IDENTITY</span>
                <h3 className="td-modal-title">
                  {identity ? 'Update Identity' : 'Set Contributor Identity'}
                </h3>
              </div>
            </div>
            <p className="td-modal-desc">
              Enter your display name and email address to contribute notes, manage issues, and receive dispatch alerts.
            </p>

            <form onSubmit={handleSaveIdentity} className="td-identity-form">
              {identityError && <div className="td-identity-error">{identityError}</div>}

              <div className="td-form-group">
                <label className="td-form-label">
                  Display Name / Username <span className="td-req">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Jordan Taylor or dev_lead"
                  value={identityNameInput}
                  onChange={(e) => setIdentityNameInput(e.target.value)}
                  className="td-input-text"
                />
              </div>

              <div className="td-form-group">
                <label className="td-form-label">
                  Email Address <span className="td-req">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. engineer@example.com"
                  value={identityEmailInput}
                  onChange={(e) => setIdentityEmailInput(e.target.value)}
                  className="td-input-text"
                />
              </div>

              <div className="td-modal-actions">
                <button type="submit" className="td-btn-modal-confirm">
                  ✓ Save &amp; Continue
                </button>
                <button
                  type="button"
                  className="td-btn-modal-cancel"
                  onClick={() => {
                    setShowIdentityModal(false);
                    setPendingAction(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Archive Confirmation Modal ─────────────────────────────────── */}
      {showArchiveModal && (
        <div className="td-modal-backdrop">
          <div className="td-modal-card">
            <span className="td-modal-tag">ACCEPTANCE GATE VERIFIED</span>
            <h3 className="td-modal-title">Archive Ticket {pendingArchiveId}?</h3>
            <p className="td-modal-desc">
              All acceptance criteria have been marked as satisfied. Archiving moves this issue
              to the completed historical queue.
            </p>
            <div className="td-modal-actions">
              <button
                type="button"
                className="td-btn-modal-confirm"
                onClick={handleConfirmArchive}
              >
                ✓ Yes, Archive Ticket
              </button>
              <button
                type="button"
                className="td-btn-modal-cancel"
                onClick={() => {
                  setShowArchiveModal(false);
                  setPendingArchiveId(null);
                }}
              >
                Keep in Active Triage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Admin Passcode Management Modal ─────────────────────────────── */}
      {showPasscodeModal && (
        <div className="td-modal-backdrop">
          <div className="td-modal-card td-identity-modal-card">
            <div className="td-identity-modal-header">
              <div className="td-avatar system-avatar" style={{ background: '#00ff9d', color: '#030806' }}>🔐</div>
              <div>
                <span className="td-modal-tag" style={{ color: '#00ff9d' }}>ADMIN GATEWAY SECURITY</span>
                <h3 className="td-modal-title">Rotate Access Passcode</h3>
              </div>
            </div>

            <form onSubmit={handleChangePasscode} className="td-identity-form">
              <p className="td-modal-desc">
                Update the universal access passcode for the BuildGhost Triage Desk. Changes take effect immediately on the serverless gateway with zero-knowledge SHA-256 hash storage.
              </p>

              {passChangeError && (
                <div className="td-gate-error" style={{ marginBottom: '16px' }}>
                  <span className="td-gate-error-icon">⚠️</span>
                  <span>{passChangeError}</span>
                </div>
              )}

              <div className="td-form-group">
                <label className="td-form-label">Current Passcode *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current passcode…"
                  value={currentPassInput}
                  onChange={(e) => {
                    setCurrentPassInput(e.target.value);
                    if (passChangeError) setPassChangeError('');
                  }}
                  className="td-input-text"
                />
              </div>

              <div className="td-form-group">
                <label className="td-form-label">New Passcode (Min 4 chars) *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new passcode…"
                  value={newPassInput}
                  onChange={(e) => {
                    setNewPassInput(e.target.value);
                    if (passChangeError) setPassChangeError('');
                  }}
                  className="td-input-text"
                />
              </div>

              <div className="td-form-group">
                <label className="td-form-label">Confirm New Passcode *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new passcode…"
                  value={confirmPassInput}
                  onChange={(e) => {
                    setConfirmPassInput(e.target.value);
                    if (passChangeError) setPassChangeError('');
                  }}
                  className="td-input-text"
                />
              </div>

              <div className="td-modal-actions">
                <button
                  type="button"
                  className="td-btn-secondary"
                  onClick={() => setShowPasscodeModal(false)}
                  disabled={isUpdatingPasscode}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="td-btn-primary"
                  style={{ background: '#00ff9d', color: '#030806' }}
                  disabled={isUpdatingPasscode}
                >
                  {isUpdatingPasscode ? 'Updating Server…' : 'Save New Passcode ↗'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Demo Mode Footer CTA ────────────────────────────────────────── */}
      {isDemoMode && (
        <footer className="td-demo-footer-cta">
          <div className="td-demo-footer-inner">
            <span>
              Like this? See full case study on{' '}
              <a href="https://markrosenthal.site" target="_blank" rel="noopener noreferrer">
                markrosenthal.site
              </a>{' '}
              — Built in ∼4 hrs with Plane API proxy + Resend + Vercel
            </span>
          </div>
        </footer>
      )}

      {/* ─── Full-Screen Lightbox Modal for Screenshots ─────────────── */}
      {lightboxMedia && (
        <div
          className="td-lightbox-overlay"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="td-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="td-lightbox-title">
              <span>🖼️</span>
              <span>{lightboxMedia.name}</span>
              {lightboxMedia.size_bytes && (
                <span style={{ fontSize: '0.65rem', color: '#9eadab' }}>
                  ({(lightboxMedia.size_bytes / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>
            <button
              type="button"
              className="td-lightbox-close"
              onClick={() => setLightboxMedia(null)}
            >
              ✕ Close
            </button>
          </div>

          <div className="td-lightbox-image-wrap" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxMedia.url}
              alt={lightboxMedia.name}
              className="td-lightbox-img"
            />
          </div>
        </div>
      )}

      {/* ─── Sequential Toast Queue (Top-Right Offset 20px) ─────────────── */}
      <div className="td-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`td-toast-card ${toast.type}`}>
            <div className="td-toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'alert' && '⚠️'}
              {toast.type === 'warning' && '!'}
              {toast.type === 'info' && '●'}
            </div>
            <div className="td-toast-content">
              <h5 className="td-toast-title">{toast.title}</h5>
              {toast.description && <p className="td-toast-desc">{toast.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TriageDeskPage;
