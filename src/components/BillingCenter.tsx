import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  QrCode, 
  HelpCircle, 
  Loader2,
  Lock,
  Flame,
  Check,
  Building
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../lib/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

export default function BillingCenter() {
  const { authState, subscription, refreshSubscription, dbStatus } = useAuth();
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
  const [payMethod, setPayMethod] = useState<'alipay' | 'wechat'>('alipay');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);

  useEffect(() => {
    if (authState.user?.phone) {
      refreshSubscription();
      fetchUsageLogs();
    }
  }, [authState.user?.phone]);

  const fetchUsageLogs = async () => {
    try {
      const res = await fetch(`/api/billing/usage?phone=${authState.user?.phone}`);
      if (res.ok) {
        const data = await res.json();
        setUsageLogs(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch usage logs:', e);
    }
  };

  const planPrices = {
    pro: { month: 199, year: 1999 },
    enterprise: { month: 499, year: 4999 }
  };

  const handleOpenPay = (plan: 'pro' | 'enterprise') => {
    setSelectedPlan(plan);
    setIsPayModalOpen(true);
  };

  const handleSimulatePayment = async () => {
    if (!authState.user?.phone) return;
    setIsSubmittingPay(true);
    try {
      const months = billingCycle === 'month' ? 1 : 12;
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: authState.user.phone,
          planCode: selectedPlan,
          months: months
        })
      });

      if (res.ok) {
        await refreshSubscription();
        await fetchUsageLogs();
        setIsPayModalOpen(false);
        // Dispatch custom event to let other views know
        window.dispatchEvent(new Event('billing-updated'));
      } else {
        const data = await res.json();
        alert(data.error || '模拟支付升级失败，请重试。');
      }
    } catch (err) {
      console.error(err);
      alert('连接支付服务器超时，请重试。');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const isProActive = subscription && subscription.plan_code !== 'free' && subscription.status === 'active';
  const displayPlanName = subscription ? subscription.plan_name : '免费版';
  const remainingAiChats = subscription ? (subscription.plan_code === 'free' ? Math.max(0, 2 - subscription.ai_used_today) : '无限制') : 0;

  const getEndDateDisplay = () => {
    if (!subscription || subscription.plan_code === 'free') return '永久有效 (基础版)';
    const dateVal = subscription.end_time || (subscription as any).end_date;
    if (!dateVal) return '永久有效 (基础版)';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '永久有效 (基础版)';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '永久有效 (基础版)';
    }
  };

  // Render pricing card checkmarks
  const renderCheck = (text: string) => (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <Check className="w-4.5 h-4.5 text-brand-blue shrink-0 bg-blue-50 p-0.5 rounded-full" />
      <span>{text}</span>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-brand-silver">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Page Title & Hook */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-brand-blue" />
              会员订阅与支付中心
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              网页版企业级智能系统商用化发布，精细化管理用量配额、付费等级与系统对账审计。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">运行环境:</span>
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Web 商用 SaaS 云部署版
            </span>
          </div>
        </div>

        {/* Current Subscription Summary Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Subscription Status Card */}
          <Card className="border-none shadow-lg overflow-hidden relative bg-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-blue" />
            <CardHeader className="pb-4">
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">我的当前套餐</CardDescription>
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2 mt-1">
                {displayPlanName}
                {isProActive ? (
                  <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-black text-xs px-2.5 py-0.5 rounded-md">
                    PRO 生效中
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs px-2.5 py-0.5 rounded-md">
                    FREE 体验版
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm font-medium py-1.5 border-b border-dashed">
                <span className="text-slate-400">账户手机号</span>
                <span className="text-slate-700 font-mono font-bold">{authState.user?.phone}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium py-1.5 border-b border-dashed">
                <span className="text-slate-400">服务有效期至</span>
                <span className="text-slate-700 font-bold">
                  {getEndDateDisplay()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium py-1.5">
                <span className="text-slate-400">状态审计机</span>
                <span className={isProActive ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                  {subscription && subscription.status === 'active' ? '正常运行' : '未激活/已降级'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI Usage Card */}
          <Card className="border-none shadow-lg overflow-hidden relative bg-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />
            <CardHeader className="pb-4">
              <CardDescription className="text-xs font-bold text-indigo-400 uppercase tracking-wider">今日 AI 智能匹配额度</CardDescription>
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2 mt-1">
                {subscription?.plan_code === 'free' ? `${subscription?.ai_used_today} / 2 次` : '无限对话'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">今日已使用</span>
                  <span className="text-slate-600">{subscription?.ai_used_today || 0} 次</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: subscription?.plan_code === 'free' ? `${Math.min(100, ((subscription?.ai_used_today || 0) / 2) * 100)}%` : '100%' }}
                  />
                </div>
              </div>
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                <p className="text-xs text-indigo-700 font-medium leading-relaxed flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {subscription?.plan_code === 'free' 
                      ? '免费体验套餐每日限制 2 次 AI 对话匹配。超出后请升级为专业版，即可解锁无限制 AI 咨询。' 
                      : '您已解锁高级 AI 无限次智能匹配功能，享有全天候极速模型响应。'}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Premium Features Status Card */}
          <Card className="border-none shadow-lg overflow-hidden relative bg-white">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
            <CardHeader className="pb-4">
              <CardDescription className="text-xs font-bold text-amber-500 uppercase tracking-wider">高级核心功能锁</CardDescription>
              <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-2 mt-1">
                {isProActive ? '全模块已解锁' : '部分模块已锁定'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-slate-600">基础分类检索</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg">
                  {isProActive ? (
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">完整 4 级分类</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg">
                  {isProActive ? (
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">排除范畴说明</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg">
                  {isProActive ? (
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">QES风险评级</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg">
                  {isProActive ? (
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">项目合规咨询</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 bg-slate-50 border rounded-lg">
                  {isProActive ? (
                    <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600">AI 交通排程</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing matrix plans side-by-side */}
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">商用版本计费套餐说明</h2>
            <p className="text-slate-500 text-sm max-w-xl font-medium">
              按需订阅，全云端部署支持，助您随时随地开展企业体系认证范围智能检索与合规智能审查工作。
            </p>
            {/* Cycle Selector Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl border mt-3">
              <button
                onClick={() => setBillingCycle('month')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${billingCycle === 'month' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                月付
              </button>
              <button
                onClick={() => setBillingCycle('year')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors relative ${billingCycle === 'year' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                年付 (省 15%)
                <span className="absolute -top-2.5 -right-3.5 bg-red-500 text-white font-black text-[9px] px-1 rounded-md animate-bounce scale-90">
                  荐
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free plan */}
            <Card className="border-none shadow-md bg-white flex flex-col h-full rounded-2xl overflow-hidden relative">
              <CardHeader className="pb-6">
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">基础公开</CardDescription>
                <CardTitle className="text-xl font-black text-slate-800 mt-1">免费体验版</CardTitle>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl font-black text-slate-800">¥0</span>
                  <span className="text-xs font-bold text-slate-400">/ 永久</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <hr className="border-slate-100" />
                <div className="space-y-3">
                  {renderCheck("基础分类层级检索")}
                  {renderCheck("查看1-3级公开分类")}
                  {renderCheck("AI智能匹配 (每天 2 次对话)")}
                  <div className="flex items-center gap-2 text-sm text-slate-400 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>完整 4 级行业排除范畴</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>QES多体系风险评级与细分</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 line-through">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>排程 AI 交通距离推荐方案</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6">
                <Button variant="outline" className="w-full h-11 border-slate-200 text-slate-600 font-bold rounded-xl" disabled>
                  当前版本
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Plan (Most popular) */}
            <Card className="border-2 border-brand-blue shadow-xl bg-white flex flex-col h-full rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 bg-brand-blue text-white text-center text-xs font-black py-1 tracking-wider uppercase flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-white" />
                最受欢迎商用版
              </div>
              <CardHeader className="pb-6 pt-8">
                <CardDescription className="text-xs font-bold text-brand-blue uppercase tracking-widest">高级合规审查</CardDescription>
                <CardTitle className="text-xl font-black text-slate-800 mt-1">专业付费版</CardTitle>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-4xl font-black text-brand-blue">
                    ¥{billingCycle === 'month' ? planPrices.pro.month : planPrices.pro.year}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ {billingCycle === 'month' ? '月' : '年'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <hr className="border-slate-100" />
                <div className="space-y-3">
                  {renderCheck("无限制行业分类检索")}
                  {renderCheck("完整 4 级多维度行业排除范畴")}
                  {renderCheck("QES多体系风险等级及子项细分")}
                  {renderCheck("AI智能匹配对话 (无限制次数)")}
                  {renderCheck("AI项目评审合规咨询、企业合规审查")}
                  {renderCheck("排程 AI 智能交通距离计算与方案推荐")}
                  {renderCheck("导出 WORD 格式合规诊断与审核策划方案")}
                </div>
              </CardContent>
              <CardFooter className="pt-6">
                <Button 
                  onClick={() => handleOpenPay('pro')}
                  className="w-full h-11 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 transition-all transform hover:-translate-y-0.5"
                >
                  {isProActive && subscription?.plan_code === 'pro' ? '立即续费订阅' : '立即升级订阅'}
                </Button>
              </CardFooter>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-none shadow-md bg-white flex flex-col h-full rounded-2xl overflow-hidden relative">
              <CardHeader className="pb-6">
                <CardDescription className="text-xs font-bold text-indigo-500 uppercase tracking-widest">多租户定制</CardDescription>
                <CardTitle className="text-xl font-black text-slate-800 mt-1">企业专属尊享版</CardTitle>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-3xl font-black text-slate-800">
                    ¥{billingCycle === 'month' ? planPrices.enterprise.month : planPrices.enterprise.year}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/ {billingCycle === 'month' ? '月' : '年'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <hr className="border-slate-100" />
                <div className="space-y-3">
                  {renderCheck("专业版全部高阶模块权限")}
                  {renderCheck("支持独立专属大模型 API Key 云端部署")}
                  {renderCheck("子账号授权与团队分权对账系统")}
                  {renderCheck("多租户隔离数据备份防丢失保障")}
                  {renderCheck("高级一对一专家专属系统调试服务")}
                </div>
              </CardContent>
              <CardFooter className="pt-6">
                <Button 
                  onClick={() => handleOpenPay('enterprise')}
                  variant="outline" 
                  className="w-full h-11 border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50"
                >
                  联系客服大客户定制
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Commercial Billing Usage Audit Logs */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-blue" />
            用户商用资源用量审计记录
          </h2>
          <Card className="border-none shadow-lg overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 tracking-wider">
                      <th className="px-6 py-4">时间</th>
                      <th className="px-6 py-4">功能模块</th>
                      <th className="px-6 py-4">操作行为</th>
                      <th className="px-6 py-4">AI Token耗量</th>
                      <th className="px-6 py-4">计费折合(元)</th>
                      <th className="px-6 py-4">细节回执</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium">
                    {usageLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                          暂无可用计费审计记录。
                        </td>
                      </tr>
                    ) : (
                      usageLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                            {new Date(log.created_at).toLocaleString('zh-CN', { hour12: false })}
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-bold">{log.module_name}</td>
                          <td className="px-6 py-4 text-slate-500">{log.action_type}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                            {log.token_count > 0 ? log.token_count.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs text-brand-blue">
                            {log.estimated_cost > 0 ? `¥${Number(log.estimated_cost).toFixed(4)}` : '免费额度'}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs max-w-xs truncate" title={log.details}>
                            {log.details || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment simulation Dialog */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-[460px] border-none shadow-2xl overflow-hidden p-0 rounded-3xl z-[120]">
          <div className="bg-brand-blue text-white px-8 py-6 relative">
            <h3 className="text-xl font-black">AI体系认证管理系统安全云支付</h3>
            <p className="text-xs text-white/80 font-medium mt-1">
              您正在购买：{selectedPlan === 'pro' ? '专业付费版' : '企业专属尊享版'} ({billingCycle === 'month' ? '月度订阅' : '年度订阅'})
            </p>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Payment Price Display */}
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-400">应付总金额</span>
                <div className="text-4xl font-black text-slate-800">
                  ¥{billingCycle === 'month' ? planPrices[selectedPlan].month : planPrices[selectedPlan].year}
                </div>
              </div>

              {/* Mock QR Code Container */}
              <div className="relative p-4 border bg-slate-50 border-slate-200 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-48 h-48 bg-white border rounded-xl flex items-center justify-center p-2 relative">
                  <QrCode className="w-40 h-40 text-slate-800" />
                  <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center p-4">
                    <img 
                      src={payMethod === 'alipay' 
                        ? 'https://pic.rmb.bdstatic.com/bjh/9a4103fa72370f5e182e0e567a13c9fb.png' 
                        : 'https://pic.rmb.bdstatic.com/bjh/cc49db01ccf074d2215c0e0b3c6628ef.png'} 
                      alt="qrcode" 
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  <span>微信/支付宝扫码，安全通道对账。</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => setPayMethod('alipay')}
                  className={`py-3 border-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${payMethod === 'alipay' ? 'border-brand-blue bg-blue-50 text-brand-blue shadow-inner' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Building className="w-4 h-4 shrink-0" />
                  支付宝支付
                </button>
                <button
                  onClick={() => setPayMethod('wechat')}
                  className={`py-3 border-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${payMethod === 'wechat' ? 'border-green-600 bg-green-50 text-green-700 shadow-inner' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Building className="w-4 h-4 shrink-0" />
                  微信支付
                </button>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:gap-0">
              <Button 
                variant="ghost" 
                onClick={() => setIsPayModalOpen(false)}
                className="font-bold text-slate-500 hover:bg-slate-50 h-11"
              >
                取消
              </Button>
              <Button 
                onClick={handleSimulatePayment}
                disabled={isSubmittingPay}
                className="bg-green-600 hover:bg-green-700 text-white font-black h-11 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/20 active:scale-95"
              >
                {isSubmittingPay ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                模拟扫码支付成功 (测试用)
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
