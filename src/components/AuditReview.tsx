import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Bot, User, Send, Loader2, 
  Trash2, ChevronDown, ChevronUp, 
  Sparkles, Copy, Check, ShieldAlert, 
  HelpCircle, Download, Upload
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { checkCompanyRisk, extractBusinessLicenseOCR } from '../services/auditService';
import { fetchFullCompanyData } from '../services/tianyanchaService';
import { useAuth } from '../lib/auth-context';
import { callAI } from '../services/aiService';
import { getRulesForSystems } from '../lib/auditRules';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Preset companies for quick demonstration
const PRESET_COMPANIES = [
  "苏州市净化设备机械加工厂",
  "浙江华策影视股份有限公司",
  "深圳市腾讯计算机系统有限公司"
];

// Preset compliance questions for quick chat triggers
const PRESET_QUESTIONS = [
  "机加工企业在体系认证中强制要求环评报告还是排污备案手续？",
  "QMS质量管理体系(ISO9001)通常需要准备哪些最核心的文件和卷宗？",
  "危化品、特种设备等特定高危行业在申请体系时有哪些行政许可资质要求？",
  "高新技术企业在申请ISO三大体系(质量/环境/职业健康)时有何评审便利？"
];

// Supported certification systems
const SYSTEM_OPTIONS = [
  { id: 'MULTI', name: '常规多体系 (QMS+EMS+OHSMS)', desc: '质量、环境、职业健康安全三体系一体化认证申报比对与合规性评价' },
  { id: 'INFO_MULTI', name: '信息双体系 (ISMS+ITSMS)', desc: '信息安全、信息技术服务管理体系（双体系）申报合规审查' },
  { id: 'INFO_FIVE', name: '信息五体系 (Q+E+S+ISMS+ITSMS)', desc: '质量、环境、职业健康安全、信息安全、信息技术服务五体系综合大评审' },
  { id: 'QMS', name: '质量管理体系 (ISO 9001)', desc: 'GB/T 19001-2016 质量管理体系要求与认监委最新受理规则' },
  { id: 'EMS', name: '环境管理体系 (ISO 14001)', desc: 'GB/T 24001-2016 环境许可资质、环境因素与排污注册合规' },
  { id: 'OHSMS', name: '职业健康安全管理体系 (ISO 45001)', desc: 'GB/T 45001-2020 生产、消防、危化品资质与多场所风控审核' },
  { id: 'ISMS', name: '信息安全管理体系 (ISO 27001)', desc: 'GB/T 22080 信息保密协议、网络安全和敏感物理区域审查' },
  { id: 'ITSMS', name: '信息技术服务管理体系 (ISO 20000)', desc: 'ISO/IEC 20000-1 服务目录、服务级别协议（SLA）与IT运行审计' }
];

// Inline streaming message component for typing & think effects
const InlineAssistantMessage = ({ content, isLast }: { content: string, isLast: boolean }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(isLast);
  const [isThinkExpanded, setIsThinkExpanded] = useState(true);
  
    useEffect(() => {

    if (!isLast) {
      setDisplayedContent(content);
      setIsTyping(false);
      setIsThinkExpanded(false);
      return;
    }
    let i = 0;
    setDisplayedContent('');
    setIsTyping(true);
    setIsThinkExpanded(true);
    
    const interval = setInterval(() => {
      setDisplayedContent(content.substring(0, i));
      i += Math.floor(Math.random() * 5) + 1; // 1-5 chars at a time
      if (i > content.length) {
        setDisplayedContent(content);
        setIsTyping(false);
        clearInterval(interval);
        
        // Auto collapse think block after typing finishes
        setTimeout(() => setIsThinkExpanded(false), 2000);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [content, isLast]);

  // Extract <think> tags for special styling
  const thinkMatch = displayedContent.match(/<think>([\s\S]*?)(<\/think>|$)/);
  let mainContent = displayedContent;
  let thinkContent = null;
  
  if (thinkMatch) {
    thinkContent = thinkMatch[1];
    mainContent = displayedContent.replace(thinkMatch[0], '');
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {thinkContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden shadow-inner">
              <button
                onClick={() => setIsThinkExpanded(!isThinkExpanded)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI 推理过程</span>
                </div>
                {isThinkExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              
              <AnimatePresence>
                {isThinkExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="px-4 pb-3 text-[11px] text-slate-500 font-mono leading-relaxed opacity-80 border-t border-slate-100 mt-1 pt-3">
                      {thinkContent}
                      {isTyping && !mainContent && <span className="inline-block w-1.5 h-3.5 bg-slate-400 ml-1 animate-pulse align-middle" />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {mainContent && (
        <div className="text-sm leading-relaxed text-slate-700">
          <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>
            {mainContent}
          </ReactMarkdown></div>
          {isTyping && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />}
        </div>
      )}
    </div>
  );
};

export default function AuditReview() {
  const { authState } = useAuth();
  const user = authState.user;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // States
  const [bainiuStatus, setBainiuStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [bainiuErrorMsg, setBainiuErrorMsg] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>(() => {
    try {
      return localStorage.getItem('audit_review_company_name_v3') || '';
    } catch { return ''; }
  });
  
  const [companyRiskInfo, setCompanyRiskInfo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('audit_review_risk_info_v3') || null;
    } catch { return null; }
  });
  
  const [chatMessages, setChatMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('audit_review_chat_msgs_v3');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [isCheckingRisk, setIsCheckingRisk] = useState<boolean>(false);
  
  const [applicationScope, setApplicationScope] = useState<string>(() => {
    try {
      return localStorage.getItem('audit_review_app_scope_v3') || '';
    } catch { return ''; }
  });
  
  const [applicationCount, setApplicationCount] = useState<string>(() => {
    try {
      return localStorage.getItem('audit_review_app_count_v3') || '';
    } catch { return ''; }
  });
  
  const [declaredAddress, setDeclaredAddress] = useState<string>(() => {
    try {
      return localStorage.getItem('audit_review_declared_address_v3') || '';
    } catch { return ''; }
  });

  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrSuccess, setOcrSuccess] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  
  const [searchedHistory, setSearchedHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('audit_review_searched_history_v4');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist states to local storage
  useEffect(() => {
    try {
      localStorage.setItem('audit_review_company_name_v3', companyName);
    } catch {}
  }, [companyName]);
  
  useEffect(() => {
    try {
      localStorage.setItem('audit_review_app_scope_v3', applicationScope);
    } catch {}
  }, [applicationScope]);
  
  useEffect(() => {
    try {
      localStorage.setItem('audit_review_app_count_v3', applicationCount);
    } catch {}
  }, [applicationCount]);
  
  useEffect(() => {
    try {
      localStorage.setItem('audit_review_declared_address_v3', declaredAddress);
    } catch {}
  }, [declaredAddress]);

  useEffect(() => {
    try {
      if (companyRiskInfo) {

        localStorage.setItem('audit_review_risk_info_v3', companyRiskInfo);
      } else {
        localStorage.removeItem('audit_review_risk_info_v3');
      }
    } catch {}
  }, [companyRiskInfo]);

  useEffect(() => {
    try {
      localStorage.setItem('audit_review_chat_msgs_v3', JSON.stringify(chatMessages));
    } catch {}
    // Scroll list when chat updates
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Execute One-Key Risk Check (02 功能)
  const handleCheckCompany = async (targetName: string = companyName) => {
    const trimmed = targetName.trim();
    if (!trimmed) return;
    
    setIsCheckingRisk(true);
    setCompanyRiskInfo(null);
    setBainiuStatus('loading');
    setBainiuErrorMsg('');
    
    try {
      let companyDataStr = "";
      try {
        // Call Tianyancha Open APIs (工商基本信息 + 资质证书) with local cache
        const { icData, certData } = await fetchFullCompanyData(trimmed);
        
        setBainiuStatus('success');
        const isFromCache = icData.fromCache || certData.fromCache;
        if (isFromCache) {
          setBainiuErrorMsg('来自本地缓存');
        } else {
          setBainiuErrorMsg('');
        }
        companyDataStr = JSON.stringify({ icData, certData });
      } catch (err: any) {
        setBainiuStatus('error');
        setBainiuErrorMsg(err.message || '获取工商及资质数据失败');
      }

      const riskReport = await checkCompanyRisk(
        trimmed, 
        applicationScope.trim(), 
        applicationCount.trim(),
        declaredAddress.trim(),
        companyDataStr
      );
      setCompanyRiskInfo(riskReport);

      // Add to searchedHistory cache
      setSearchedHistory(prev => {
        const filtered = prev.filter(item => item !== trimmed);
        const updated = [trimmed, ...filtered].slice(0, 3);
        try {
          localStorage.setItem('audit_review_searched_history_v4', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      
      // Smart matching behavior: feed the chatbot with the new verified state
      const matchUpdateMsg: Message = {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `<think>用户一键核查了 [${trimmed}] 的信用与合规风险。我应当主动表明态度，并随时准备解答围绕该企业的行业合规资质疑问。</think>我已同步获悉企业 **${trimmed}** 的合规信用核查。您可以继续在右侧对话框中，向我提问关于此企业相关行业的特定资质审批、许可规范、环评或者认证规则！`
      };
      setChatMessages(prev => [...prev, matchUpdateMsg]);

    } catch (e: any) {
      console.error("Check Company Error", e);
      setCompanyRiskInfo("⚠️ 查验失败：" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsCheckingRisk(false);
    }
  };

  // Chat message submission (合规咨询功能)
  const handleSendMessage = async (textToSend: string = chatInput) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isChatLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Build smart contextual backdrop including verified corporate metadata
      const conversationHistory = chatMessages
        .slice(-8) // keep last 8 messages for context density
        .map(m => `${m.role === 'user' ? '用户' : '智能助手'}: ${m.content}`)
        .join('\n');

      const backendRules = getRulesForSystems('INFO_FIVE');

      const systemPrompt = `你是一个专业的认证合规咨询助手。请基于严谨的行业认证规则，解答用户的合规及资质咨询。
你可以深度解答关于：申请材料要求、特定业务经营资质许可、是否涉及环评报告、消防合规、CCC强制认证范围等。

【后台硬性体系审核与评审规则手稿】
你必须熟知并遵循以下常见管理体系（QMS、EMS、OHSMS、ISMS、ITSMS）的后台评审规则与标准依据，以便在解答合规咨询时提供最权威、最切合要求的判定：
${backendRules}

【重要行业与实务提示】
1. 【机械加工行业环境合规】机械加工工艺不强制要求环评许可，企业提供《固定污染源排污登记表》/排污登记备案即可。
2. 【特殊许可核查】生产型企业通常需排污登记或排污许可、下证须满3个月；特种行业如建筑、矿山、危化等须安全生产许可证等。
3. 【免除与豁免规则】
   - 转机构项目免于核查“原发证机构证书复印件”和“上一周期历次审核报告及不符合项整改资料”。
   - ISMS与ITSMS体系，不强制要求在申报阶段提供《适用性声明(SOA)》或《信息安全风险评估材料》。
4. 【多场所与人力派遣】若组织涉及“人力资源”、“劳务派遣”等业务，必须核查《人力资源服务许可证》或《劳务派遣经营许可证》，且此类行业极大可能涉及“多场所/外派派驻点”，应当在方案策划中提示多场所核查并提议增加审核人日。

${companyName ? `【当前受审企业关联背景】目前正在核查并聚焦的企业是: "${companyName}"。如果用户的问题和此企业息息相关，请融入该企业可能涉及的行业属性（如净化、软件、制造等），结合上述后台评审规则给出高度契合、精准定制的建议。` : ''}

【重要排版指令】请务必按以下格式输出你的回答：
1. 首先，用 <think> 和 </think> 标签包裹你的推理、逻辑比对与深度思考过程。在思考过程中，应当体现你是如何调用上述后台评审规则进行推导与行业法律法规比对的。
2. 然后，在标签之后，输出你条理清晰、具备说服力的最终专业合规解答。`;

      const prompt = `
${systemPrompt}

对话上下文:
${conversationHistory}
用户最新提问: ${trimmed}
智能助手专业解答: `;

      const response = await callAI(prompt, { module: 'audit', temperature: 0.25 });
      
      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.text || '抱歉，暂时未能获取到合规分析结论，请您稍后重试。'
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('Chat AI query error:', error);
      const errMsg: Message = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: `❌ **合规引擎调用失败**: ${error.message || '网络连接或API请求异常。'}`
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyRiskReport = () => {
    if (!companyRiskInfo) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(companyRiskInfo).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch((err) => {
          console.warn('Clipboard write failed, using fallback:', err);
          fallbackCopyReport(companyRiskInfo);
        });
      } else {
        fallbackCopyReport(companyRiskInfo);
      }
    } catch (e) {
      console.warn('Clipboard access blocked:', e);
      fallbackCopyReport(companyRiskInfo);
    }
  };

  const fallbackCopyReport = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
  };

  const exportRiskReport = () => {
    if (!companyRiskInfo) return;
    const blob = new Blob([companyRiskInfo], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = companyName.trim().replace(/[\/\\?%*:|"<>]/g, '-');
    link.setAttribute('download', `合规核查报告-${sanitizedName || '未命名企业'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearLeftPanel = () => {
    setCompanyName('');
    setCompanyRiskInfo(null);
    setDeclaredAddress('');
        setApplicationScope('');
    setApplicationCount('');
              };

  const clearRightPanel = () => {
    setChatMessages([
      {
        id: 'init',
        role: 'assistant',
        content: '您好！我是您的智能认证合规顾问。我可以协助您查验受审企业在公共信用、行政处罚方面的风险，也可以解答各种关于管理体系申报、特定业务许可要求、环评以及CCC认证等专业的合规细节。请问有什么我可以帮您的？'
      }
    ]);
    try {
      localStorage.removeItem('audit_review_chat_msgs_v3');
    } catch {}
  };

  const clearRiskState = () => {
    setCompanyName('');
    setCompanyRiskInfo(null);
    setDeclaredAddress('');
      };

  const resetAllHistory = () => {
    setCompanyName('');
    setCompanyRiskInfo(null);
    setDeclaredAddress('');
        setChatMessages([
      {
        id: 'init',
        role: 'assistant',
        content: '您好！我是您的智能认证合规顾问。我可以协助您查验受审企业在公共信用、行政处罚方面的风险，也可以解答各种关于管理体系申报、特定业务许可要求、环评以及CCC认证等专业的合规细节。请问有什么我可以帮您的？'
      }
    ]);
    setSearchedHistory([
      "苏州市净化设备机械加工厂",
      "浙江华策影视股份有限公司",
      "深圳市腾讯计算机系统有限公司"
    ]);
    try {
      localStorage.removeItem('audit_review_company_name_v3');
      localStorage.removeItem('audit_review_risk_info_v3');
      localStorage.removeItem('audit_review_chat_msgs_v3');
      localStorage.removeItem('audit_review_searched_history_v4');
      localStorage.removeItem('audit_review_declared_address_v3');
      localStorage.removeItem('audit_review_declared_legal_person_v3');
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fdfdff] overflow-y-auto p-4 md:p-8 selection:bg-indigo-500 selection:text-white" id="container-audit-review">
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-14">
        
        {/* Modern Display Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black tracking-widest border border-indigo-100/50 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Corporate Compliance & Intelligence Check
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              项目<span className="text-indigo-600">合规</span>与风险查验
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
              支持对受审组织开展秒级公共信用合规风险核查，结合大模型为您提供全生命周期体系认证合规咨询。
            </p>
          </div>
          
          <Button 
            onClick={resetAllHistory}
            variant="outline"
            className="self-start md:self-center border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 hover:bg-red-50/50 rounded-xl font-bold text-xs h-10 px-4 gap-1.5 transition-all shadow-sm"
            id="btn-clear-all"
          >
            <Trash2 className="w-4 h-4" />
            重置全部对话与查验
          </Button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: 02 Corporate Risk Audit (5/12) */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border-none shadow-xl shadow-slate-100/70 bg-white rounded-[24px] overflow-hidden border border-slate-100" id="card-company-audit">
                  <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100/80 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/30">
                          <Building2 className="w-5.5 h-5.5" />
                        </div>
                        <div>
                          <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-snug">申请项目一键核查</h2>
                          <p className="text-xs text-slate-400 font-medium">多因子输入穿透比对企业资质、信用与合规风险</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={clearLeftPanel}
                        variant="outline"
                        className="border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 hover:bg-red-50/50 rounded-xl font-bold text-xs h-9 px-3 gap-1 transition-all shadow-sm shrink-0 font-sans"
                        id="btn-clear-left-panel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>清除输入</span>
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-5">
                    {/* Search Input Box with Multi-field Check */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 pl-1">企业法定全称</label>
                        <input 
                          type="text"
                          id="input-company-name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCheckCompany();
                            }
                          }}
                          placeholder="请输入准确的公司全称..."
                          className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 pl-1 flex items-center gap-1">
                            申请范围 <span className="text-[10px] text-slate-400 font-normal">(选填)</span>
                          </label>
                          <textarea 
                            id="input-app-scope"
                            value={applicationScope}
                            onChange={(e) => setApplicationScope(e.target.value)}
                            placeholder="例如: 塑料制品的制造"
                            className="w-full h-20 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-inner resize-y"
                          ></textarea>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 pl-1 flex items-center gap-1">
                            申请人数 <span className="text-[10px] text-slate-400 font-normal">(选填)</span>
                          </label>
                          <input 
                            type="text"
                            id="input-app-count"
                            value={applicationCount}
                            onChange={(e) => setApplicationCount(e.target.value)}
                            placeholder="例如: 120"
                            className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <label className="text-xs font-bold text-slate-500 pl-1 flex items-center gap-1">
                          申请认证地址 <span className="text-[10px] text-slate-400 font-normal">(选填)</span>
                        </label>
                        <input 
                          type="text"
                          id="input-declared-address"
                          value={declaredAddress}
                          onChange={(e) => setDeclaredAddress(e.target.value)}
                          placeholder="例如: 南京市江北新区"
                          className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                        />
                      </div>

                      {/* Bainiu API Status Light */}
                      {(bainiuStatus !== 'idle') && (
                        <div className="flex items-center gap-2 text-xs font-bold px-1 mt-2">
                          <div className={[
                            "w-2 h-2 rounded-full",
                            bainiuStatus === 'loading' ? "bg-amber-400 animate-pulse" :
                            bainiuStatus === 'success' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                          ].filter(Boolean).join(" ")} />
                          <span className={[
                            bainiuStatus === 'loading' ? "text-amber-600" :
                            bainiuStatus === 'success' ? "text-emerald-600" : "text-rose-600"
                          ].filter(Boolean).join(" ")}>
                            {bainiuStatus === 'loading' ? '正在连接天眼查数据接口...' : 
                             bainiuStatus === 'success' ? `天眼查工商与资质数据获取成功 ${bainiuErrorMsg ? `(${bainiuErrorMsg})` : ''}` : 
                             `数据获取失败 (${bainiuErrorMsg})`}
                          </span>
                        </div>
                      )}
                      
                      <Button
                      onClick={() => handleCheckCompany()}
                      disabled={isCheckingRisk || !companyName.trim()}
                        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all active:scale-[0.98] shadow-sm shadow-indigo-100 flex items-center justify-center gap-2"
                        id="btn-start-audit"
                      >
                        {isCheckingRisk ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>正在穿透核查中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 fill-white/10" />
                            <span>一键智能排查</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Dynamic History Cache Chips */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-400 pl-1">历史查验企业缓存 (可点击一键复用)：</span>
                      <div className="space-y-2">
                        {/* Line 1: first 2 items */}
                        {searchedHistory.slice(0, 2).length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {searchedHistory.slice(0, 2).map((name) => (
                              <button
                                key={name}
                                onClick={() => {
                                  setCompanyName(name);
                                  handleCheckCompany(name);
                                }}
                                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200/40 transition-colors"
                                id={`btn-preset-${name}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-300 pl-1">暂无历史查验记录</p>
                        )}
                        
                        {/* Line 2: third item */}
                        {searchedHistory.length > 2 && (
                          <div className="flex flex-wrap gap-2">
                            {searchedHistory.slice(2, 3).map((name) => (
                              <button
                                key={name}
                                onClick={() => {
                                  setCompanyName(name);
                                  handleCheckCompany(name);
                                }}
                                className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200/40 transition-colors"
                                id={`btn-preset-${name}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Risk results status / blank placeholder */}
                    <AnimatePresence mode="wait">
                      {isCheckingRisk ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-8 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center gap-4 py-12"
                        >
                          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">正在穿透全网数据比对...</p>
                            <p className="text-xs text-slate-400 font-medium max-w-xs">正在分析行政处罚、经营异常、严重失信及公共信用主体数据</p>
                          </div>
                        </motion.div>
                      ) : companyRiskInfo ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="rounded-2xl border border-indigo-100/80 bg-indigo-50/10 overflow-hidden relative"
                        >
                          {/* Control banner */}
                          <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/40 border-b border-indigo-100/50">
                            <div className="flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4 text-indigo-600" />
                              <span className="text-xs font-black text-indigo-700">公共信用与合规排查报告</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={exportRiskReport}
                                className="p-1.5 hover:bg-white rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                title="一键导出报告"
                                id="btn-export-risk"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>一键导出</span>
                              </button>
                              <button
                                onClick={copyRiskReport}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                title="复制查验结果"
                                id="btn-copy-risk"
                              >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={clearRiskState}
                                className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                title="清除查验结果"
                                id="btn-clear-risk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Display Markdown */}
                          <div className="p-8 max-h-[600px] overflow-y-auto text-sm md:text-[15px] text-slate-700 bg-white border border-slate-100 rounded-xl prose prose-slate max-w-none 
                            prose-p:leading-relaxed prose-p:my-3 
                            prose-li:my-2 prose-li:leading-relaxed 
                            prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight 
                            prose-h1:text-2xl prose-h1:mt-2 prose-h1:mb-5 prose-h1:pb-3 prose-h1:border-b prose-h1:border-slate-100
                            prose-h3:text-[16px] prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-black prose-h3:text-slate-800 prose-h3:border-l-4 prose-h3:border-indigo-500 prose-h3:pl-3
                            prose-hr:my-6 prose-hr:border-slate-100
                            prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/30 prose-blockquote:px-5 prose-blockquote:py-4 prose-blockquote:my-4 prose-blockquote:rounded-r-xl prose-blockquote:shadow-sm"
                          >
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({node, ...props}) => (
                                  <div className="w-full overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm">
                                    <table className="w-full text-sm text-left border-collapse" {...props} />
                                  </div>
                                ),
                                th: ({node, ...props}) => <th className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-bold text-slate-700 whitespace-nowrap" {...props} />,
                                td: ({node, ...props}) => <td className="border-b border-slate-100 px-4 py-3 min-w-[120px] break-words whitespace-normal" {...props} />
                              }}
                            >
                              {companyRiskInfo}
                            </ReactMarkdown>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-8 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-3 py-14 bg-slate-50/50"
                        >
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <HelpCircle className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-700">暂无查验报告</p>
                            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                              请输入企业法定全称并点击“一键查验”，深度分析该组织的合规背景风险。
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>


              </div>

              {/* Right Column: Embedded Chatbot (7/12) */}
              <div className="lg:col-span-7">
                <Card className="border-none shadow-xl shadow-slate-100/70 bg-white rounded-[24px] overflow-hidden border border-slate-100 flex flex-col h-[760px]" id="card-compliance-chat">
                  
                  {/* Header */}
                  <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100/80 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/30">
                          <Bot className="w-5.5 h-5.5" />
                        </div>
                        <div>
                          <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-snug">合规咨询专家系统</h2>
                          <p className="text-xs text-slate-400 font-medium">后台调用常见体系的评审规则及大模型查询对应行业相关法律法规要求</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {companyName && (
                          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-700 rounded-full animate-pulse">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <span>关联对象: {companyName.length > 8 ? companyName.substring(0, 8) + '...' : companyName}</span>
                          </div>
                        )}
                        <Button
                          onClick={clearRightPanel}
                          variant="outline"
                          className="border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 hover:bg-red-50/50 rounded-xl font-bold text-xs h-9 px-3 gap-1 transition-all shadow-sm font-sans"
                          id="btn-clear-right-panel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>清除对话</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Chat Message List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
                    <AnimatePresence initial={false}>
                      {chatMessages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 border-indigo-200/50' 
                                : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border-slate-300/40'
                            }`}>
                              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            
                            {/* Message Bubble */}
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed transition-all shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-sm font-medium shadow-indigo-100/50' 
                                : 'bg-white border border-slate-200/80 rounded-tl-sm text-slate-800'
                            }`}>
                              {msg.role === 'user' ? (
                                msg.content
                              ) : (
                                <InlineAssistantMessage content={msg.content} isLast={msg.id === chatMessages[chatMessages.length - 1].id} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {isChatLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex gap-3 max-w-[85%] flex-row">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300/40 shadow-sm">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="p-4 rounded-2xl text-sm bg-white border border-slate-200 shadow-sm text-slate-700 rounded-tl-sm flex items-center gap-2.5">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span className="text-slate-500 font-bold">合规智库正在精准比对检索中...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input Section */}
                  <div className="p-5 border-t border-slate-100 bg-white shrink-0 space-y-4">
                    
                    {/* Clickable Quick Question Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase pl-1 block">大家都在问的常见问题：</span>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
                        {PRESET_QUESTIONS.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            className="whitespace-nowrap text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100/30 transition-colors shrink-0"
                            id={`btn-preset-q-${idx}`}
                          >
                            {q.length > 20 ? q.substring(0, 18) + '...' : q}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input Bar */}
                    <div className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          id="input-compliance-chat"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="输入关于特定许可、环评要求、CCC认证等合规提问..."
                          className="w-full h-12 pl-4 pr-14 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white shadow-inner"
                          disabled={isChatLoading}
                        />
                        <Button 
                          size="icon" 
                          className="absolute right-1.5 top-1.5 h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-100"
                          onClick={() => handleSendMessage()}
                          disabled={!chatInput.trim() || isChatLoading}
                          id="btn-send-message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                </Card>
              </div>

            </div>

      </div>
    </div>
  );
}
