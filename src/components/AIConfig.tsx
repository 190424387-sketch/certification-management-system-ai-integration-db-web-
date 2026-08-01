import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  X, 
  Loader2, 
  Database, 
  History,
  ShieldCheck,
  Zap,
  Trash2,
  Bug,
  Lock
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth-context';

interface AISettings {
  provider: 'gemini' | 'openai';
  modelName: string;
  apiKey: string;
  proxyUrl: string;
  useInternalProxy: boolean;
  isDebug: boolean;
  uiScale: number;
  moduleSettings: {
    search: { temperature: number };
    audit: { temperature: number };
    schedule: { temperature: number };
  };
}

const DEFAULT_MODULE_SETTINGS = {
  search: { temperature: 0 },
  audit: { temperature: 0.1 },
  schedule: { temperature: 0.2 },
};

const SETTINGS_KEY = 'certMatch_ai_settings_v2';
const CONFIG_HISTORY_KEY = 'certMatch_ai_history_v2';
const CACHE_KEY = 'certMatch_ai_cache_v2';

const PROVIDER_PRESETS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    provider: 'gemini',
    proxyUrl: 'https://generativelanguage.googleapis.com',
    modelName: 'gemini-3-flash-preview',
    placeholder: '例如: gemini-3-flash-preview',
    apiKeyPlaceholder: 'AI Studio 环境变量已默认注入',
    iconText: '✨',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    provider: 'openai',
    proxyUrl: 'https://api.deepseek.com/v1',
    modelName: 'deepseek-chat',
    placeholder: '例如: deepseek-chat',
    apiKeyPlaceholder: '输入您的 DeepSeek API Key (sk-...)',
    iconText: '🐳',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    provider: 'openai',
    proxyUrl: 'https://api-slb.packyapi.com',
    modelName: 'claude-3-5-sonnet-latest',
    placeholder: '例如: claude-3-5-sonnet-latest',
    apiKeyPlaceholder: '输入您的 Claude 中转 API Key (sk-...)',
    iconText: '✴️',
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    provider: 'openai',
    proxyUrl: 'https://api.moonshot.cn/v1',
    modelName: 'moonshot-v1-8k',
    placeholder: '例如: moonshot-v1-8k',
    apiKeyPlaceholder: '输入您的 Kimi API Key',
    iconText: '🌙',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    provider: 'openai',
    proxyUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
    placeholder: '例如: gpt-4o-mini',
    apiKeyPlaceholder: '输入您的 OpenAI API Key',
    iconText: '🧠',
  },
  {
    id: 'qwen',
    name: '阿里通义千问',
    provider: 'openai',
    proxyUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelName: 'qwen-plus',
    placeholder: '例如: qwen-plus',
    apiKeyPlaceholder: '输入您的 DashScope API Key',
    iconText: '☁️',
  },
  {
    id: 'zhipu',
    name: '智谱清言 GLM',
    provider: 'openai',
    proxyUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelName: 'glm-4-flash',
    placeholder: '例如: glm-4-flash',
    apiKeyPlaceholder: '输入您的 智谱 GLM API Key',
    iconText: '🔮',
  }
];

export default function AIConfig() {
  const { authState } = useAuth();
  const isReadOnly = authState.user?.permissionDetails?.['AI引擎配置权限'] === '只读';

  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          provider: parsed.provider || 'gemini',
          modelName: parsed.modelName || 'gemini-3-flash-preview',
          apiKey: parsed.apiKey || 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
          proxyUrl: parsed.proxyUrl || 'https://api-slb.packyapi.com',
          useInternalProxy: parsed.useInternalProxy ?? false,
          isDebug: parsed.isDebug || false,
          uiScale: parsed.uiScale || 100,
          moduleSettings: {
             search: parsed.moduleSettings?.search || DEFAULT_MODULE_SETTINGS.search,
             audit: parsed.moduleSettings?.audit || DEFAULT_MODULE_SETTINGS.audit,
             schedule: parsed.moduleSettings?.schedule || DEFAULT_MODULE_SETTINGS.schedule,
          }
        };
      }
    } catch (e) {}
    return {
      provider: 'gemini',
      modelName: 'gemini-3-flash-preview',
      apiKey: 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
      proxyUrl: 'https://api-slb.packyapi.com',
      useInternalProxy: false,
      isDebug: false,
      uiScale: 100,
      moduleSettings: DEFAULT_MODULE_SETTINGS
    };
  });

  const [tempSettings, setTempSettings] = useState<AISettings>(settings);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<AISettings[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONFIG_HISTORY_KEY);
      if (saved) {
        setSavedConfigs(JSON.parse(saved));
      } else {
        const defaultHistory: AISettings[] = [
          {
            provider: 'gemini',
            modelName: 'gemini-3-flash-preview',
            apiKey: 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
            proxyUrl: 'https://api-slb.packyapi.com',
            useInternalProxy: false,
            isDebug: false,
            uiScale: 100,
            moduleSettings: DEFAULT_MODULE_SETTINGS
          },
          {
            provider: 'gemini',
            modelName: 'gemini-3-flash-preview',
            apiKey: 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
            proxyUrl: 'https://api-slb.packyapi.com',
            useInternalProxy: false,
            isDebug: false,
            uiScale: 100,
            moduleSettings: DEFAULT_MODULE_SETTINGS
          },
          {
            provider: 'gemini',
            modelName: 'gemini-1.5-pro',
            apiKey: 'sk-9nrtLy0eMUCfWXMxqoxhTELOivi8Q34okX2cToXl2ODvxvFb',
            proxyUrl: 'https://api-slb.packyapi.com',
            useInternalProxy: false,
            isDebug: false,
            uiScale: 100,
            moduleSettings: DEFAULT_MODULE_SETTINGS
          }
        ];
        setSavedConfigs(defaultHistory);
        localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(defaultHistory));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const isDifferent = JSON.stringify(tempSettings) !== JSON.stringify(settings);
    setHasChanges(isDifferent);
  }, [tempSettings, settings]);

  const saveSettings = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      setSettings(tempSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(tempSettings));
      setHasChanges(false);

      await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempSettings),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to sync settings to server-side filesystem', e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveToHistory = () => {
    if (isReadOnly) return;
    const isDuplicate = savedConfigs.some(c => 
      c.apiKey === tempSettings.apiKey && 
      c.modelName === tempSettings.modelName && 
      c.proxyUrl === tempSettings.proxyUrl
    );

    if (isDuplicate) return;

    const newConfigs = [tempSettings, ...savedConfigs].slice(0, 5);
    setSavedConfigs(newConfigs);
    localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(newConfigs));
  };

  const removeHistoryItem = (index: number) => {
    if (isReadOnly) return;
    const newConfigs = [...savedConfigs];
    newConfigs.splice(index, 1);
    setSavedConfigs(newConfigs);
    localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(newConfigs));
  };

  const handleClearCache = () => {
    if (isReadOnly) return;
    localStorage.removeItem(CACHE_KEY);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  const testConnection = async () => {
    if (!tempSettings.apiKey) {
      setTestResult({ success: false, message: '请先输入 API Key' });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      if (tempSettings.useInternalProxy) {
        const isGemini = tempSettings.provider === 'gemini';
        const testPayload = isGemini 
          ? {
              model: tempSettings.modelName || 'gemini-3-flash-preview',
              contents: [{ role: 'user', parts: [{ text: 'test' }] }]
            }
          : {
              model: tempSettings.modelName || 'qwen-max',
              messages: [{ role: 'user', content: 'test message, reply with OK' }]
            };

        const res = await fetch('/api/ai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: tempSettings.proxyUrl,
            apiKey: tempSettings.apiKey,
            body: testPayload
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(`${res.status} ${errData.message || JSON.stringify(errData) || res.statusText}`);
        }
        setTestResult({ success: true, message: '内置中转测试成功！提示：请点击上方的【保存设置】或旁边的【保存这套配置】以使新参数生效！' });
      } else if (tempSettings.provider === 'openai') {
        const baseUrl = tempSettings.proxyUrl ? tempSettings.proxyUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
        const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
        const res = await fetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempSettings.apiKey}`
          },
          body: JSON.stringify({
            model: tempSettings.modelName || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'hello' }]
          })
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        setTestResult({ success: true, message: '连接成功！提示：请点击上方的【保存设置】或旁边的【保存这套配置】以使新参数生效！' });
      } else {
        const baseUrl = tempSettings.proxyUrl ? tempSettings.proxyUrl.replace(/\/$/, '') : 'https://generativelanguage.googleapis.com';
        let fetchUrl = `${baseUrl}/v1beta/models/${tempSettings.modelName || 'gemini-3-flash-preview'}:generateContent?key=${tempSettings.apiKey}`;
        if (tempSettings.proxyUrl && (tempSettings.proxyUrl.includes('/v1') || tempSettings.proxyUrl.includes('generateContent'))) {
           fetchUrl = tempSettings.proxyUrl.includes('?') ? `${tempSettings.proxyUrl}&key=${tempSettings.apiKey}` : `${tempSettings.proxyUrl}?key=${tempSettings.apiKey}`;
        }

        const responsePromise = fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
             contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
          }),
          signal: controller.signal
        }).then(async (r) => {
          if (!r.ok) {
            let errorText = '';
            try {
              const errData = await r.json();
              errorText = errData.message || errData.error?.message || JSON.stringify(errData);
            } catch (e) {
              errorText = await r.text().catch(() => 'Gemini API Error');
            }
            throw new Error(errorText);
          }
          return r.json();
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('请求超时')), 20000);
        });

        await Promise.race([responsePromise, timeoutPromise]);
        clearTimeout(timeoutId);
        setTestResult({ success: true, message: '连接成功！提示：请点击上方的【保存设置】或旁边的【保存这套配置】以使新参数生效！' });
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      let errMsg = e.message || '未知错误';
      if (errMsg.includes('signal is aborted') || errMsg.includes('Failed to fetch') || errMsg.includes('abort')) {
        errMsg = '请求被浏览器跨域(CORS)或网络超时拦截 (signal is aborted)。\n\n【排查与解决方法】：\n1. 请在下方开启【使用系统内置中转】开关，通过后端服务器代理即可 100% 绕过跨域限制；\n2. 您的 Key 为 sk- 开头，属于第三方/OpenAI格式，请将“模型提供商”切换为【OpenAI 兼容接口】，网关填入带 /v1 的完整地址（如 https://api-slb.packyapi.com/v1）。';
      }
      setTestResult({ success: false, message: `失败: ${errMsg}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue shrink-0">
                <Settings className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                   AI 匹配引擎配置
                   {hasChanges && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                         配置未保存
                      </span>
                   )}
                </h1>
                <p className="text-slate-500 text-sm font-medium">配置大模型 API、网关及匹配策略，提升识别精准度。</p>
             </div>
          </div>
          
          {/* 右侧常驻且极其醒目的保存选项 */}
          <div className="flex items-center gap-3 shrink-0">
             {saveSuccess && (
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 animate-in fade-in zoom-in duration-200 flex items-center gap-1.5">
                   <ShieldCheck className="w-4 h-4" />
                   配置保存成功并生效
                </div>
             )}
             
             <Button
                onClick={saveSettings}
                disabled={isReadOnly || isSaving}
                className={cn(
                   "h-12 px-6 rounded-xl text-white font-black transition-all active:scale-95 flex items-center gap-2",
                   hasChanges 
                     ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 animate-pulse" 
                     : "bg-brand-blue hover:bg-brand-blue/90"
                )}
             >
                {isSaving ? (
                   <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在保存...
                   </>
                ) : (
                   <>
                      <ShieldCheck className="w-4 h-4" />
                      保存设置 (Save)
                   </>
                )}
             </Button>
          </div>
        </div>

        {isReadOnly && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
            <Lock className="text-amber-500 w-5 h-5 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-800">当前处于只读模式</h3>
              <p className="text-amber-700 text-sm">您的账号对 AI 引擎配置仅有“只读”权限，配置无法被修改或保存。</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {isReadOnly && (
            <div className="absolute inset-0 z-50 bg-white/20 backdrop-blur-[1px]" />
          )}
           {/* Left side: Main Configuration */}
           <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden ring-1 ring-slate-200">
                 <CardHeader className="bg-white border-b border-slate-50 pb-6">
                    <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                       <Zap className="w-5 h-5 text-amber-500" />
                       核心连接设置
                    </CardTitle>
                    <CardDescription>
                       配置您的 AI 提供商信息。系统已内置代理网关，建议开启“内置中转”。
                    </CardDescription>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6 bg-white">
                     {/* 一键切换预设供应商模版 */}
                     <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-inner mb-6">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                             <RefreshCw className="w-3.5 h-3.5 text-brand-blue animate-spin" style={{ animationDuration: '6s' }} />
                             一键切换预设供应商模版 (Preset Templates)
                          </span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                             自动填入对应网关与模型推荐
                          </span>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 sm:grid-cols-3 gap-2">
                          {PROVIDER_PRESETS.map((preset) => {
                             const isSelected = tempSettings.provider === preset.provider && 
                                                (tempSettings.proxyUrl || '').toLowerCase().replace(/\/$/, '') === preset.proxyUrl.replace(/\/$/, '');
                             
                             return (
                                <button
                                   key={preset.id}
                                   type="button"
                                   onClick={() => {
                                      setTempSettings({
                                         ...tempSettings,
                                         provider: preset.provider as 'gemini' | 'openai',
                                         proxyUrl: preset.proxyUrl,
                                         modelName: preset.modelName
                                      });
                                   }}
                                   className={cn(
                                      "flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all active:scale-95 text-xs font-bold shadow-sm cursor-pointer",
                                      isSelected 
                                        ? "bg-brand-blue border-brand-blue hover:bg-brand-blue/95 text-white shadow-lg shadow-brand-blue/20 transform -translate-y-0.5" 
                                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                                   )}
                                >
                                   <span className="text-base shrink-0">{preset.iconText}</span>
                                   <span className="truncate">{preset.name}</span>
                                </button>
                             );
                          })}
                       </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="text-sm font-bold text-slate-700">模型提供商 (Provider)</Label>
                          <select 
                             className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none"
                             value={tempSettings.provider}
                             onChange={e => {
                               const newProvider = e.target.value as 'gemini' | 'openai';
                               setTempSettings({
                                 ...tempSettings, 
                                 provider: newProvider,
                                 modelName: newProvider === 'openai' ? 'qwen-max' : 'gemini-3-flash-preview',
                               });
                             }}
                          >
                             <option value="gemini">Google Gemini (GenAI SDK)</option>
                             <option value="openai">OpenAI 兼容接口 (千问/GPT等)</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-sm font-bold text-slate-700">模型标识 (Model)</Label>
                          <Input 
                             list="gemini-models"
                             value={tempSettings.modelName}
                             onChange={e => setTempSettings({...tempSettings, modelName: e.target.value})}
                             className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono font-bold"
                             placeholder={tempSettings.provider === 'openai' ? "例如: qwen-max" : "例如: gemini-3-flash-preview"}
                          />
                          {tempSettings.provider === 'gemini' && (
                            <datalist id="gemini-models">
                              <option value="gemini-3-flash-preview" />
                              <option value="gemini-2.5-flash" />
                              <option value="gemini-1.5-flash" />
                              <option value="gemini-1.5-pro" />
                              <option value="gemini-2.0-flash" />







                            </datalist>
                          )}
                          {tempSettings.provider === 'openai' && (
                            <datalist id="gemini-models">
                              <option value="claude-3-5-sonnet-latest" />
                               <option value="claude-3-7-sonnet-latest" />
                               <option value="claude-sonnet-4-6" />
                               <option value="claude-3-5-haiku-latest" />
                              <option value="deepseek-chat" />
                               <option value="deepseek-reasoner" />
                              <option value="moonshot-v1-8k" />
                               <option value="moonshot-v1-32k" />
                               <option value="moonshot-v1-128k" />
                              <option value="qwen-plus" />
                               <option value="qwen-max" />
                               <option value="qwen-turbo" />
                              <option value="glm-4-flash" />
                               <option value="glm-4-plus" />
                              <option value="gpt-4o" />
                               <option value="gpt-4o-mini" />
                            </datalist>
                          )}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-sm font-bold text-slate-700">API Key</Label>
                       <div className="relative">
                          <Input 
                             type={showApiKey ? "text" : "password"}
                             value={tempSettings.apiKey}
                             onChange={e => setTempSettings({...tempSettings, apiKey: e.target.value})}
                             className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono pr-12"
                             placeholder={tempSettings.provider === 'gemini' ? "AI Studio 环境变量已默认注入" : "输入 API Key"}
                          />
                          <button
                             type="button"
                             onClick={() => setShowApiKey(!showApiKey)}
                             className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                             {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-sm font-bold text-slate-700">接口网关 (Base URL / Proxy)</Label>
                       <Input 
                          value={tempSettings.proxyUrl}
                          onChange={e => setTempSettings({...tempSettings, proxyUrl: e.target.value})}
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 font-mono"
                          placeholder="https://api.proxy.com"
                       />
                       <p className="text-[11px] text-slate-400 font-medium">选填。如需代理访问 API 可在此配置。使用 OpenAI 模式时必填且需包含 /v1。</p>
                    </div>

                    <div className="space-y-4 pt-2">
                       <div className="flex flex-wrap items-center gap-3">
                          <Button 
                             onClick={testConnection} 
                             disabled={isTesting || !tempSettings.apiKey}
                             className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all active:scale-95"
                          >
                             {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                             测试连接
                          </Button>
                          
                          {/* 核心卡片下也放一个超级明显的保存设置按钮，确保任何一个操作触点都能保存配置 */}
                          <Button 
                             onClick={saveSettings} 
                             disabled={isReadOnly || isSaving}
                             className={cn(
                                "h-12 px-6 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2",
                                hasChanges 
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                                  : "bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md shadow-brand-blue/15"
                             )}
                          >
                             {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                             ) : (
                                <ShieldCheck className="w-4 h-4" />
                             )}
                             保存这套配置
                          </Button>

                          <Button 
                             onClick={saveToHistory} 
                             disabled={!tempSettings.apiKey}
                             variant="outline"
                             className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold transition-all active:scale-95"
                          >
                             <History className="w-4 h-4 mr-2" />
                             记忆此配置
                          </Button>
                       </div>

                       {(testResult || saveSuccess) && (
                          <div className="space-y-3 pt-1">
                             {saveSuccess && (
                                <div className="text-sm font-medium flex gap-3 animate-in fade-in slide-in-from-left-2 p-4 rounded-xl border text-emerald-700 bg-emerald-50 border-emerald-100">
                                   <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
                                   <div>
                                      <span className="font-extrabold mr-1">保存成功:</span>
                                      您的配置已成功写入并实时生效，现在可以使用匹配项目的深度审计与评审啦！
                                   </div>
                                </div>
                             )}
                             {testResult && (
                                <div className={cn(
                                   "text-sm font-medium flex gap-3 animate-in fade-in slide-in-from-left-2 p-4 rounded-xl border",
                                   testResult.success 
                                     ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                                     : "text-red-700 bg-red-50 border-red-100"
                                )}>
                                   <ShieldCheck className={cn("w-4.5 h-4.5 shrink-0 mt-0.5", testResult.success ? "text-emerald-500" : "text-red-500")} />
                                   <div className="break-all leading-relaxed max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                      <span className="font-extrabold mr-1">{testResult.success ? "连接测试成功" : "测试失败"}:</span>
                                      {testResult.message}
                                   </div>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl overflow-hidden ring-1 ring-slate-200">
                 <CardHeader className="bg-white border-b border-slate-50">
                    <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                       <Bug className="w-5 h-5 text-slate-400" />
                       高级匹配策略
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6 bg-white">
                    {/* Module Temperature Settings */}
                    <div className="space-y-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                      <div className="space-y-1">
                        <Label className="text-base font-black text-slate-800 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-brand-blue" />
                          标签模块温度设置 (Temperature)
                        </Label>
                        <p className="text-xs text-slate-500 font-medium italic">为每个功能模块设置独立的采样温度。0 为逻辑最严密（推荐搜素），1 为最具创造力。</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {[
                          { id: 'search', name: '范围检索', desc: '匹配逻辑深度' },
                          { id: 'audit', name: '项目评审', desc: '风险挖掘强度' },
                          { id: 'schedule', name: '排程建议', desc: '时间编排弹性' },
                        ].map((m) => (
                          <div key={m.id} className="space-y-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-blue-200">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-bold text-slate-700">{m.name}</Label>
                              <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded">
                                {tempSettings.moduleSettings?.[m.id as keyof typeof tempSettings.moduleSettings]?.temperature ?? 0}
                              </span>
                            </div>
                            <input 
                               type="range" 
                               min="0" 
                               max="1" 
                               step="0.05"
                               value={tempSettings.moduleSettings?.[m.id as keyof typeof tempSettings.moduleSettings]?.temperature ?? 0}
                               onChange={e => {
                                 const val = parseFloat(e.target.value);
                                 setTempSettings({
                                   ...tempSettings,
                                   moduleSettings: {
                                     ...tempSettings.moduleSettings,
                                     [m.id]: { temperature: val }
                                   }
                                 });
                               }}
                               className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                            />
                            <p className="text-[9px] text-slate-400 text-right">{m.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="space-y-1 flex-1 pr-8">
                          <Label className="text-base font-black text-slate-800">界面显示比例 (UI Scale)</Label>
                          <p className="text-xs text-slate-500 font-medium italic">调整界面整体缩放倍率，适配不同分辨率显示器。默认 100%。</p>
                          <div className="flex items-center gap-4 mt-3">
                             <input 
                                type="range" 
                                min="80" 
                                max="130" 
                                step="5"
                                value={tempSettings.uiScale || 100}
                                onChange={e => setTempSettings({...tempSettings, uiScale: parseInt(e.target.value)})}
                                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                             />
                             <span className="text-sm font-black text-brand-blue w-12">{tempSettings.uiScale || 100}%</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="space-y-1">
                          <Label className="text-base font-black text-slate-800">使用系统内置中转</Label>
                          <p className="text-xs text-slate-500 font-medium italic">解决浏览器跨域（CORS）报错，推荐在网页端环境下开启。</p>
                       </div>
                       <Switch 
                          checked={tempSettings.useInternalProxy}
                          onCheckedChange={(c) => setTempSettings({...tempSettings, useInternalProxy: c})}
                       />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="space-y-1">
                          <Label className="text-base font-black text-slate-800">Debug 开发者模式</Label>
                          <p className="text-xs text-slate-500 font-medium">在浏览器控制台输出详细的 AI 检索日志与响应 Raw 数据。</p>
                       </div>
                       <Switch 
                          checked={tempSettings.isDebug}
                          onCheckedChange={(c) => setTempSettings({...tempSettings, isDebug: c})}
                       />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="space-y-1">
                          <Label className="text-base font-black text-slate-800">匹配引擎缓存</Label>
                          <p className="text-xs text-slate-500 font-medium">清除本地存储的 AI 匹配结果缓存，强制重新请求大模型。</p>
                       </div>
                       <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleClearCache}
                          className={cn(
                             "h-10 rounded-xl transition-all font-bold px-4",
                             cacheCleared ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-slate-600"
                          )}
                       >
                          {cacheCleared ? "已清除记忆" : "重置所有缓存"}
                       </Button>
                    </div>
                 </CardContent>
              </Card>

              {/* Float Action Button / Bottom Bar for Saving */}
              <div className={cn(
                 "sticky bottom-8 h-20 bg-slate-900 rounded-3xl shadow-2xl flex items-center justify-between px-8 transition-all scale-95 opacity-0 pointer-events-none",
                 hasChanges && "scale-100 opacity-100 pointer-events-auto"
              )}>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center animate-pulse">
                       <RefreshCw className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                       <h3 className="text-white font-black text-sm">配置已变更</h3>
                       <p className="text-slate-400 text-xs font-medium">请点击保存以应用新的接口设置。</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <Button 
                       variant="ghost" 
                       className="text-slate-400 hover:text-white font-bold"
                       onClick={() => setTempSettings(settings)}
                    >
                       放弃更改
                    </Button>
                    <Button 
                       className="bg-brand-blue hover:bg-blue-600 text-white font-black px-8 rounded-xl h-12 shadow-lg shadow-brand-blue/20"
                       onClick={saveSettings}
                    >
                       保存设置
                    </Button>
                 </div>
              </div>
           </div>

           {/* Right side: History and Status */}
           <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden ring-1 ring-slate-200">
                 <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                    <CardTitle className="text-sm font-black text-slate-600 flex items-center gap-2">
                       <History className="w-4 h-4" />
                       最近配置 (Memory)
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 bg-white space-y-4">
                    {savedConfigs.length === 0 ? (
                       <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                          <Database className="w-10 h-10" />
                          <p className="text-sm font-medium">暂无历史配置</p>
                       </div>
                    ) : (
                       savedConfigs.map((cfg, idx) => (
                          <div 
                             key={idx}
                             className={cn(
                                "group p-4 rounded-2xl border border-slate-100 hover:border-brand-blue/30 hover:bg-brand-blue/[0.02] transition-all relative cursor-pointer",
                                tempSettings.apiKey === cfg.apiKey && tempSettings.modelName === cfg.modelName && "border-brand-blue/50 bg-brand-blue/[0.05]"
                             )}
                             onClick={() => setTempSettings(cfg)}
                          >
                             <div className="flex flex-col gap-1">
                                <span className="text-sm font-black text-slate-800">{cfg.modelName}</span>
                                <span className="text-[10px] font-mono text-slate-400 truncate">{cfg.apiKey.substring(0, 15)}...</span>
                                <span className="text-[10px] font-bold text-brand-blue uppercase">{cfg.provider}</span>
                             </div>
                             <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 text-slate-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); removeHistoryItem(idx); }}
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                          </div>
                       ))
                    )}
                 </CardContent>
              </Card>

              <div className="p-8 rounded-3xl bg-brand-blue/5 border border-brand-blue/10 space-y-4">
                 <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white">
                    <Database className="w-5 h-5" />
                 </div>
                 <h3 className="text-lg font-black text-brand-dark leading-tight">接口中转提示</h3>
                 <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    如果您在国内或受限网络下使用，建议将 Gemini 的 Base URL 配置为转发地址，或者开启<b>内置中转</b>开关以使用本系统的统一代理层。
                 </p>
                 <div className="pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-brand-blue">
                       <Zap className="w-3.5 h-3.5" />
                       连接稳定度建议：≥ 95%
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
