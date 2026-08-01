import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, LogOut, Settings, MapPin, Search, ShieldCheck, 
  Calendar, MessageSquare, Cpu, Sliders, CreditCard, Zap } from 'lucide-react';

import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth-context';
import { Button } from './ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

// Import all sub-tab components
import CategoryExplorer from './CategoryExplorer';
import AIApplication from './AIApplication';
import AuditReview from './AuditReview';
import Scheduling from './Scheduling';
import AIConfig from './AIConfig';
import AdminPanel from './AdminPanel';
import BillingCenter from './BillingCenter';

type TabId = 'codes' | 'review' | 'schedule' | 'apply' | 'ai' | 'admin' | 'billing';

const TABS: { id: TabId; label: string; icon: React.FC<any>; permission?: string }[] = [
  { id: 'codes', label: '范围检索', icon: Search, permission: '范围检索权限' },
  { id: 'review', label: '项目评审', icon: ShieldCheck, permission: '项目评审权限' },
  { id: 'schedule', label: 'AI差旅方案', icon: Calendar, permission: '排程权限' },
  { id: 'apply', label: 'AI一键申请', icon: Zap, permission: '排程权限' },
  { id: 'ai', label: 'AI配置', icon: Cpu, permission: 'AI引擎配置权限' },
  { id: 'admin', label: '管理后台', icon: Sliders },
  { id: 'billing', label: '计费中心', icon: CreditCard },
];

export default function MainApp() {
  const { authState, logout, dbStatus } = useAuth();
  
  // Filter tabs based on user permissions
  const permittedTabs = TABS.filter(tab => {
    if (!tab.permission) return true;
    return authState.user?.permissions?.includes(tab.permission);
  });

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    // Pick first permitted tab if available
    const perms = JSON.parse(localStorage.getItem('v_auth_state_v1') || '{}')?.user?.permissions || [];
    const allowed = TABS.filter(tab => !tab.permission || perms.includes(tab.permission));
    return allowed[0]?.id || 'codes';
  });

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [showExitAnimation, setShowExitAnimation] = useState(false);

  // Sync active tab if permissions change or activeTab is not permitted
  useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.some(t => t.id === activeTab)) {
      setActiveTab(permittedTabs[0].id);
    }
  }, [authState.user, activeTab]);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-sans">
      {/* Global Application Header */}
      <header className="h-14 border-b flex items-center justify-between px-6 bg-white relative z-[60] shrink-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
         <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${dbStatus === 'disconnected' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-brand-blue shadow-brand-blue/20'} flex items-center justify-center shadow-inner`}>
               <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">AI 智能审核系统</h1>
            {dbStatus === 'disconnected' && (
               <span className="ml-2 px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-md border border-amber-200">
                 离线缓存模式
               </span>
            )}
         </div>

         {/* Navigation Tabs (Top Right) */}
         <div className="flex items-center h-full">
            <nav className="flex items-center h-full gap-2 mr-6">
               {permittedTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                           "relative px-4 h-full flex items-center gap-2 text-sm font-bold transition-colors",
                           isActive ? "text-brand-blue font-black" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                     >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {isActive && (
                           <motion.div
                              layoutId="activeTabIndicator"
                              className="absolute bottom-0 left-0 right-0 h-1 bg-brand-blue rounded-t-full"
                              initial={false}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                           />
                        )}
                     </button>
                  );
               })}
            </nav>

            <div className="w-px h-6 bg-slate-200 mx-2" />

            <div className="flex items-center gap-4 mr-4">
               <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-brand-dark leading-none">{authState.user?.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md leading-none shadow-sm">
                    {authState.user?.phone}
                  </span>
               </div>
               <Button 
                  onClick={() => setIsLogoutDialogOpen(true)}
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
               >
                  <LogOut className="w-3.5 h-3.5" />
                  退出
               </Button>
            </div>
         </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-brand-silver">
         {permittedTabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
               <div 
                  key={tab.id}
                  className="absolute inset-0 flex flex-col" 
                  style={{ display: isTabActive ? 'flex' : 'none' }}
               >
                  {tab.id === 'codes' && <CategoryExplorer />}
                  {tab.id === 'review' && <AuditReview />}
                  {tab.id === 'schedule' && <Scheduling />}
                  {tab.id === 'apply' && <AIApplication />}
                  {tab.id === 'ai' && <AIConfig />}
                  {tab.id === 'admin' && <AdminPanel />}
                  {tab.id === 'billing' && <BillingCenter />}
               </div>
            );
         })}
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-none shadow-2xl overflow-hidden p-0 rounded-3xl z-[100]">
           <div className="bg-white p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 animate-in zoom-in-50 duration-300">
                    <LogOut className="w-10 h-10" />
                 </div>
                 <div className="space-y-2">
                    <DialogTitle className="text-2xl font-black text-slate-800">确认退出系统？</DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                       您的当前操作进度已自动保存，退出后需要重新授权登录。
                    </DialogDescription>
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                 <Button 
                    variant="default" 
                    className="h-14 bg-red-500 hover:bg-red-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                    onClick={() => {
                       setIsLogoutDialogOpen(false);
                       setShowExitAnimation(true);
                       setTimeout(() => {
                          logout();
                       }, 800);
                    }}
                  >
                    确认安全退出
                 </Button>
                 <Button 
                    variant="ghost" 
                    className="h-12 text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-bold rounded-xl"
                    onClick={() => setIsLogoutDialogOpen(false)}
                 >
                    返回继续操作
                 </Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Exit Feedback Interface */}
      <AnimatePresence>
        {showExitAnimation && (
           <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
           >
              <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="flex flex-col items-center space-y-4 bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
              >
                 <div className="animate-spin w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full" />
                 <div className="text-center space-y-1">
                    <h2 className="text-xl font-bold text-slate-800">正在安全退出</h2>
                    <p className="text-slate-500 text-sm">请稍候...</p>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
