import React, { useState, useMemo, useEffect } from 'react';
import { 
  categoriesTree as getCategoriesTree, 
  searchIndex,
  getCategoryData
} from '../data/categories';
import { CategoryItem, CategoryNode } from '../types';
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Layers,
  LayoutGrid,
  ArrowRight,
  ChevronLeft,
  ChevronsUpDown,
  Loader2,
  Bot,
  Lock
} from 'lucide-react';
import { 
  Accordion as AccordionOriginal, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from './ui/accordion';

const Accordion = AccordionOriginal as any;
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Separator } from './ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { LogOut, Settings, KeyRound } from 'lucide-react';
import AIPanel from './AIPanel';

import qesRisksRaw from '../data/qes-risks.json';
import qesSubDetailsRaw from '../data/qes-sub-details.json';

const qesRisks: Record<string, { Q: string, E: string, S: string }> = qesRisksRaw;

interface SubItem {
  code: string;
  name: string;
  risk: string;
}

interface PrecisionDetails {
  Q: SubItem[];
  E: SubItem[];
  S: SubItem[];
}

const qesSubDetails = qesSubDetailsRaw as unknown as Record<string, PrecisionDetails>;

const CategoryExplorer: React.FC = () => {
  const { authState, subscription, logout } = useAuth();
  const isReadOnly = authState.user?.permissionDetails?.['范围检索权限'] === '只读';
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem('certMatch_explorer_searchTerm') || '';
    } catch {
      return '';
    }
  });
  const [selectedMajorId, setSelectedMajorId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('certMatch_explorer_selectedMajorId') || '01';
    } catch {
      return '01';
    }
  });
  const [selectedMediumId, setSelectedMediumId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('certMatch_explorer_selectedMediumId') || null;
    } catch {
      return null;
    }
  });
  const [selectedSmallId, setSelectedSmallId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('certMatch_explorer_selectedSmallId') || null;
    } catch {
      return null;
    }
  });
  const [currentCheckMajorId, setCurrentCheckMajorId] = useState(() => {
    try {
      return localStorage.getItem('certMatch_explorer_currentCheckMajorId') || '01';
    } catch {
      return '01';
    }
  });
  const [isApproved, setIsApproved] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('certMatch_explorer_isApproved');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('certMatch_explorer_expandedAccordions');
      return saved ? JSON.parse(saved) : ['01'];
    } catch {
      return ['01'];
    }
  });
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [dataReady, setDataReady] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [showExitAnimation, setShowExitAnimation] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isAiUpgradeModalOpen, setIsAiUpgradeModalOpen] = useState(false);
  const [currentQueriedCode, setCurrentQueriedCode] = useState<string | null>(null);

  // Network connection status
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  // Caching effects
  useEffect(() => {
    try {
      localStorage.setItem('certMatch_explorer_searchTerm', searchTerm);
    } catch (e) {}
  }, [searchTerm]);

  useEffect(() => {
    try {
      if (selectedMajorId) {
        localStorage.setItem('certMatch_explorer_selectedMajorId', selectedMajorId);
      } else {
        localStorage.removeItem('certMatch_explorer_selectedMajorId');
      }
    } catch (e) {}
  }, [selectedMajorId]);

  useEffect(() => {
    try {
      if (selectedMediumId) {
        localStorage.setItem('certMatch_explorer_selectedMediumId', selectedMediumId);
      } else {
        localStorage.removeItem('certMatch_explorer_selectedMediumId');
      }
    } catch (e) {}
  }, [selectedMediumId]);

  useEffect(() => {
    try {
      if (selectedSmallId) {
        localStorage.setItem('certMatch_explorer_selectedSmallId', selectedSmallId);
      } else {
        localStorage.removeItem('certMatch_explorer_selectedSmallId');
      }
    } catch (e) {}
  }, [selectedSmallId]);

  useEffect(() => {
    try {
      localStorage.setItem('certMatch_explorer_currentCheckMajorId', currentCheckMajorId);
    } catch (e) {}
  }, [currentCheckMajorId]);

  useEffect(() => {
    try {
      localStorage.setItem('certMatch_explorer_isApproved', JSON.stringify(isApproved));
    } catch (e) {}
  }, [isApproved]);

  useEffect(() => {
    try {
      localStorage.setItem('certMatch_explorer_expandedAccordions', JSON.stringify(expandedAccordions));
    } catch (e) {}
  }, [expandedAccordions]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize data deferred to allow initial paint
  useEffect(() => {
    const timer = setTimeout(() => setDataReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const sortedCategoriesTree = useMemo(() => {
    try {
      if (!dataReady) return [];
      const tree = (typeof getCategoriesTree === 'function' ? (getCategoriesTree as any)() : getCategoriesTree) as CategoryNode[];
      return [...(tree || [])].sort((a, b) => (a.majorId || '').localeCompare(b.majorId || ''));
    } catch (e) {
      console.error("Tree sort error:", e);
      return [];
    }
  }, [dataReady]);

  // All matching item IDs in order
  const allMatchesList = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    const orderedMatches: string[] = [];
    
    // Create a deterministic order based on the tree
    sortedCategoriesTree.forEach(major => {
      if ((major.name || '').toLowerCase().includes(term) || (major.description && major.description.toLowerCase().includes(term))) {
        orderedMatches.push(major.majorId);
      }
      
      (major.children || []).forEach(medium => {
        if ((medium.name || '').toLowerCase().includes(term) || (medium.description && medium.description.toLowerCase().includes(term))) {
          orderedMatches.push(medium.mediumId);
        }
        
        (medium.children || []).forEach(small => {
          const combinedText = `${small.name} ${small.description || ''} ${(small.includes || []).join(' ')} ${(small.excludes || []).join(' ')}`.toLowerCase();
          if (combinedText.includes(term)) {
            orderedMatches.push(small.smallId);
          }
        });
      });
    });
    
    return orderedMatches;
  }, [searchTerm, sortedCategoriesTree]);

  // Handle jump navigation
  const jumpToMatch = React.useCallback((index: number) => {
    if (index < 0 || index >= allMatchesList.length) return;
    const matchId = allMatchesList[index];
    setCurrentMatchIndex(index);
    
    const parts = matchId.split('.');
    const targetMajorId = parts[0];

    // Ensure sidebar accordion is expanded
    setExpandedAccordions(prev => {
        if (!prev.includes(targetMajorId)) {
            return [...prev, targetMajorId];
        }
        return prev;
    });

    if (parts.length === 3) {
      setSelectedMajorId(targetMajorId);
      setSelectedMediumId(`${targetMajorId}.${parts[1]}`);
      setSelectedSmallId(matchId);
    } else if (parts.length === 2) {
      setSelectedMajorId(targetMajorId);
      setSelectedMediumId(matchId);
      setSelectedSmallId(null);
    } else {
      setSelectedMajorId(matchId);
      setSelectedMediumId(null);
      setSelectedSmallId(null);
    }
    
    setTimeout(() => {
        // Scroll main content
        scrollToId(matchId);
        
        // Scroll sidebar to the specific focused item
        const sidebarItem = document.getElementById(`side-${matchId}`);
        if (sidebarItem) {
            sidebarItem.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
        } else {
            // Fallback to major if specific item not found yet
            const sidebarMajor = document.getElementById(`side-${targetMajorId}`);
            if (sidebarMajor) {
                sidebarMajor.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                });
            }
        }
    }, 200);
  }, [allMatchesList]);

  const handleAiNavigate = React.useCallback((code: string) => {
    // Clear search scope immediately to ensure the entire tree is mounted natively
    setSearchTerm('');
    setCurrentMatchIndex(-1);

    const parts = code.split('.');
    const targetMajorId = parts[0];

    // Ensure sidebar accordion is expanded
    setExpandedAccordions(prev => {
        if (!prev.includes(targetMajorId)) {
            return [...prev, targetMajorId];
        }
        return prev;
    });

    if (parts.length === 3) {
      setSelectedMajorId(targetMajorId);
      setSelectedMediumId(`${targetMajorId}.${parts[1]}`);
      setSelectedSmallId(code);
    } else if (parts.length === 2) {
      setSelectedMajorId(targetMajorId);
      setSelectedMediumId(code);
      setSelectedSmallId(null);
    } else {
      setSelectedMajorId(code);
      setSelectedMediumId(null);
      setSelectedSmallId(null);
    }
    
    // Use extended timeout to ensure React's next repaint renders the full tree DOM before scrolling
    setTimeout(() => {
        // Scroll main content
        scrollToId(code);
        
        // Scroll sidebar to the specific focused item after a tiny delay to prevent simultaneous smooth scroll bug in Chromium
        setTimeout(() => {
            const sidebarItem = document.getElementById(`side-${code}`);
            if (sidebarItem) {
                sidebarItem.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                });
            } else {
                // Fallback to major if specific item not found yet
                const sidebarMajor = document.getElementById(`side-${targetMajorId}`);
                if (sidebarMajor) {
                    sidebarMajor.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center'
                    });
                }
            }
        }, 80);
    }, 250);
  }, []);

  // Auto-jump to first match when search results change
  useEffect(() => {
    if (searchTerm.trim() && allMatchesList.length > 0 && currentMatchIndex === -1) {
      jumpToMatch(0);
    }
  }, [searchTerm, allMatchesList, currentMatchIndex, jumpToMatch]);

  // Use pre-processed tree for structure
  const majorCategoriesMap = useMemo(() => {
    const map: Record<string, CategoryNode> = {};
    if (!dataReady) return map;
    sortedCategoriesTree.forEach(node => {
      if (node?.majorId) map[node.majorId] = node;
    });
    return map;
  }, [sortedCategoriesTree, dataReady]);

  const majorIds = useMemo(() => {
    if (!dataReady) return [];
    return sortedCategoriesTree.map(node => node?.majorId).filter(Boolean);
  }, [sortedCategoriesTree, dataReady]);

  const majorInfo = useMemo(() => {
    if (!selectedMajorId) return null;
    return majorCategoriesMap[selectedMajorId] || null;
  }, [selectedMajorId, majorCategoriesMap]);

  const selectedInfo = useMemo(() => {
    if (!majorInfo) return null;
    if (selectedSmallId && selectedMediumId) {
      const med = (majorInfo.children || []).find(m => m.mediumId === selectedMediumId);
      const small = (med?.children || []).find(s => s.smallId === selectedSmallId);
      if (small) return small;
    }
    if (selectedMediumId) {
      const med = (majorInfo.children || []).find(m => m.mediumId === selectedMediumId);
      if (med) return med;
    }
    return majorInfo;
  }, [majorInfo, selectedMediumId, selectedSmallId]);

  // Use pre-processed search index for lightning fast search
  const matchedIds = useMemo(() => {
    if (!dataReady || !searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const matches = new Set<string>();
    
    try {
      const index = searchIndex;
      (index || []).forEach((idx:any) => {
        if (!idx) return;
        const searchContent = idx.text || idx.text_unit || '';
        if (searchContent.toLowerCase().includes(term)) {
          matches.add(idx.id);
          
          // Ensure parents are included to show the path
          if (idx.smallId) {
            const parts = idx.smallId.split('.');
            matches.add(parts[0]);
            matches.add(`${parts[0]}.${parts[1]}`);
            matches.add(idx.smallId);
          } else if (idx.mediumId) {
            const parts = idx.mediumId.split('.');
            matches.add(parts[0]);
            matches.add(idx.mediumId);
          } else {
            matches.add(idx.majorId);
          }
        }
      });
    } catch(e) { console.error("Search error:", e); }
    return matches;
  }, [searchTerm, dataReady]);

  // Sync directory with current match index
  useEffect(() => {
    if (searchTerm && currentMatchIndex !== -1) {
      const matchId = allMatchesList[currentMatchIndex];
      const parts = matchId.split('.');
      if (parts.length === 3) {
        setSelectedMajorId(parts[0]);
        setSelectedMediumId(`${parts[0]}.${parts[1]}`);
        setSelectedSmallId(matchId);
      } else if (parts.length === 2) {
        setSelectedMajorId(parts[0]);
        setSelectedMediumId(matchId);
        setSelectedSmallId(null);
      } else {
        setSelectedMajorId(matchId);
        setSelectedMediumId(null);
        setSelectedSmallId(null);
      }
    }
  }, [currentMatchIndex, searchTerm, allMatchesList]);

  useEffect(() => {
    if (searchTerm && matchedIds) {
      // Auto-expand all matching major categories
      const matchingMajors = sortedCategoriesTree
        .filter(n => matchedIds.has(n.majorId))
        .map(n => n.majorId);
      setExpandedAccordions(matchingMajors);
    } else {
      // Auto-close others, keep selected one open
      setExpandedAccordions(selectedMajorId ? [selectedMajorId] : []);
    }
  }, [searchTerm, matchedIds, selectedMajorId, sortedCategoriesTree]);

  const scrollToId = (id: string) => {
    const parts = id.split('.');
    if (parts.length === 1) {
      let attempts = 0;
      const tryScrollTop = () => {
        const topElement = document.getElementById('content-top');
        if (topElement) {
          topElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (attempts < 10) {
          attempts++;
          setTimeout(tryScrollTop, 50);
        }
      };
      tryScrollTop();
      return;
    }
    
    let attempts = 0;
    const tryScroll = () => {
      const element = document.getElementById(`row-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (attempts < 15) {
        attempts++;
        setTimeout(tryScroll, 50);
      } else {
        console.warn(`[Scroll] Row element with ID "row-${id}" not found after several attempts.`);
      }
    };
    tryScroll();
  };

  const handleApprove = () => {
    setIsApproved(prev => ({ ...prev, [currentCheckMajorId]: true }));
  };

  const handleNext = (nextId: string) => {
    if (!nextId) return;
    const trimmed = nextId.trim();
    setCurrentQueriedCode(trimmed);
    
    // Clean trailing asterisks and spaces
    const cleanCode = trimmed.replace(/\*+$/, '');
    
    // Split by slash to find the base category code (e.g., 18.06.00/1 -> 18.06.00)
    let baseCode = cleanCode;
    if (cleanCode.includes('/')) {
      baseCode = cleanCode.split('/')[0];
    }
    
    const parts = baseCode.split('.');
    const targetMajorId = parts[0];
    
    // Ensure sidebar accordion is expanded
    setExpandedAccordions(prev => {
      if (!prev.includes(targetMajorId)) {
        return [...prev, targetMajorId];
      }
      return prev;
    });
    
    if (parts.length === 3) {
      setCurrentCheckMajorId(targetMajorId);
      setSelectedMajorId(targetMajorId);
      setSelectedMediumId(`${targetMajorId}.${parts[1]}`);
      setSelectedSmallId(baseCode);
      setTimeout(() => scrollToId(baseCode), 100);
    } else if (parts.length === 2) {
      setCurrentCheckMajorId(targetMajorId);
      setSelectedMajorId(targetMajorId);
      setSelectedMediumId(baseCode);
      setSelectedSmallId(null);
      setTimeout(() => scrollToId(baseCode), 100);
    } else {
      setCurrentCheckMajorId(baseCode);
      setSelectedMajorId(baseCode);
      setSelectedMediumId(null);
      setSelectedSmallId(null);
      setTimeout(() => scrollToId(baseCode), 100);
    }
  };

  const highlightText = (text: string | undefined | null, highlight: string, id?: string) => {
    if (!text) return text;
    if (!highlight || !highlight.trim()) return text;
    
    const isCurrentJump = currentMatchIndex !== -1 && allMatchesList[currentMatchIndex] === id;
    
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark 
              key={i} 
              className={cn(
                "rounded-sm px-0.5 transition-colors",
                isCurrentJump ? "bg-brand-blue text-white" : "bg-yellow-200 text-yellow-900"
              )}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const highlightList = (list: string[] | undefined, highlight: string) => {
    if (!list) return null;
    return (
      <ul className="grid grid-cols-1 gap-1">
        {list.map((item, i) => (
          <li key={i} className="text-xs flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
            <span>{highlightText(item, highlight)}</span>
          </li>
        ))}
      </ul>
    );
  };

  const getRisk = (code: string | null) => {
    if (!code) return null;
    
    // Clean trailing asterisk and spaces
    const cleanCode = code.trim().replace(/\*+$/, '');
    
    // 1. Direct match in qesRisks
    const direct = qesRisks[cleanCode];
    if (direct) {
      if (cleanCode.includes('/')) {
        const baseCode = cleanCode.split('/')[0];
        const baseRisk = qesRisks[baseCode];
        if (baseRisk) {
          // Inherit base code results if missing or override
          return {
            Q: direct.Q || baseRisk.Q,
            E: direct.E || baseRisk.E,
            S: direct.S || baseRisk.S
          };
        }
      }
      return direct;
    }
    
    // 2. Slashed code fallback (e.g. 18.06.00/1* -> 18.06.00)
    if (cleanCode.includes('/')) {
      const baseCode = cleanCode.split('/')[0];
      const baseRisk = qesRisks[baseCode];
      if (baseRisk) {
        return baseRisk;
      }
    }
    
    return null;
  };

  const currentRisk = getRisk(currentQueriedCode) || 
                      getRisk(selectedSmallId) || 
                      getRisk(selectedMediumId) || 
                      getRisk(selectedMajorId);

  const currentSubOptions = useMemo((): PrecisionDetails | null => {
    if (selectedSmallId && qesSubDetails[selectedSmallId]) {
      return qesSubDetails[selectedSmallId];
    }
    if (selectedMediumId && qesSubDetails[selectedMediumId]) {
      return qesSubDetails[selectedMediumId];
    }
    if (selectedMajorId && qesSubDetails[selectedMajorId]) {
      return qesSubDetails[selectedMajorId];
    }
    return null;
  }, [selectedSmallId, selectedMediumId, selectedMajorId]);

  const totalSubItemsCount = useMemo(() => {
    if (!currentSubOptions) return 0;
    const set = new Set<string>();
    currentSubOptions.Q?.forEach(item => set.add(item.code));
    currentSubOptions.E?.forEach(item => set.add(item.code));
    currentSubOptions.S?.forEach(item => set.add(item.code));
    return set.size;
  }, [currentSubOptions]);

  const getRiskColor = (level: string) => {
    if (!level) return 'bg-slate-100 text-slate-800 border-slate-200';
    if (level.includes('一')) return 'bg-red-100 text-red-800 border-red-200 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
    if (level.includes('二')) return 'bg-amber-100 text-amber-800 border-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    if (level.includes('三')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const renderRowSubOptions = (code: string) => {
    const opts = qesSubDetails[code];
    if (!opts) return null;

    const hasQ = opts.Q && opts.Q.length > 0;
    const hasE = opts.E && opts.E.length > 0;
    const hasS = opts.S && opts.S.length > 0;

    if (!hasQ && !hasE && !hasS) return null;

    return (
      <div className="mt-4 space-y-4 border border-slate-200 bg-slate-50/50 rounded-xl p-4 shadow-sm animate-in fade-in duration-300 text-left">
        <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 mb-3">
          <AlertCircle className="w-4 h-4 text-brand-blue shrink-0" />
          <h4 className="text-xs font-black text-brand-dark">
            QES 风险评级细分说明（不同体系下的子类和范围）
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quality Q */}
          <div className="space-y-2 border-r border-dashed border-slate-200/80 pr-2 last:border-r-0">
            <div className="flex items-center gap-1.5 mb-1.5 bg-blue-50/60 border border-blue-100/50 rounded-md px-2 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-700">Q 质量体系</span>
            </div>
            {hasQ ? (
              <div className="space-y-1.5">
                {opts.Q.map((opt) => (
                  <div key={`${opt.code}-q`} className="bg-white border rounded p-2 flex items-start justify-between gap-2 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{opt.code}</span>
                      <span className="text-xs font-bold text-slate-700 leading-snug">{opt.name}</span>
                    </div>
                    <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0", getRiskColor(opt.risk))}>
                      {opt.risk}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic pl-1">遵循主项评级</p>
            )}
          </div>

          {/* Environment E */}
          <div className="space-y-2 border-r border-dashed border-slate-200/80 pr-2 last:border-r-0">
            <div className="flex items-center gap-1.5 mb-1.5 bg-amber-50/60 border border-amber-100/50 rounded-md px-2 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black text-amber-700">E 环境体系</span>
            </div>
            {hasE ? (
              <div className="space-y-1.5">
                {opts.E.map((opt) => (
                  <div key={`${opt.code}-e`} className="bg-white border rounded p-2 flex items-start justify-between gap-2 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{opt.code}</span>
                      <span className="text-xs font-bold text-slate-700 leading-snug">{opt.name}</span>
                    </div>
                    <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0", getRiskColor(opt.risk))}>
                      {opt.risk}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic pl-1">遵循主项评级</p>
            )}
          </div>

          {/* Safety S */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-1.5 bg-purple-50/60 border border-purple-100/50 rounded-md px-2 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-black text-purple-700">S 职业安全健康</span>
            </div>
            {hasS ? (
              <div className="space-y-1.5">
                {opts.S.map((opt) => (
                  <div key={`${opt.code}-s`} className="bg-white border rounded p-2 flex items-start justify-between gap-2 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{opt.code}</span>
                      <span className="text-xs font-bold text-slate-700 leading-snug">{opt.name}</span>
                    </div>
                    <div className={cn("px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0", getRiskColor(opt.risk))}>
                      {opt.risk}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic pl-1">遵循主项评级</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r bg-white flex flex-col shadow-xl z-30">
        <div className="p-6 border-b bg-white text-brand-blue shadow-sm z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
              <LayoutGrid className="w-5 h-5 text-brand-blue" />
            </div>
            <h1 className="text-xl font-black tracking-widest text-brand-blue drop-shadow-[0_1px_1px_rgba(0,74,153,0.1)]">
              AI体系认证管理系统
            </h1>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-blue transition-colors z-10" />
            <Input 
              placeholder="输入关键词" 
              className="pl-12 bg-slate-50 border-2 border-slate-200 text-black placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-brand-blue/20 shadow-inner h-14 text-base font-black transition-all"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentMatchIndex(-1);
              }}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar">
          <Accordion 
            type="multiple" 
            value={expandedAccordions} 
            onValueChange={setExpandedAccordions}
            className="space-y-3"
          >
            {sortedCategoriesTree.map(majorNode => {
              const id = majorNode.majorId;
              
              // Search match logic using pre-computed set
              const isMatch = matchedIds === null || matchedIds.has(id);

              if (!isMatch) return null;

              const isCurrent = id === currentCheckMajorId;
              const approved = isApproved[id];
              
              return (
                <AccordionItem value={id} key={id} id={`side-${id}`} className={cn(
                    "border rounded-xl transition-all duration-300",
                    selectedMajorId === id ? "border-brand-blue/30 shadow-md bg-brand-blue/[0.02]" : "border-slate-100"
                )}>
                  <AccordionTrigger 
                    className={cn(
                        "px-4 py-3 hover:bg-slate-50 rounded-xl transition-all no-underline hover:no-underline",
                        selectedMajorId === id ? "text-brand-blue" : "text-slate-600"
                    )}
                    onClick={() => {
                      setSelectedMajorId(id);
                      setSelectedMediumId(null);
                      setSelectedSmallId(null);
                      setCurrentQueriedCode(null);
                      setTimeout(() => scrollToId(id), 100);
                    }}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Badge 
                        variant={approved ? "default" : isCurrent ? "outline" : "secondary"} 
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center p-0 shrink-0 font-black text-sm transition-transform",
                            selectedMajorId === id ? "scale-110 shadow-lg" : ""
                        )}
                      >
                        {id}
                      </Badge>
                      <span className={cn(
                          "text-sm font-bold truncate transition-colors",
                          selectedMajorId === id ? "text-brand-blue" : "text-slate-700"
                      )}>
                        {highlightText(majorNode.name, searchTerm, majorNode.majorId)}
                      </span>
                      {approved && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-2 pl-6">
                    <div className="space-y-1">
                      {[...(majorNode.children || [])].sort((a, b) => a.mediumId.localeCompare(b.mediumId)).filter(medium => {
                        return matchedIds === null || matchedIds.has(id) || matchedIds.has(medium.mediumId);
                      }).map((medium) => {
                        return (
                          <div key={medium.mediumId} className="space-y-1">
                            <button
                              id={`side-${medium.mediumId}`}
                              onClick={() => {
                                setSelectedMajorId(id);
                                setSelectedMediumId(medium.mediumId);
                                setSelectedSmallId(null);
                                setCurrentQueriedCode(null);
                                setTimeout(() => scrollToId(medium.mediumId), 100);
                              }}
                              className={`w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-slate-100 transition-colors flex items-center gap-2 ${selectedMediumId === medium.mediumId ? 'text-brand-blue font-bold bg-brand-blue/5' : 'text-slate-500'}`}
                            >
                              <span className="font-mono opacity-60">{highlightText(medium.mediumId, searchTerm)}</span>
                              <span className="truncate">{highlightText(medium.name, searchTerm)}</span>
                            </button>
                            
                            {(selectedMediumId === medium.mediumId || searchTerm !== '') && (
                              <div className="pl-4 space-y-0.5 border-l ml-2">
                                {[...(medium.children || [])].sort((a, b) => a.smallId.localeCompare(b.smallId)).filter(s => {
                                  return matchedIds === null || matchedIds.has(id) || matchedIds.has(medium.mediumId) || matchedIds.has(s.smallId);
                                }).map((small, idx) => (
                                  <button
                                    id={`side-${small.smallId}`}
                                    key={`${medium.mediumId}-${small.smallId}-${idx}`}
                                    onClick={() => {
                                      setSelectedMajorId(id);
                                      setSelectedMediumId(medium.mediumId);
                                      setSelectedSmallId(small.smallId);
                                      setCurrentQueriedCode(null);
                                      setTimeout(() => scrollToId(small.smallId), 100);
                                    }}
                                    className={`w-full text-left px-2 py-1 text-[10px] rounded-sm hover:bg-slate-50 transition-colors truncate ${selectedSmallId === small.smallId ? 'text-brand-blue font-black bg-brand-blue/5' : 'text-slate-400 font-medium'}`}
                                  >
                                    {highlightText(small.smallId, searchTerm)} {highlightText(small.name, searchTerm)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-brand-silver">
        {/* Navigation / Header - LARGER */}
        <div className="bg-white border-b px-10 py-4 flex items-center justify-between z-20 shadow-sm relative">
          <div className="flex items-center gap-6">
            {searchTerm && allMatchesList.length > 0 ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-brand-blue/30 rounded-full px-4 py-1.5 shadow-sm transform origin-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-brand-blue/70">匹配</span>
                  <span className="text-sm font-bold text-brand-dark">
                    {allMatchesList.length} 处
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-brand-blue hover:bg-brand-blue/10 rounded-full"
                    onClick={() => {
                        const nextIdx = currentMatchIndex <= 0 ? allMatchesList.length - 1 : currentMatchIndex - 1;
                        jumpToMatch(nextIdx);
                    }}
                    disabled={allMatchesList.length <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm font-mono font-bold px-2 py-0.5 bg-white border rounded text-brand-blue min-w-[3rem] text-center">
                    {currentMatchIndex === -1 ? '0' : currentMatchIndex + 1}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-brand-blue hover:bg-brand-blue/10 rounded-full"
                    onClick={() => {
                        const nextIdx = currentMatchIndex >= allMatchesList.length - 1 ? 0 : currentMatchIndex + 1;
                        jumpToMatch(nextIdx);
                    }}
                    disabled={allMatchesList.length <= 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : searchTerm ? (
              <div className="px-6 py-3 bg-red-50 text-red-700 border border-red-100 rounded-full text-sm font-bold shadow-sm animate-pulse">
                未发现相关匹配内容，请尝试其他关键词
              </div>
            ) : (
              <div className="px-6 py-3 bg-brand-blue/5 text-brand-blue border border-brand-blue/10 rounded-full text-sm font-bold shadow-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                输入关键词
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
             {/* QES Indicator */}
             {currentRisk && (
               <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm animate-in fade-in zoom-in duration-300 relative z-50">
                 <div className="text-xs font-black text-slate-500 mr-1 tracking-widest flex items-center gap-1 group">
                   QES风险评级
                   <div className="absolute top-full right-0 mt-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg shadow-xl pointer-events-none z-50">
                      一: 高风险级 | 二: 中风险级 | 三: 低风险级
                   </div>
                 </div>
                 {currentSubOptions ? (
                   <button 
                     onClick={() => {
                       const targetId = selectedSmallId || selectedMediumId || selectedMajorId;
                       if (targetId) {
                         scrollToId(targetId);
                       }
                     }}
                     className="text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 animate-pulse shrink-0 hover:bg-amber-100 transition-all text-left flex items-center gap-1 cursor-pointer focus:outline-none hover:scale-105"
                     title="点击定位到下方详细行"
                   >
                     ⚠️ 包含 {totalSubItemsCount} 个细分等级（点击定位）
                   </button>
                 ) : (
                   <>
                     <div className={cn("px-2.5 py-0.5 rounded text-xs font-black border transition-all hover:scale-105 cursor-default", getRiskColor(currentRisk.Q))}>
                       Q: <span className="text-sm">{currentRisk.Q}</span>
                     </div>
                     <div className={cn("px-2.5 py-0.5 rounded text-xs font-black border transition-all hover:scale-105 cursor-default", getRiskColor(currentRisk.E))}>
                       E: <span className="text-sm">{currentRisk.E}</span>
                     </div>
                     <div className={cn("px-2.5 py-0.5 rounded text-xs font-black border transition-all hover:scale-105 cursor-default", getRiskColor(currentRisk.S))}>
                       S: <span className="text-sm">{currentRisk.S}</span>
                     </div>
                   </>
                 )}
               </div>
             )}

             {/* Dynamic Network Status Indicator */}
             <div className="group relative flex items-center justify-center">
               <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-[pulse_3s_ease-in-out_Infinity]' : 'bg-red-500'} ${isOnline ? 'shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
               <div className="absolute top-full right-0 mt-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl pointer-events-none z-50">
                 {isOnline ? '当前网络连接正常' : '已断开网络连接，请检查本地网络'}
               </div>
             </div>

             <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className={cn("h-12 px-8 text-sm font-bold border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white transition-all shadow-md active:scale-95", isAIPanelOpen && "bg-brand-blue text-white")}
                  onClick={() => {
                    const isPremium = subscription && subscription.plan_code !== 'free' && subscription.status === 'active';
                    if (!isPremium) {
                      setIsAiUpgradeModalOpen(true);
                    } else {
                      setIsAIPanelOpen(!isAIPanelOpen);
                    }
                  }}
                >
                  <Bot className="w-5 h-5 mr-2" />
                  AI智能匹配
                </Button>
             </div>
          </div>
        </div>

        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-8 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold bg-brand-blue text-white px-2 py-0.5 rounded shadow-sm">
              {selectedMajorId}
            </div>
            <h2 className="text-lg font-bold text-brand-dark tracking-tight">
              {majorInfo?.name}
            </h2>
            {isReadOnly && (
              <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-xs font-bold">
                只读模式
              </span>
            )}
          </div>
          
          {isApproved[currentCheckMajorId] && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">快速跳转</span>
              <Input 
                placeholder="编号" 
                className="w-20 h-9 text-sm font-bold text-center border-slate-300 focus:border-brand-blue"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNext((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button size="sm" className="h-9 bg-brand-blue hover:bg-brand-blue/90 shadow-md transform hover:-translate-y-0.5 transition-transform" onClick={() => {
                const input = document.querySelector('input[placeholder="编号"]') as HTMLInputElement;
                if (input?.value) handleNext(input.value);
              }}>
                确认 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          <div id="content-top" className="w-full max-w-[1600px] mx-auto p-12 space-y-16">
            {/* Selected Info Section */}
            {(!searchTerm || matchedIds?.has(majorInfo?.majorId || '')) && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-baseline gap-4 border-l-4 border-brand-blue pl-4">
                  <h2 className="text-4xl font-black tracking-tight text-brand-blue">
                    {selectedInfo?.code}
                  </h2>
                  <h3 className="text-2xl font-bold tracking-tight text-brand-dark">
                    {highlightText(selectedInfo?.name || '', searchTerm, selectedInfo?.smallId || selectedInfo?.mediumId || selectedInfo?.majorId)}
                  </h3>
                </div>
                
                {selectedInfo?.description && (
                  <p className="text-base text-brand-dark/80 leading-relaxed max-w-4xl whitespace-pre-wrap">
                    {highlightText(selectedInfo?.description || '', searchTerm, selectedInfo?.smallId || selectedInfo?.mediumId || selectedInfo?.majorId)}
                  </p>
                )}
                
                {currentSubOptions && (
                  <div className="mt-6 space-y-4 border border-slate-200/80 bg-slate-50/45 rounded-2xl p-6 shadow-sm animate-in fade-in duration-300">
                    <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-black text-slate-800">
                          QES 风险评级细分说明
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          此行业分类存在多个具体细项业务分类，不同体系（Q、E、S）下的细分范围与风险等级如下：
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                      {/* Q (质量) */}
                      <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                        <div className="flex items-center justify-between pb-1">
                          <h5 className="text-xs font-black text-blue-700 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            质量风险体系 (Q)
                          </h5>
                          <span className="text-[10px] font-bold text-slate-400">
                            共 {currentSubOptions.Q?.length || 0} 个细项
                          </span>
                        </div>
                        <div className="space-y-2">
                          {currentSubOptions.Q && currentSubOptions.Q.length > 0 ? (
                            currentSubOptions.Q.map((opt) => (
                              <div key={`${opt.code}-card-q`} className="bg-slate-50/50 hover:bg-slate-50 border rounded-lg p-3 transition-colors flex items-start justify-between gap-2.5">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded border border-brand-blue/10">
                                    {opt.code}
                                  </span>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed break-words pt-1">{opt.name}</p>
                                </div>
                                <div className={cn("px-2 py-0.5 rounded text-xs font-black border uppercase shrink-0 transition-all hover:scale-105", getRiskColor(opt.risk))}>
                                  Q: <span className="text-sm">{opt.risk}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">在此体系下无细分等级，遵循主类评级</p>
                          )}
                        </div>
                      </div>

                      {/* E (环境) */}
                      <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                        <div className="flex items-center justify-between pb-1">
                          <h5 className="text-xs font-black text-amber-700 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            环境风险体系 (E)
                          </h5>
                          <span className="text-[10px] font-bold text-slate-400">
                            共 {currentSubOptions.E?.length || 0} 个细项
                          </span>
                        </div>
                        <div className="space-y-2">
                          {currentSubOptions.E && currentSubOptions.E.length > 0 ? (
                            currentSubOptions.E.map((opt) => (
                              <div key={`${opt.code}-card-e`} className="bg-slate-50/50 hover:bg-slate-50 border rounded-lg p-3 transition-colors flex items-start justify-between gap-2.5">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded border border-brand-blue/10">
                                    {opt.code}
                                  </span>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed break-words pt-1">{opt.name}</p>
                                </div>
                                <div className={cn("px-2 py-0.5 rounded text-xs font-black border uppercase shrink-0 transition-all hover:scale-105", getRiskColor(opt.risk))}>
                                  E: <span className="text-sm">{opt.risk}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">在此体系下无细分等级，遵循主类评级</p>
                          )}
                        </div>
                      </div>

                      {/* S (职业健康安全) */}
                      <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                        <div className="flex items-center justify-between pb-1">
                          <h5 className="text-xs font-black text-purple-700 flex items-center gap-1.5 uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            安全风险体系 (S)
                          </h5>
                          <span className="text-[10px] font-bold text-slate-400">
                            共 {currentSubOptions.S?.length || 0} 个细项
                          </span>
                        </div>
                        <div className="space-y-2">
                          {currentSubOptions.S && currentSubOptions.S.length > 0 ? (
                            currentSubOptions.S.map((opt) => (
                              <div key={`${opt.code}-card-s`} className="bg-slate-50/50 hover:bg-slate-50 border rounded-lg p-3 transition-colors flex items-start justify-between gap-2.5">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono font-bold text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded border border-brand-blue/10">
                                    {opt.code}
                                  </span>
                                  <p className="text-xs font-bold text-slate-700 leading-relaxed break-words pt-1">{opt.name}</p>
                                </div>
                                <div className={cn("px-2 py-0.5 rounded text-xs font-black border uppercase shrink-0 transition-all hover:scale-105", getRiskColor(opt.risk))}>
                                  S: <span className="text-sm">{opt.risk}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">在此体系下无细分等级，遵循主类评级</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* ... existing includes/excludes with enhanced highlighting ... */}
              </section>
            )}

            <Separator className="bg-slate-200" />

            {/* Detailed Table Section - FILTERED BY SEARCH */}
            <section className="space-y-8 pb-20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h4 className="text-2xl font-black text-brand-dark flex items-center gap-3">
                    <LayoutGrid className="w-6 h-6 text-brand-blue" />
                    {searchTerm ? "搜素匹配详情" : "详细分类内容"}
                  </h4>
                  {searchTerm && (
                    <span className="text-xs font-bold text-brand-blue/60 mt-1 uppercase tracking-widest">
                      当前仅展示与“{searchTerm}”相关的条款
                    </span>
                  )}
                </div>
                <div className="px-4 py-2 bg-slate-100 rounded text-xs font-bold text-slate-500 border border-slate-200">
                  原文展现 · 强制对齐 · 固化内容
                </div>
              </div>

              <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-2xl">
                <Table className="w-full border-collapse">
                  <TableHeader className="bg-slate-50 sticky top-0 z-20 border-b-2 border-slate-200">
                    <TableRow className="hover:bg-transparent h-16">
                      <TableHead className="w-16 text-center border-r font-black text-slate-400 uppercase tracking-tighter shrink-0">大类</TableHead>
                      <TableHead className="w-20 text-center border-r font-black text-slate-400 uppercase tracking-tighter shrink-0">中类</TableHead>
                      <TableHead className="w-24 text-center border-r font-black text-slate-400 uppercase tracking-tighter shrink-0">小类</TableHead>
                      <TableHead className="w-[30%] border-r font-black text-brand-blue uppercase tracking-widest px-6">类别名称</TableHead>
                      <TableHead className="font-black text-slate-400 uppercase tracking-widest px-6">分类内容说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...(majorInfo?.children || [])]
                      .sort((a,b) => a.mediumId.localeCompare(b.mediumId))
                      .filter(m => !searchTerm || matchedIds?.has(m.mediumId) || m.children?.some(s => matchedIds?.has(s.smallId)))
                      .map((medium) => (
                      <React.Fragment key={medium.mediumId}>
                        {/* Medium Category Row */}
                        {(!searchTerm || matchedIds?.has(medium.mediumId)) && (
                          <TableRow id={`row-${medium.mediumId}`} key={`${medium.mediumId}-header`} className={cn(
                            "bg-slate-100/50 font-black border-t-2 border-slate-200/60 transition-all",
                            selectedMediumId === medium.mediumId && !selectedSmallId ? 'bg-brand-blue/5' : '',
                            allMatchesList[currentMatchIndex] === medium.mediumId ? 'bg-brand-blue/10 ring-2 ring-brand-blue inset z-10 shadow-lg' : ''
                          )}>
                            <TableCell className="text-center border-r font-mono text-sm text-slate-400">{majorInfo?.majorId}</TableCell>
                            <TableCell className="text-center border-r font-mono text-base text-brand-blue">{medium.mediumId}</TableCell>
                            <TableCell className="border-r" />
                            <TableCell className="border-r font-black text-base p-6 text-brand-dark break-words">
                              {highlightText(medium.name, searchTerm, medium.mediumId)}
                            </TableCell>
                            <TableCell className="p-0">
                              <div className="p-6 space-y-4 text-sm text-brand-dark/70 font-medium bg-slate-50/30 whitespace-pre-wrap break-words">
                                {medium.description && (
                                  <div className="leading-relaxed">
                                    {highlightText(medium.description, searchTerm, medium.mediumId)}
                                  </div>
                                )}
                                {medium.includes && medium.includes.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="text-[10px] font-black text-brand-blue/40 uppercase tracking-widest">包含范畴</div>
                                    <ul className="space-y-1.5">
                                      {medium.includes.map((inc, i) => (
                                        <li key={i} className="text-xs font-bold text-brand-dark/80 flex items-start gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-brand-blue/30 mt-1.5 shrink-0" />
                                          <span>{highlightText(inc, searchTerm, medium.mediumId)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {medium.excludes && medium.excludes.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="text-[10px] font-black text-amber-600/40 uppercase tracking-widest">排除范畴</div>
                                    <ul className="space-y-1.5">
                                      {medium.excludes.map((exc, i) => (
                                        <li key={i} className="text-xs font-bold text-amber-900/70 flex items-start gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                          <span>{highlightText(exc as string, searchTerm, medium.mediumId)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {renderRowSubOptions(medium.mediumId)}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Small Category Rows - FILTERED */}
                        {medium.children && (
                          [...(medium.children)]
                            .sort((a,b) => a.smallId.localeCompare(b.smallId))
                            .filter(s => !searchTerm || matchedIds?.has(s.smallId))
                            .map((small, idx) => (
                            <TableRow 
                              key={`${medium.mediumId}-${small.smallId}-${idx}`} 
                              id={`row-${small.smallId}`}
                              className={cn(
                                "hover:bg-slate-50 transition-all cursor-pointer group",
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                                selectedSmallId === small.smallId ? 'bg-brand-blue/[0.03]' : '',
                                allMatchesList[currentMatchIndex] === small.smallId ? 'bg-brand-blue/[0.08] ring-4 ring-brand-blue/20 z-10 relative' : ''
                              )}
                              onClick={() => {
                                setSelectedMajorId(small.majorId);
                                setSelectedMediumId(small.mediumId);
                                setSelectedSmallId(small.smallId);
                                setCurrentQueriedCode(null);
                              }}
                            >
                              <TableCell className="text-center border-r text-slate-300 font-mono text-xs">{majorInfo?.majorId}</TableCell>
                              <TableCell className="text-center border-r text-slate-300 font-mono text-xs">{medium.mediumId}</TableCell>
                              <TableCell className="text-center border-r font-mono text-base font-black text-brand-blue/80">{small.smallId}</TableCell>
                              <TableCell className="border-r text-base font-black p-6 text-brand-dark group-hover:text-brand-blue transition-colors break-words">
                                {highlightText(small.name, searchTerm, small.smallId)}
                              </TableCell>
                              <TableCell className="p-0">
                                <div className="p-6 space-y-4">
                                  {small.description && (
                                    <p className="text-sm leading-relaxed text-brand-dark font-medium break-words whitespace-pre-wrap">
                                      {highlightText(small.description, searchTerm, small.smallId)}
                                    </p>
                                  )}
                                  {/* ... existing includes/excludes with enhanced markup ... */}
                                  {small.includes && small.includes.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                      <div className="text-[10px] font-black text-brand-blue/40 uppercase tracking-widest">包含范畴</div>
                                      <ul className="space-y-1.5">
                                        {small.includes.map((inc, i) => (
                                          <li key={i} className="text-xs font-bold text-brand-dark/80 flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue/30 mt-1.5 shrink-0" />
                                            <span>{highlightText(inc, searchTerm, small.smallId)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {small.excludes && small.excludes.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                      <div className="text-[10px] font-black text-amber-600/40 uppercase tracking-widest">排除范畴</div>
                                      <ul className="space-y-1.5">
                                        {small.excludes.map((exc, i) => (
                                          <li key={i} className="text-xs font-bold text-amber-900/70 flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                            <span>{highlightText(exc as string, searchTerm, small.smallId)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {renderRowSubOptions(small.smallId)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        </div>
      </main>
      <AnimatePresence>
        {isAIPanelOpen && <AIPanel onClose={() => setIsAIPanelOpen(false)} onNavigate={handleAiNavigate} />}
      </AnimatePresence>

      {/* Professional Edition AI Smart Match Locked Dialog */}
      <Dialog open={isAiUpgradeModalOpen} onOpenChange={setIsAiUpgradeModalOpen}>
        <DialogContent className="sm:max-w-[480px] border-none shadow-2xl p-0 rounded-3xl overflow-hidden z-[100] bg-white">
          <div className="relative p-8 space-y-6 flex flex-col items-center text-center">
            {/* Top Icon */}
            <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0 animate-bounce">
              <Bot className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl font-black text-slate-800">
                AI 智能匹配引擎已锁定
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 leading-relaxed">
                “AI 智能匹配引擎”为专业商用版专享的高级决策辅助功能。
              </DialogDescription>
            </div>

            {/* Feature List */}
            <div className="w-full bg-slate-50/80 rounded-2xl p-5 border border-slate-100 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-2 shrink-0" />
                <p className="text-xs font-bold text-slate-700">
                  <span className="text-brand-blue">深度语义检索</span>：基于大语言模型，支持模糊语意、相近词汇与自定义行业短语智能匹配。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-2 shrink-0" />
                <p className="text-xs font-bold text-slate-700">
                  <span className="text-brand-blue">自动风险评定</span>：一键评估最新输入地址及申报项所对应的质量、环境及职业健康体系分类。
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-2 shrink-0" />
                <p className="text-xs font-bold text-slate-700">
                  <span className="text-brand-blue">高精确度决策</span>：智能匹配关联代码，自动推荐审核路线与体系覆盖，缩短人工复核耗时 80% 以上。
                </p>
              </div>
            </div>

            <div className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
              💡 升级指南：请在顶部导航栏切换至【计费中心】，选购适合的专业版套餐，即可一键解锁全量 AI 高级智能排程与查询模块！
            </div>

            <DialogFooter className="w-full flex sm:flex-row gap-3 pt-2">
              <Button 
                onClick={() => setIsAiUpgradeModalOpen(false)}
                variant="outline"
                className="flex-1 h-11 text-xs font-bold border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                暂不升级
              </Button>
              <Button 
                onClick={() => {
                  setIsAiUpgradeModalOpen(false);
                  // Instruct user to click Billing tab
                  alert("请点击顶部导航栏的『计费中心』，订阅并升级为专业商用版！");
                }}
                className="flex-1 h-11 text-xs font-bold bg-brand-blue text-white hover:bg-brand-blue/90 shadow-md"
              >
                前往计费中心
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryExplorer;
