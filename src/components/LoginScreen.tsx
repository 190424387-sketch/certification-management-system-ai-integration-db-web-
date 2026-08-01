import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, LogIn, Clock, ChevronDown, Check, UserPlus, KeyRound, Database, Server, Settings2, Eye, EyeOff } from "lucide-react";
import { useAuth } from '@/lib/auth-context';
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type TabType = 'login-password' | 'login-sms' | 'register' | 'db-config';

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, loginHistory } = useAuth();
  const [tab, setTab] = useState<TabType>('login-password');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('业务');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // DB Config state
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('3306');
  const [dbName, setDbName] = useState('pc');
  const [dbTable, setDbTable] = useState('web user');
  const [dbUser, setDbUser] = useState('pc');
  const [dbPass, setDbPass] = useState('root');
  const [isDbTesting, setIsDbTesting] = useState(false);
  const [dbTestStatus, setDbTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);

  useEffect(() => {
    if (tab === 'db-config' && !dbHost) {
      // Load current config
      fetch('/api/db/config')
        .then(res => res.text())
        .then(text => {
          try {
            return JSON.parse(text);
          } catch(e) {
            console.error('Invalid JSON for config:', text);
            return null;
          }
        })
        .then(data => {
        if (!data) return;
        setDbHost(data.host || '');
        setDbPort(data.port?.toString() || '3306');
        setDbName(data.database || 'pc');
        setDbTable(data.table || 'web user');
        setDbUser(data.user || 'pc');
        setDbPass(data.password || 'root');
      }).catch(console.error);
    }
  }, [tab, dbHost]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone) {
      setError('请先输入手机号');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      let data;
      try { data = await res.json(); } catch(e) { throw new Error("Server not responding"); }
      if (!res.ok) throw new Error(data.error);
      setCountdown(60);
      if (data.code) {
        setCode(data.code);
        alert(`测试环境模拟：验证码为 ${data.code}，已自动填入`);
      } else {
        alert('验证码发送成功(模拟环境默认随机)');
      }
    } catch (e: any) {
      setError(e.message || '验证码发送失败');
    }
  };

  const handleDbTest = async () => {
    setError('');
    setIsDbTesting(true);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: dbHost, port: parseInt(dbPort), database: dbName, table: dbTable, user: dbUser, password: dbPass })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server returned invalid response (Status ${res.status}): ` + text.slice(0, 100));
      }
      if (!res.ok) throw new Error(data.message || data.error);
      setDbTestStatus('success');
      alert('数据库连接成功！');
    } catch (e: any) {
      setDbTestStatus('error');
      setError(e.message || '连接失败');
    } finally {
      setIsDbTesting(false);
    }
  };

  const handleDbSave = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: dbHost, port: parseInt(dbPort), database: dbName, table: dbTable, user: dbUser, password: dbPass })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server error (${res.status}): non-JSON response config`);
      }
      if (!res.ok) throw new Error(data.message || data.error);
      setDbTestStatus('idle');
      alert('数据库设置已保存！');
      setTab('login-password');
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (tab === 'db-config') return handleDbSave();

    setError('');
    setIsLoading(true);

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    try {
      if (tab === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone: trimmedPhone, password: trimmedPassword, code, role })
        });
        let data;
        try { data = await res.json(); } catch(e) { throw new Error("Server not responding"); }
        if (!res.ok) throw new Error(data.error);
        alert('注册成功，请使用密码登录');
        setTab('login-password');
        setIsLoading(false);
        return;
      }

      // Login
      const result = await login(trimmedPhone, tab === 'login-sms' ? code : trimmedPassword, tab === 'login-sms');
      if (result.success) {
          if (result.message && result.message.includes('数据库连接失败')) {
             alert(result.message);
          }
          onLoginSuccess();
      } else {
          if (result.message && result.message.includes('该账号已在其它设备上绑定')) {
              alert(result.message);
          }
          setError(result.message || '登录失败，请重试');
      }
    } catch (e: any) {
      setError(e.message || '操作失败');
    } finally {
      setIsLoading(false);
    }
  };

  const selectHistoryItem = (historyPhone: string) => {
    setPhone(historyPhone);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50 p-4">
      <div className="max-w-[1000px] w-full flex bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px]">
        {/* Left Side: Branding / Info */}
        <div className="hidden md:flex flex-col flex-1 bg-brand-blue text-white p-12 justify-between relative overflow-hidden">
           {/* Decorative background elements */}
           <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              <svg width="400" height="400" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="currentColor" />
              </svg>
           </div>
           
           <div className="z-10 text-white/80">
             <div className="text-4xl font-black mb-4 text-white">AI体系认证管理系统</div>
             <div className="text-lg font-medium opacity-80">智能检索 · 高效比对 · 快速固化</div>
           </div>

           <div className="z-10 space-y-6">
             <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                <blockquote className="text-lg lg:text-xl font-medium leading-relaxed italic opacity-90">
                  "专注于提升服务的执行效率，为您提供最精准的技术支撑。"
                </blockquote>
             </div>
           </div>
           
           <div className="z-10 flex items-center justify-between">
             <div className="text-sm font-medium text-white/50">
               &copy; {new Date().getFullYear()} AI体系认证管理系统. All rights reserved.
             </div>
             <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => setTab('db-config')}>
                <Settings2 className="w-4 h-4 mr-2" /> 数据库配置
             </Button>
           </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 p-6 md:p-12 flex flex-col justify-center relative bg-white z-10 w-full max-w-lg mx-auto overflow-y-auto">
          <div className="w-full max-w-sm mx-auto space-y-6 md:space-y-8">
            <div className="space-y-2 md:space-y-3">
              <h1 className="text-3xl md:text-4xl font-black text-brand-dark tracking-tight">
                {tab === 'register' ? '注册账号' : tab === 'db-config' ? '数据库配置' : '欢迎登录'}
              </h1>
              <p className="text-slate-500 font-medium text-base md:text-lg">
                {tab === 'register' ? '请填写信息注册系统' : tab === 'db-config' ? '配置系统的关联数据库' : '请输入您的内部授权账号以继续使用系统。'}
              </p>
            </div>

            {tab !== 'db-config' && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTab('login-password')}
                className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", tab === 'login-password' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >密码登录</button>
              <button
                type="button"
                onClick={() => setTab('login-sms')}
                className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", tab === 'login-sms' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >验证码登录</button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", tab === 'register' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >注 册</button>
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <span className="shrink-0">⚠️</span>
                  {error}
                </div>
              )}
              
              {tab === 'db-config' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <Label className="text-sm font-bold text-slate-700">主机 (Host)</Label>
                      <Input 
                        placeholder="IP地址或域名"
                        className="bg-slate-50 h-12 rounded-xl"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2 w-24">
                      <Label className="text-sm font-bold text-slate-700">端口</Label>
                      <Input 
                        placeholder="3306"
                        type="number"
                        className="bg-slate-50 h-12 rounded-xl"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <Label className="text-sm font-bold text-slate-700">数据库名 (Database)</Label>
                      <Input 
                        placeholder="pc"
                        className="bg-slate-50 h-12 rounded-xl"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 flex-1">
                      <Label className="text-sm font-bold text-slate-700">数据表 (Table)</Label>
                      <Input 
                        placeholder="web user"
                        className="bg-slate-50 h-12 rounded-xl"
                        value={dbTable}
                        onChange={(e) => setDbTable(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">用户名 (User)</Label>
                    <Input 
                      placeholder="pc"
                      className="bg-slate-50 h-12 rounded-xl"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-slate-700">密码 (Password)</Label>
                      {dbTestStatus !== 'idle' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                           <div className={cn("w-2 h-2 rounded-full", dbTestStatus === 'success' ? 'bg-green-500' : 'bg-red-500')} />
                           <span className="text-[10px] font-bold text-slate-500">
                             {dbTestStatus === 'success' ? '连接成功' : '连接失败'}
                           </span>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Input 
                        type={showDbPassword ? 'text' : 'password'}
                        placeholder="root"
                        className="bg-slate-50 h-12 rounded-xl pr-12"
                        value={dbPass}
                        onChange={(e) => setDbPass(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDbPassword(!showDbPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showDbPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleDbTest}
                      disabled={isDbTesting}
                      className="flex-1 h-12 rounded-xl border-slate-200"
                    >
                      {isDbTesting ? '测试中...' : '测试连接'}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="flex-1 h-12 rounded-xl bg-brand-blue hover:bg-brand-blue/90"
                    >
                      {isLoading ? '保存中...' : '保存配置'}
                    </Button>
                  </div>
                  <div className="text-center pt-2">
                     <Button variant="link" type="button" onClick={() => setTab('login-password')} className="text-slate-500">
                        返回登录
                     </Button>
                  </div>
                </div>
              )}

              {tab === 'register' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-bold text-slate-700">姓名</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <Input 
                        id="name" 
                        type="text"
                        placeholder="您的真实姓名"
                        className="pl-11 h-14 bg-slate-50 border-slate-200 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue rounded-xl text-base font-medium shadow-sm transition-all"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">人员角色</Label>
                    <div className="flex gap-4 p-1 bg-slate-50 rounded-xl border border-slate-200">
                      <label className={cn("flex-1 text-center py-2 text-sm font-bold rounded-lg cursor-pointer transition-colors", role === '业务' ? "bg-white text-brand-blue shadow-sm border border-slate-200" : "text-slate-500 hover:text-brand-dark")}>
                        <input type="radio" className="hidden" name="role" value="业务" checked={role === '业务'} onChange={(e) => setRole(e.target.value)} />
                        业务
                      </label>
                      <label className={cn("flex-1 text-center py-2 text-sm font-bold rounded-lg cursor-pointer transition-colors", role === '职能' ? "bg-white text-brand-blue shadow-sm border border-slate-200" : "text-slate-500 hover:text-brand-dark")}>
                        <input type="radio" className="hidden" name="role" value="职能" checked={role === '职能'} onChange={(e) => setRole(e.target.value)} />
                        职能
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {tab !== 'db-config' && (
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                       <Label htmlFor="phone" className="text-sm font-bold text-slate-700">手机号码</Label>
                       
                       {/* History Dropdown */}
                       {loginHistory.length > 0 && tab !== 'register' && (
                           <DropdownMenu>
                               <DropdownMenuTrigger className={cn(
                                   "flex items-center h-8 text-xs font-bold text-brand-blue hover:bg-brand-blue/10 px-2 rounded-lg transition-colors cursor-pointer outline-none border border-transparent focus-visible:border-brand-blue/30"
                               )}>
                                   <Clock className="w-3.5 h-3.5 mr-1" />
                                   历史账号
                                   <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="w-56 p-2 bg-white rounded-xl shadow-xl border-slate-100">
                                   <div className="text-[10px] font-black text-slate-400 px-2 py-1.5 uppercase tracking-widest">
                                       最近登录账号
                                   </div>
                                   {loginHistory.map((history) => (
                                       <DropdownMenuItem 
                                           key={history.phone}
                                           onClick={() => selectHistoryItem(history.phone)}
                                           className="flex flex-col items-start px-3 py-2 cursor-pointer rounded-lg hover:bg-slate-50 focus:bg-slate-50 data-[highlighted]:bg-slate-50"
                                       >
                                           <div className="flex items-center gap-2 w-full justify-between">
                                               <span className="font-bold text-brand-dark text-sm">{history.name}</span>
                                               {history.phone === phone && <Check className="w-3.5 h-3.5 text-brand-blue" />}
                                           </div>
                                           <span className="font-mono text-xs text-slate-500 opacity-80">{history.phone}</span>
                                       </DropdownMenuItem>
                                   ))}
                               </DropdownMenuContent>
                           </DropdownMenu>
                       )}
                   </div>
                   <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                       <User className="h-5 w-5" />
                     </div>
                     <Input 
                       id="phone" 
                       type="tel"
                       placeholder="请输入手机号"
                       className="pl-11 h-14 bg-slate-50 border-slate-200 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue rounded-xl text-base font-medium shadow-sm transition-all"
                       value={phone}
                       onChange={(e) => setPhone(e.target.value)}
                       required
                     />
                   </div>
                 </div>
              )}

              {(tab === 'login-password' || tab === 'register') && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-bold text-slate-700">密码</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder={tab === 'register' ? '设置密码' : '请输入密码'}
                      className="pl-11 pr-12 h-14 bg-slate-50 border-slate-200 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue rounded-xl text-base font-medium shadow-sm transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {(tab === 'login-sms' || tab === 'register') && (
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-bold text-slate-700">验证码</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <Input 
                        id="code" 
                        type="text"
                        placeholder="输入验证码"
                        className="pl-11 h-14 bg-slate-50 border-slate-200 focus-visible:ring-brand-blue/30 focus-visible:border-brand-blue rounded-xl text-base font-medium shadow-sm transition-all"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-14 px-6 rounded-xl font-bold bg-slate-50 border-slate-200"
                      onClick={handleSendCode}
                      disabled={countdown > 0}
                    >
                      {countdown > 0 ? `${countdown}s 后获取` : '获取验证码'}
                    </Button>
                  </div>
                </div>
              )}

              {tab !== 'db-config' && (
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl text-lg font-black shadow-xl shadow-brand-blue/20 transition-all active:scale-[0.95] flex items-center justify-center gap-3 group relative overflow-hidden"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="animate-pulse">正在处理...</span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      {tab === 'register' ? <UserPlus className="w-6 h-6 transition-transform group-hover:translate-x-1" /> : <LogIn className="w-6 h-6 transition-transform group-hover:translate-x-1" />}
                      <span>{tab === 'register' ? '立即注册' : '登录系统'}</span>
                    </>
                  )}
                </Button>
              </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
