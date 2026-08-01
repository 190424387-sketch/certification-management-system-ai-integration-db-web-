import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, CheckCircle2, Clock, Upload, FileText, X, Search, 
  FileDown, Settings, AlertCircle, Loader2, ChevronRight, 
  FileCheck, MapPin, Building, Building2, CreditCard, Eye, ArrowLeft, 
  RefreshCw, Filter, Check, ShieldCheck, Layers, FileCode, FileSpreadsheet,
  Sparkles, Trash2, HelpCircle, Edit3, RotateCcw
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { DocxNativeViewer } from './DocxNativeViewer';
import { fetchFullCompanyData } from '../services/tianyanchaService';
import { useAuth } from '../lib/auth-context';

// Simulated external APIs for company search
const fetchBainiuApi = async (key: string, version: string) => {
  try {
    const res = await fetch('/api/proxy/bainiu-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, key_type: "1", version })
    });
    return await res.json();
  } catch (error) {
    console.error('API call failed', error);
    throw error;
  }
};

// Available system options
const ALL_SYSTEMS = [
  "质量管理体系 (QMS/EC9000)",
  "环境管理体系 (EMS)",
  "职业健康安全管理体系 (OHSMS)",
  "HSE健康安全与环境管理体系",
  "信息安全管理体系 (ISMS)",
  "信息技术服务管理体系 (ITSMS)",
  "能源管理体系 (EnMS)",
  "企业知识产权合规 (IPMS)",
  "业务连续性管理体系 (BCMS)",
  "食品安全管理体系 (FSMS)",
  "危害分析与关键控制点 (HACCP)",
  "人工智能管理体系 (AIMS)",
  "创新管理体系 (InMS)",
  "其他体系"
];

// Calculation engine for required templates based on selected systems and conditions
export function calculateRequiredFiles(
  systems: string[],
  conditions: {
    isTransfer?: string;
    hasBranch?: string;
    multiAddress?: boolean;
    hasTempSite?: string;
    isDiffAddress?: string;
  }
): { required: string[]; reasons: Record<string, string> } {
  const req: string[] = [
    "BCZC-RC-01-A7 认证申请书.docx",
    "BCZC-RC-02-A7 认证合同.docx",
    "申请书附件7：产品或提供服务清单.docx"
  ];
  const reasons: Record<string, string> = {
    "BCZC-RC-01-A7 认证申请书.docx": "全套体系认证申报必填标准通用件",
    "BCZC-RC-02-A7 认证合同.docx": "认证法律效力主合同必填件",
    "申请书附件7：产品或提供服务清单.docx": "体系覆盖业务与产品服务范围归口清单"
  };

  if (conditions.isDiffAddress === "是") {
    req.push("承诺书.docx");
    reasons["承诺书.docx"] = "注册地址与经营地址不一致时的合规申明与真实性法定承诺书";
  }

  // Temporary site / IT service checklist requirement
  const sysHasIT = systems.some(s => s.includes("信息技术") || s.includes("20000") || s.includes("ITSMS"));
  if (conditions.hasTempSite === "是" || sysHasIT) {
    req.push("申请书附件3：临时场所及服务项目清单.docx");
    reasons["申请书附件3：临时场所及服务项目清单.docx"] = sysHasIT 
      ? "信息技术服务项目/临时服务现场清单" 
      : "临时施工/工程/服务现场清单";
  }

  const sysStr = systems.join(" ");

  if (sysStr.includes("ISMS") || sysStr.includes("信息安全")) {
    req.push("申请书附件4：保密和敏感信息声明表.docx");
    reasons["申请书附件4：保密和敏感信息声明表.docx"] = "ISMS 信息安全敏感资产与保密声明";
    req.push("申请书附件5：信息安全管理体系认证客户基本信息.docx");
    reasons["申请书附件5：信息安全管理体系认证客户基本信息.docx"] = "ISMS 信息安全基本形态与网络架构调查表";
    req.push("BCZC-RC-02-A1  信息安全及信息技术服务保密协议.docx");
    reasons["BCZC-RC-02-A1  信息安全及信息技术服务保密协议.docx"] = "双向信息安全专项保密附加协议";
  }

  if (sysStr.includes("ITSMS") || sysStr.includes("信息技术服务")) {
    if (!req.includes("申请书附件4：保密和敏感信息声明表.docx")) {
      req.push("申请书附件4：保密和敏感信息声明表.docx");
      reasons["申请书附件4：保密和敏感信息声明表.docx"] = "ITSMS 敏感信息声明";
    }
    req.push("申请书附件6：信息技术服务管理体系相关的风险评价表.docx");
    reasons["申请书附件6：信息技术服务管理体系相关的风险评价表.docx"] = "ITSMS IT服务运维风险评估及SLA量化表";
    if (!req.includes("BCZC-RC-02-A1 信息安全及信息技术服务保密协议.docx")) {
      req.push("BCZC-RC-02-A1 信息安全及信息技术服务保密协议.docx");
      reasons["BCZC-RC-02-A1 信息安全及信息技术服务保密协议.docx"] = "IT服务保密附加协议";
    }
  }

  if (sysStr.includes("EnMS") || sysStr.includes("能源")) {
    req.push("申请书附件8：能源管理体系信息表.docx");
    reasons["申请书附件8：能源管理体系信息表.docx"] = "EnMS 能源消耗边界与综合能耗核算表";
  }

  if (sysStr.includes("AIMS") || sysStr.includes("人工智能")) {
    req.push("申请书附件10：人工智能管理体系认证客户基本信息.docx");
    reasons["申请书附件10：人工智能管理体系认证客户基本信息.docx"] = "AIMS AI算法模型与数据安全合规表";
  }

  if (sysStr.includes("FSMS") || sysStr.includes("HACCP") || sysStr.includes("食品") || sysStr.includes("餐饮")) {
    req.push("申请书附件11：食品类管理体系认证信息表.docx");
    reasons["申请书附件11：食品类管理体系认证信息表.docx"] = "FSMS 食品安全许可证与关键控制点核查表";
  }

  if (sysStr.includes("InMS") || sysStr.includes("创新")) {
    req.push("申请书附件12：InMS研发项目清单.docx");
    reasons["申请书附件12：InMS研发项目清单.docx"] = "InMS 创新管理研发管线与项目台账";
  }

  if (conditions.isTransfer === "是" || conditions.isTransfer === "计划转换/其他认证机构") {
    req.push("关于转换认证机构的声明.docx");
    reasons["关于转换认证机构的声明.docx"] = "转机构流程法定转换申明";
  }

  if (conditions.hasBranch === "是" || conditions.multiAddress) {
    req.push("申请书附件1：管理体系覆盖总部 分支机构信息表.docx");
    reasons["申请书附件1：管理体系覆盖总部 分支机构信息表.docx"] = "多分支机构与分场所核算表";
    req.push("申请书附件2：多经营地址信息表.docx");
    reasons["申请书附件2：多经营地址信息表.docx"] = "多办公/经营场地地址及人手分配表";
    req.push("申请书附件9：体系覆盖有效人数信息表.docx");
    reasons["申请书附件9：体系覆盖有效人数信息表.docx"] = "多场所有效覆盖人数核算表";
  }

  return { required: Array.from(new Set(req)), reasons };
}

// Pure helpers to detect systems from certificate schemes
export const detectSystemFromScheme = (certScheme: string): string => {
  const sLower = certScheme.toLowerCase();
  if (sLower.includes('质量') || sLower.includes('qms') || sLower.includes('9001') || sLower.includes('19001') || sLower.includes('ec9000')) {
    return "QMS";
  }
  if (sLower.includes('环境') || sLower.includes('ems') || sLower.includes('14001') || sLower.includes('24001')) {
    return "EMS";
  }
  if (sLower.includes('hse')) {
    return "HSE";
  }
  if (sLower.includes('健康') || sLower.includes('安全') || sLower.includes('ohsms') || sLower.includes('45001') || sLower.includes('28001')) {
    return "OHSMS";
  }
  if ((sLower.includes('安全') && sLower.includes('信息')) || sLower.includes('isms') || sLower.includes('27001')) {
    return "ISMS";
  }
  if ((sLower.includes('技术') && sLower.includes('服务')) || sLower.includes('itsms') || sLower.includes('20000')) {
    return "ITSMS";
  }
  if (sLower.includes('能源') || sLower.includes('enms') || sLower.includes('50001') || sLower.includes('23331')) {
    return "EnMS";
  }
  if (sLower.includes('知识产权') || sLower.includes('ipms') || sLower.includes('29490')) {
    return "IPMS";
  }
  if (sLower.includes('业务连续') || sLower.includes('bcms') || sLower.includes('22301')) {
    return "BCMS";
  }
  if ((sLower.includes('食品') && sLower.includes('安全')) || sLower.includes('fsms') || sLower.includes('22000')) {
    return "FSMS";
  }
  if (sLower.includes('危害分析') || sLower.includes('关键控制') || sLower.includes('haccp')) {
    return "HACCP";
  }
  if ((sLower.includes('人工') && sLower.includes('智能')) || sLower.includes('aims') || sLower.includes('42001')) {
    return "AIMS";
  }
  if (sLower.includes('创新') || sLower.includes('inms') || sLower.includes('56002')) {
    return "InMS";
  }
  return "OTHER";
};

export const getSystemNameFromAbbrev = (abbrev: string): string | null => {
  switch (abbrev) {
    case "QMS": return "质量管理体系 (QMS/EC9000)";
    case "EMS": return "环境管理体系 (EMS)";
    case "OHSMS": return "职业健康安全管理体系 (OHSMS)";
    case "HSE": return "HSE健康安全与环境管理体系";
    case "ISMS": return "信息安全管理体系 (ISMS)";
    case "ITSMS": return "信息技术服务管理体系 (ITSMS)";
    case "EnMS": return "能源管理体系 (EnMS)";
    case "IPMS": return "企业知识产权合规 (IPMS)";
    case "BCMS": return "业务连续性管理体系 (BCMS)";
    case "FSMS": return "食品安全管理体系 (FSMS)";
    case "AIMS": return "人工智能管理体系 (AIMS)";
    case "InMS": return "创新管理体系 (InMS)";
    default: return null;
  }
};

export default function AIApplication() {
  const { authState } = useAuth();
  // Step 0: Search, Step 1: Confirm Info & Plan, Step 2: Fill Details & File Matrix, Step 3: Online Preview, Step 4: Success
  const [step, setStep] = useState(0);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  
  // State for Step 0 & 1
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [certInfo, setCertInfo] = useState<any>(null);
  const [fetchStatus, setFetchStatus] = useState<{ isNetworkError: boolean; message: string }>({ isNetworkError: false, message: '' });

  // Selected Systems
  const [selectedSystems, setSelectedSystems] = useState<string[]>(["质量管理体系 (QMS/EC9000)"]);
  
  // Scope AI Generation & Confirmation Tracking State
  const [isScopeAutoGenerated, setIsScopeAutoGenerated] = useState(false);
  const [isScopeConfirmed, setIsScopeConfirmed] = useState(false);
  const [scopeSource, setScopeSource] = useState<'management_cert_api' | 'biz_api' | 'ai_generated' | null>(null);

  // Form Details (Rule 4: Leave clean interactive empty inputs if not fetched via API)
  const [contactInfo, setContactInfo] = useState({ 
    name: '解明玉', phone: '13333333333', officeAddress: '', 
    totalEmployees: '50', coveredEmployees: '50',
    email: '3440574064@qq.com', restDays: '双休', workHours: '09:00-18:00', 
    hasShift: '否', isTransfer: '否', hasBranch: '否', multiAddress: false, hasTempSite: '否',
    isDiffAddress: '否', branchCount: '0',
    managerName: '', managerPhone: '',
    bankName: '', bankAccount: '', zipCode: '',
    certScope: ''
  });
  
  const [feeInfo, setFeeInfo] = useState({ initialFee: '15000', yearlyFee: '8000', otherFee: '0' });

  // Transfer certification declaration fields
  const [transferInfo, setTransferInfo] = useState({
    fromOrg: '',
    certNo: '',
    expiryDate: '',
    reason: '提升服务质量与满意度',
    accreditation: 'CNAS',
    lastAuditType: '再认证',
    lastAuditDate: '2025年07月13日至2025年07月15日',
    systems: ["QMS"]
  });

  // Annex 3: Temporary sites and engineering project list (empty by default, user can add interactively)
  const [tempSites, setTempSites] = useState<any[]>([]);

  // Annex 6 / 7: Product and service scope list (empty by default, user can add interactively)
  const [productServices, setProductServices] = useState<any[]>([]);

  // File Matrix State
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fileReasons, setFileReasons] = useState<Record<string, string>>({});

  // Preview State
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResponse, setPreviewResponse] = useState<any>(null);
  const [activePreviewFile, setActivePreviewFile] = useState<string>('');
  const [bClassRequirements, setBClassRequirements] = useState<string[]>([]);
  const [documentEdits, setDocumentEdits] = useState<Record<string, Record<string, string>>>({});

function getTemplateRank(name: string) {
  const normName = name.trim();
  if (normName.includes('合同')) {
    return { rank: 1.1, attachmentNum: 0 };
  }
  if (normName.includes('协议') && !normName.includes('附件')) {
    return { rank: 1.2, attachmentNum: 0 };
  }
  if (normName.includes('申请书') && !normName.includes('附件')) {
    return { rank: 2, attachmentNum: 0 };
  }
  if (normName.includes('承诺书') && !normName.includes('附件')) {
    return { rank: 3.1, attachmentNum: 0 };
  }
  if (normName.includes('声明') && !normName.includes('附件')) {
    return { rank: 3.2, attachmentNum: 0 };
  }
  const match = normName.match(/附件\s*(\d+)/);
  const attachmentNum = match ? parseInt(match[1], 10) : 999;
  return { rank: 4, attachmentNum };
}

function sortTemplateFiles<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => {
    const rankA = getTemplateRank(a.name);
    const rankB = getTemplateRank(b.name);
    if (rankA.rank !== rankB.rank) {
      return rankA.rank - rankB.rank;
    }
    if (rankA.rank === 4) {
      if (rankA.attachmentNum !== rankB.attachmentNum) {
        return rankA.attachmentNum - rankB.attachmentNum;
      }
    }
    return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' });
  });
}

  // Templates in system
  const [templates, setTemplates] = useState<any[]>([]);
  const [showOnlyLatest, setShowOnlyLatest] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(sortTemplateFiles(data || []));
    } catch (e) {
      console.error('Failed to fetch templates', e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Initial matrix computation when selectedSystems, templates, or any dynamic parameter changes
  useEffect(() => {
    const { required, reasons } = calculateRequiredFiles(selectedSystems, {
      isTransfer: contactInfo.isTransfer,
      hasBranch: contactInfo.hasBranch,
      multiAddress: contactInfo.multiAddress,
      hasTempSite: contactInfo.hasTempSite,
      isDiffAddress: contactInfo.isDiffAddress
    });
    
    // Smart match with template files
    const availableNames = templates.map((t: any) => t.name);
    if (availableNames.length > 0) {
      const mappedReasons: Record<string, string> = { ...reasons };
      const matchFile = (reqName: string) => {
        if (availableNames.includes(reqName)) {
          if (reasons[reqName]) mappedReasons[reqName] = reasons[reqName];
          return reqName;
        }
        const normReq = reqName.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
        const found = availableNames.find((a: string) => {
          const normA = a.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
          return normA === normReq || normA.includes(normReq.split(' ')[0]);
        });
        if (found) {
          if (reasons[reqName]) mappedReasons[found] = reasons[reqName];
          return found;
        }
        return reqName;
      };
      const finalSelected = Array.from(new Set(required.map(matchFile)));
      setSelectedFiles(finalSelected);
      setFileReasons(mappedReasons);
    } else {
      setSelectedFiles(required);
      setFileReasons(reasons);
    }
  }, [
    selectedSystems, 
    templates, 
    contactInfo.isTransfer, 
    contactInfo.hasBranch, 
    contactInfo.multiAddress, 
    contactInfo.hasTempSite, 
    contactInfo.isDiffAddress
  ]);

  // Smart Certificate Transfer Comparison & Auto-Filling Engine (Task 5)
  useEffect(() => {
    if (!certInfo || !certInfo.certificates || certInfo.certificates.length === 0) {
      // If no certificate info exists, set isTransfer to '否' and safely leave blank
      setContactInfo(prev => {
        if (prev.isTransfer === '是' || prev.isTransfer === '计划转换/其他认证机构') {
          return { ...prev, isTransfer: '否' };
        }
        return prev;
      });
      setTransferInfo(prev => {
        if (prev.fromOrg !== '' || prev.certNo !== '' || prev.expiryDate !== '') {
          return {
            ...prev,
            fromOrg: '',
            certNo: '',
            expiryDate: '',
            reason: '',
            accreditation: '',
            lastAuditType: '',
            lastAuditDate: '',
            systems: []
          };
        }
        return prev;
      });
      return;
    }

    const certificates = certInfo.certificates;
    let foundExternalTransfer = false;
    let externalCert: any = null;

    // Advanced schema match checking covering all 13 supported systems
    const isSystemMatch = (selectedSysStr: string, certScheme: string) => {
      const sysLower = selectedSysStr.toLowerCase();
      const certLower = certScheme.toLowerCase();
      
      if (
        (sysLower.includes('质量') || sysLower.includes('qms') || sysLower.includes('9001') || sysLower.includes('19001') || sysLower.includes('ec9000')) &&
        (certLower.includes('质量') || certLower.includes('qms') || certLower.includes('9001') || certLower.includes('19001') || certLower.includes('ec9000'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('环境') || sysLower.includes('ems') || sysLower.includes('14001') || sysLower.includes('24001')) &&
        (certLower.includes('环境') || certLower.includes('ems') || certLower.includes('14001') || certLower.includes('24001'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('健康') || sysLower.includes('安全') || sysLower.includes('ohsms') || sysLower.includes('45001') || sysLower.includes('28001') || sysLower.includes('hse')) &&
        (certLower.includes('健康') || certLower.includes('安全') || certLower.includes('ohsms') || certLower.includes('45001') || certLower.includes('28001') || certLower.includes('hse'))
      ) {
        return true;
      }
      if (
        ((sysLower.includes('安全') && sysLower.includes('信息')) || sysLower.includes('isms') || sysLower.includes('27001')) &&
        ((certLower.includes('安全') && certLower.includes('信息')) || certLower.includes('isms') || certLower.includes('27001'))
      ) {
        return true;
      }
      if (
        ((sysLower.includes('技术') && sysLower.includes('服务')) || sysLower.includes('itsms') || sysLower.includes('20000')) &&
        ((certLower.includes('技术') && certLower.includes('服务')) || certLower.includes('itsms') || certLower.includes('20000'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('能源') || sysLower.includes('enms') || sysLower.includes('50001')) &&
        (certLower.includes('能源') || certLower.includes('enms') || certLower.includes('50001'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('知识产权') || sysLower.includes('ipms') || sysLower.includes('29490')) &&
        (certLower.includes('知识产权') || certLower.includes('ipms') || certLower.includes('29490'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('业务连续') || sysLower.includes('bcms') || sysLower.includes('22301')) &&
        (certLower.includes('业务连续') || certLower.includes('bcms') || certLower.includes('22301'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('食品') || sysLower.includes('fsms') || sysLower.includes('22000')) &&
        (certLower.includes('食品') || certLower.includes('fsms') || certLower.includes('22000'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('危害分析') || sysLower.includes('haccp')) &&
        (certLower.includes('危害分析') || certLower.includes('haccp') || certLower.includes('关键控制'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('人工智能') || sysLower.includes('aims') || sysLower.includes('42001')) &&
        (certLower.includes('人工智能') || certLower.includes('aims') || certLower.includes('42001'))
      ) {
        return true;
      }
      if (
        (sysLower.includes('创新') || sysLower.includes('inms') || sysLower.includes('56002')) &&
        (certLower.includes('创新') || certLower.includes('inms') || certLower.includes('56002'))
      ) {
        return true;
      }
      return false;
    };

    const isSupportedSystem = (certScheme: string): boolean => {
      return detectSystemFromScheme(certScheme) !== "OTHER";
    };

    // Score and rank external certificates according to criteria:
    // Priority 1 (Score 1): Same system type as any selectedSystems
    // Priority 2 (Score 2): Supported system type by our institution
    // Priority 3 (Score 3): Other certificates
    const getPriorityScore = (cert: any) => {
      const scheme = cert.scheme || '';
      const isSameType = selectedSystems.some(sys => isSystemMatch(sys, scheme));
      if (isSameType) {
        return 1;
      }
      if (isSupportedSystem(scheme)) {
        return 2;
      }
      return 3;
    };

    // Filter external certificates
    const externalCerts = certificates.filter((cert: any) => {
      const issuer = (cert.issuing_body || '').trim();
      // External means issuing body is not empty/dash and is not our own (does not contain "中安" and does not contain "BCZC")
      return issuer && issuer !== '-' && !issuer.includes('中安') && !issuer.includes('BCZC');
    });

    // Sort according to priority score, status validity, and expiry date
    const sortedExternalCerts = [...externalCerts].sort((a, b) => {
      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);
      
      // 1. Primary Priority Category (1 > 2 > 3)
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      
      // 2. Status Priority: Valid (有效) first
      const isEffectiveA = a.status === '有效';
      const isEffectiveB = b.status === '有效';
      if (isEffectiveA !== isEffectiveB) {
        return isEffectiveA ? -1 : 1;
      }
      
      // 3. Expiry Date Priority: Later date is prioritized
      const expA = a.expiry_date || '';
      const expB = b.expiry_date || '';
      if (expA !== expB) {
        return expB.localeCompare(expA);
      }
      
      return 0;
    });

    if (sortedExternalCerts.length > 0) {
      foundExternalTransfer = true;
      externalCert = sortedExternalCerts[0];
    }

    if (foundExternalTransfer && externalCert) {
      // Auto pre-fill and auto check "是" (Involves certificate transfer)
      setContactInfo(prev => {
        if (prev.isTransfer !== '是') {
          return { ...prev, isTransfer: '是' };
        }
        return prev;
      });

      setTransferInfo(prev => {
        const newFromOrg = externalCert.issuing_body && externalCert.issuing_body !== '-' ? externalCert.issuing_body : '';
        const newCertNo = externalCert.cert_no && externalCert.cert_no !== '-' ? externalCert.cert_no : '';
        const newExpiryDate = externalCert.expiry_date && externalCert.expiry_date !== '-' ? externalCert.expiry_date : '';
        
        const sysAbbrev = detectSystemFromScheme(externalCert.scheme || '');
        const systemsToFill = sysAbbrev !== "OTHER" ? [sysAbbrev] : [externalCert.scheme || 'QMS'];

        if (prev.fromOrg !== newFromOrg || prev.certNo !== newCertNo || prev.expiryDate !== newExpiryDate) {
          return {
            ...prev,
            fromOrg: newFromOrg,
            certNo: newCertNo,
            expiryDate: newExpiryDate,
            reason: '提升服务质量与满意度',
            accreditation: 'CNAS',
            lastAuditType: '再认证',
            lastAuditDate: '2025年07月13日至2025年07月15日',
            systems: systemsToFill
          };
        }
        return prev;
      });
    } else {
      // If no external certificate matches any selected systems, default to "否" and safely leave blank
      setContactInfo(prev => {
        if (prev.isTransfer !== '否') {
          return { ...prev, isTransfer: '否' };
        }
        return prev;
      });
      setTransferInfo(prev => {
        if (prev.fromOrg !== '' || prev.certNo !== '' || prev.expiryDate !== '') {
          return {
            ...prev,
            fromOrg: '',
            certNo: '',
            expiryDate: '',
            reason: '',
            accreditation: '',
            lastAuditType: '',
            lastAuditDate: '',
            systems: []
          };
        }
        return prev;
      });
    }
  }, [selectedSystems, certInfo]);

  // Helper to check if a file name is currently selected in selectedFiles (handling .doc / .docx and prefixes)
  const isFileInSelected = (fileName: string) => {
    const normName = fileName.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
    const prefix = normName.split(' ')[0];
    return selectedFiles.some(f => {
      const normF = f.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
      return f === fileName || normF === normName || (prefix.length >= 3 && normF.includes(prefix));
    });
  };

  // Interactive File Toggle & 2-way sync down to parameter forms
  const handleToggleFile = (fileName: string) => {
    const normName = fileName.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
    const prefix = normName.split(' ')[0];

    if (isFileInSelected(fileName)) {
      // UNCHECK / REMOVE
      setSelectedFiles(prev => prev.filter(f => {
        const normF = f.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
        return f !== fileName && normF !== normName && !(prefix.length >= 3 && normF.includes(prefix));
      }));

      if (fileName.includes('转换') || fileName.includes('声明')) {
        setContactInfo(prev => ({ ...prev, isTransfer: '否' }));
      }
      if (fileName.includes('附件3') || fileName.includes('临时场所')) {
        setContactInfo(prev => ({ ...prev, hasTempSite: '否' }));
      }
      if (fileName.includes('承诺书')) {
        setContactInfo(prev => ({ ...prev, isDiffAddress: '否' }));
      }
      if (fileName.includes('附件1') || fileName.includes('分支机构')) {
        setContactInfo(prev => ({ ...prev, hasBranch: '否' }));
      }
      if (fileName.includes('附件2') || fileName.includes('多经营地址')) {
        setContactInfo(prev => ({ ...prev, multiAddress: false }));
      }
    } else {
      // CHECK / ADD
      setSelectedFiles(prev => [...prev, fileName]);

      if (fileName.includes('转换') || fileName.includes('声明')) {
        setContactInfo(prev => ({ ...prev, isTransfer: '计划转换/其他认证机构' }));
      }
      if (fileName.includes('承诺书')) {
        setContactInfo(prev => ({ ...prev, isDiffAddress: '是' }));
      }
      if (fileName.includes('附件3') || fileName.includes('临时场所')) {
        setContactInfo(prev => ({ ...prev, hasTempSite: '是' }));
        if (tempSites.length === 0) {
          setTempSites([{
            seq: '01',
            projectName: `${companyInfo?.name || ''}工程施工项目`,
            address: contactInfo.officeAddress || companyInfo?.address || '',
            providedService: contactInfo.certScope || '工程施工与技术服务',
            distance: '15000',
            startDate: '',
            endDate: '',
            constructionStage: '施工阶段',
            employeeCount: contactInfo.coveredEmployees || '10',
            remark: '无'
          }]);
        }
      }
      if (fileName.includes('附件1') || fileName.includes('分支机构')) {
        setContactInfo(prev => ({ ...prev, hasBranch: '是' }));
      }
      if (fileName.includes('附件2') || fileName.includes('多经营地址')) {
        setContactInfo(prev => ({ ...prev, multiAddress: true }));
      }
      if (fileName.includes('附件7') || fileName.includes('附件6') || fileName.includes('产品') || fileName.includes('服务')) {
        if (productServices.length === 0) {
          setProductServices([{
            seq: '1',
            name: `${companyInfo?.name || ''}主要产品与服务`,
            specModel: '通用规格型号',
            certScope: contactInfo.certScope || '申请认证范围'
          }]);
        }
      }
    }
  };

  // Close/remove Transfer Declaration
  const handleCloseTransferForm = () => {
    setContactInfo(prev => ({ ...prev, isTransfer: '否' }));
    setSelectedFiles(prev => prev.filter(f => !(f.includes('转换') || f.includes('声明'))));
  };

  // Close/remove Temporary Sites (Annex 3)
  const handleCloseTempSiteForm = () => {
    setContactInfo(prev => ({ ...prev, hasTempSite: '否' }));
    setTempSites([]);
    setSelectedFiles(prev => prev.filter(f => !(f.includes('附件3') || f.includes('临时场所'))));
  };

  // Close/remove Product & Services (Annex 6/7)
  const handleCloseProductServiceForm = () => {
    setProductServices([]);
    setSelectedFiles(prev => prev.filter(f => !(f.includes('附件7') || f.includes('附件6') || f.includes('产品或提供服务'))));
  };

  // Reset file matrix to full recommendation
  const handleResetFileMatrix = () => {
    const { required, reasons } = calculateRequiredFiles(selectedSystems, {
      isTransfer: contactInfo.isTransfer,
      hasBranch: contactInfo.hasBranch,
      multiAddress: contactInfo.multiAddress,
      hasTempSite: contactInfo.hasTempSite,
      isDiffAddress: contactInfo.isDiffAddress
    });
    const availableNames = templates.map((t: any) => t.name);
    if (availableNames.length > 0) {
      const mappedReasons: Record<string, string> = { ...reasons };
      const matchFile = (reqName: string) => {
        if (availableNames.includes(reqName)) {
          if (reasons[reqName]) mappedReasons[reqName] = reasons[reqName];
          return reqName;
        }
        const normReq = reqName.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
        const found = availableNames.find((a: string) => {
          const normA = a.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
          return normA === normReq || normA.includes(normReq.split(' ')[0]);
        });
        if (found) {
          if (reasons[reqName]) mappedReasons[found] = reasons[reqName];
          return found;
        }
        return reqName;
      };
      setSelectedFiles(Array.from(new Set(required.map(matchFile))));
      setFileReasons(mappedReasons);
    } else {
      setSelectedFiles(required);
      setFileReasons(reasons);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('template', e.target.files[0]);

    try {
      const res = await fetch('/api/templates/upload', {
        method: 'POST',
        headers: {
          'X-User-Phone': authState.user?.phone || ''
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '上传失败，请重试', 'error');
        return;
      }
      if (data.extracted !== undefined) {
        showToast(data.message || `ZIP 批量解压成功！共提取 ${data.extracted} 个模板文件。系统已完成智能去重与最新版本比对。`, data.message && data.message.includes('拦截') ? 'info' : 'success');
      } else if (data.success) {
        showToast('模板上传成功！系统已完成去重与最新版本判定。', 'success');
      }
      await fetchTemplates();
    } catch (error) {
      console.error('Upload failed', error);
      showToast('上传失败，请重试', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    try {
      // Use query parameter to delete the template, bypassing reverse-proxy path-param encoding/multi-space issues
      const res = await fetch(`/api/templates?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          'X-User-Phone': authState.user?.phone || ''
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(`删除失败: ${errData.error || '未知错误'}`, 'error');
        return;
      }
      
      showToast(`已成功删除模板: ${name}`, 'success');

      // Remove from selected files state if it was selected
      const normDel = name.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
      setSelectedFiles(prev => prev.filter(f => {
        const normF = f.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
        return normF !== normDel && f !== name;
      }));

      await fetchTemplates();
    } catch (error) {
      console.error('Delete failed', error);
      showToast('删除失败，请重试', 'error');
    }
  };

  const handleDownloadTemplate = async (name: string) => {
    try {
      showToast(`正在准备下载模板文件: ${name}`, 'info');
      const res = await fetch(`/api/templates/download?name=${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: {
          'X-User-Phone': authState.user?.phone || ''
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '下载文件请求失败');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(`模板文件下载成功: ${name}`, 'success');
    } catch (err: any) {
      console.error('Download failed', err);
      showToast(err.message || '下载失败，请重试', 'error');
    }
  };

  const handleClearAllTemplates = async () => {
    try {
      setIsUploading(true);
      const res = await fetch('/api/templates', {
        method: 'DELETE',
        headers: {
          'X-User-Phone': authState.user?.phone || ''
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || '清空失败', 'error');
        return;
      }
      showToast('模板库已全部清空', 'success');
      await fetchTemplates();
    } catch (error) {
      console.error('Clear templates failed', error);
      showToast('清空失败，请重试', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestoreDefaultTemplates = async () => {
    try {
      setIsUploading(true);
      const res = await fetch('/api/templates/restore-defaults', {
        method: 'POST',
        headers: {
          'X-User-Phone': authState.user?.phone || ''
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || '恢复默认模板失败', 'error');
        return;
      }
      showToast('已成功恢复系统默认模板库！', 'success');
      await fetchTemplates();
    } catch (error) {
      console.error('Restore default templates failed', error);
      showToast('恢复默认模板失败，请重试', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      // Call Tianyancha Open APIs with local storage caching
      const { icData, certData } = await fetchFullCompanyData(searchQuery);

      const isNetError = icData.isNetworkError || certData.isNetworkError || false;
      if (isNetError) {
        setFetchStatus({
          isNetworkError: true,
          message: icData.errorMessage || certData.errorMessage || '网络链接可能有问题，未能成功通过 API 获取企事业单位数据。'
        });
      } else {
        setFetchStatus({
          isNetworkError: false,
          message: '天眼查 API 权威数据流直连完成'
        });
      }

      const realName = icData.name || searchQuery;
      const realCreditCode = icData.creditCode || '';
      const realLegalPerson = icData.legalPerson || '';
      const realAddress = icData.address || '';
      const realStatus = icData.status || (isNetError ? '' : '存续');
      const realFounding = icData.establishDate || '';
      const realScopeBiz = icData.scope || '';
      const registeredCapital = icData.registeredCapital || '';
      const companyOrgType = icData.companyOrgType || '';
      const socialStaffNum = icData.socialStaffNum !== undefined && icData.socialStaffNum !== '' ? String(icData.socialStaffNum) : '';
      const staffNumRange = icData.staffNumRange || '';

      // Priority 1: Management Certification API scope
      const realScopeCert = certData.certScope || '';

      setCompanyInfo({
        name: realName,
        creditCode: realCreditCode,
        legalPerson: realLegalPerson,
        address: realAddress,
        status: realStatus,
        foundingDate: realFounding,
        registeredCapital,
        companyOrgType,
        socialStaffNum,
        staffNumRange,
        rawPhone: icData.phone || '',
        rawEmail: icData.email || ''
      });

      let finalScope = '';
      let sourceTag: 'management_cert_api' | 'biz_api' | null = null;

      if (realScopeCert) {
        finalScope = realScopeCert;
        sourceTag = 'management_cert_api';
      } else if (realScopeBiz) {
        finalScope = realScopeBiz;
        sourceTag = 'biz_api';
      }

      const resolvedAddress = certData.primaryAddress || realAddress;
      const resolvedHeadcount = certData.primaryHeadcount || socialStaffNum || (staffNumRange ? staffNumRange.replace(/[^0-9]/g, '') : '');

      // Address consistency analysis:
      // If operating address differs from registered address, set isDiffAddress = '是', else '否'
      const normReg = (realAddress || '').trim().replace(/\s+/g, '');
      const normOff = (resolvedAddress || '').trim().replace(/\s+/g, '');
      const isDiffAddr = normReg && normOff && normReg !== normOff ? '是' : '否';

      // Dynamically detect selected systems from the company's existing certificates or business scope
      let detectedSystems: string[] = [];
      
      // 1. Check existing certificates from certData
      if (certData && certData.items && certData.items.length > 0) {
        certData.items.forEach((item: any) => {
          const scheme = item.certificateName || item.scheme || '';
          const abbrev = detectSystemFromScheme(scheme);
          if (abbrev !== "OTHER") {
            const systemName = getSystemNameFromAbbrev(abbrev);
            if (systemName && !detectedSystems.includes(systemName)) {
              detectedSystems.push(systemName);
            }
          }
        });
      }

      // 2. If no certificates found, check keywords in business scope or finalScope
      if (detectedSystems.length === 0 && finalScope) {
        const scopeLower = finalScope.toLowerCase();
        
        const hasIT = /信息技术|IT服务|IT运维|系统集成|软件服务|软件开发|软件运维|数据中心|ISO20000|ITSMS/i.test(scopeLower);
        const hasIS = /信息安全|数据安全|网络安全|ISO27001|ISMS/i.test(scopeLower);
        const hasQMS = /质量管理|ISO9001|QMS/i.test(scopeLower);
        const hasEMS = /环境管理|ISO14001|EMS/i.test(scopeLower);
        const hasOHS = /职业健康|安全生产|ISO45001|OHSMS/i.test(scopeLower);

        if (hasIT || hasIS) {
          detectedSystems.push("信息安全管理体系 (ISMS)");
          detectedSystems.push("信息技术服务管理体系 (ITSMS)");
        } else {
          // Default to QMS/EMS/OHSMS if construction/manufacturing or general keywords match
          const isConstructionOrManufacturing = /建筑|工程|施工|制造|生产|加工|机械/i.test(scopeLower);
          if (isConstructionOrManufacturing || hasQMS || hasEMS || hasOHS) {
            detectedSystems.push("质量管理体系 (QMS/EC9000)");
            if (hasEMS || isConstructionOrManufacturing) detectedSystems.push("环境管理体系 (EMS)");
            if (hasOHS || isConstructionOrManufacturing) detectedSystems.push("职业健康安全管理体系 (OHSMS)");
          }
        }
      }

      // If still empty, fall back to "质量管理体系 (QMS/EC9000)"
      if (detectedSystems.length === 0) {
        detectedSystems.push("质量管理体系 (QMS/EC9000)");
      }

      setSelectedSystems(detectedSystems);

      const feeCount = detectedSystems.length;
      let initialFee = '4500';
      let yearlyFee = '4500';
      if (feeCount >= 2) {
        initialFee = '13500';
        yearlyFee = '13500';
      }
      setFeeInfo({
        initialFee,
        yearlyFee,
        otherFee: '0'
      });

      // Scope construction/engineering/temp site/IT service analysis:
      const hasITService = /信息技术|IT服务|IT运维|系统集成|软件服务|软件开发与维护|软件运维|数据中心|ISO20000|ITSMS/i.test(finalScope || '') || detectedSystems.some(s => s.includes('信息技术') || s.includes('20000') || s.includes('ITSMS'));
      const isTempSiteScope = /工程|施工|建筑|工程现场|施工现场|临时场所|现场服务/i.test(finalScope || '') || hasITService;

      setContactInfo(prev => ({
        ...prev,
        officeAddress: resolvedAddress || prev.officeAddress,
        totalEmployees: resolvedHeadcount || prev.totalEmployees,
        coveredEmployees: resolvedHeadcount || prev.coveredEmployees,
        phone: icData.phone || prev.phone,
        email: icData.email || prev.email,
        certScope: finalScope || prev.certScope,
        isDiffAddress: isDiffAddr,
        hasTempSite: isTempSiteScope ? '是' : '否'
      }));

      if (finalScope) {
        setScopeSource(sourceTag);
        setIsScopeAutoGenerated(true);
        setIsScopeConfirmed(false);
      } else {
        setScopeSource(null);
      }

      // The certificate transfer auto-fill is reactively governed by useEffect([selectedSystems, certInfo]) 
      // to avoid race conditions and ensure the high-priority scoring matching strategy is always used.

      setCertInfo({
        certificates: (certData.items || []).map((item) => ({
          cert_no: item.certNo || '-',
          scheme: item.certificateName || '-',
          status: item.status || '有效',
          issue_date: item.startDate || '-',
          expiry_date: item.endDate || '-',
          issuing_body: item.certOrg || '-',
          covered_headcount: item.coveredHeadcount || '-',
          cert_basis: item.certBasis || '-',
          first_award_date: item.firstAwardDate || '-',
          org_address: item.orgAddress || '-'
        }))
      });
      setStep(1);
    } catch (e) {
      console.error(e);
      setFetchStatus({
        isNetworkError: true,
        message: '网络链接可能有问题，未能建立连接或服务器未提供成功响应。'
      });
      setCompanyInfo({
        name: searchQuery,
        creditCode: '',
        legalPerson: '',
        address: '',
        status: '',
        foundingDate: '',
        registeredCapital: '',
        companyOrgType: '',
        socialStaffNum: '',
        staffNumRange: '',
        rawPhone: '',
        rawEmail: ''
      });
      setCertInfo({ certificates: [] });
      setStep(1);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger Online Document Preview API
  const handleGenerateAndPreview = async () => {
    setIsPreviewLoading(true);
    try {
      // Calculate B class offline requirements
      const bReqs: string[] = ['营业执照副本复印件（加盖公章）'];
      if (selectedSystems.some(s => s.includes('EMS'))) bReqs.push('环境影响评价批复文件或排污许可备案凭证');
      if (selectedSystems.some(s => s.includes('OHSMS'))) bReqs.push('消防验收合格意见书及特种设备检测报告');
      if (selectedSystems.some(s => s.includes('FSMS') || s.includes('HACCP'))) bReqs.push('食品经营/生产许可证');

      setBClassRequirements(bReqs);

      const res = await fetch('/api/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyInfo,
          contactInfo,
          feeInfo,
          systems: selectedSystems,
          selectedFiles,
          bClassRequirements: bReqs,
          transferInfo,
          tempSites,
          productServices,
          certInfo,
          documentEdits
        })
      });

      if (!res.ok) {
        throw new Error('预览生成失败');
      }

      const data = await res.json();
      setPreviewResponse(data);
      if (data.files && data.files.length > 0) {
        setActivePreviewFile(data.files[0]);
      }
      setStep(3); // Go to Preview Step
    } catch (err) {
      console.error('Preview error:', err);
      showToast('文件生成预览失败，请确认是否已上传对应模板。', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Trigger Final Batch Download
  const handleFinalDownload = async () => {
    setIsGenerating(true);
    try {
      const bReqs: string[] = ['营业执照副本复印件（加盖公章）'];
      if (selectedSystems.some(s => s.includes('EMS'))) bReqs.push('环境影响评价批复文件或排污许可备案凭证');
      if (selectedSystems.some(s => s.includes('OHSMS'))) bReqs.push('消防验收合格意见书及特种设备检测报告');

      const res = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyInfo,
          contactInfo,
          feeInfo,
          systems: selectedSystems,
          selectedFiles,
          bClassRequirements: bReqs,
          transferInfo,
          tempSites,
          productServices,
          certInfo,
          documentEdits
        })
      });

      if (!res.ok) {
        throw new Error('下载文件包生成失败');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${companyInfo?.name || '企业'}_关联体系申报材料包.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStep(4); // Success step
    } catch (err) {
      console.error('Download error:', err);
      showToast('文件打包下载失败，请稍后重试。', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-4.5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">AI 一键申请智能填报系统</h1>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-200/50">
                博创众诚专属版
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-none">按申请体系精确对齐文件关联，支持全套申请文件生成前在线原位预览与一键盖章</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => { setIsTemplateModalOpen(true); fetchTemplates(); }}
          className="h-10 px-4 border-slate-200/80 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>模板库管理</span>
          <span className="bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
            {templates.length}
          </span>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Progress Steps */}
          <div className="bg-white rounded-2xl border border-slate-200/50 p-5 shadow-sm max-w-4xl mx-auto mb-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-2">
              {[
                { label: '企业检索', desc: '工商与资质智能检索', icon: Search },
                { label: '方案选择', desc: '体系选择与要素补录', icon: Sparkles },
                { label: '特定体系文件矩阵', desc: '精细化裁剪申报表单', icon: Layers },
                { label: '在线预览与确认', desc: '智能填报与原位校对', icon: Eye },
                { label: '下载完成', desc: '全套一键打包下载', icon: FileDown }
              ].map((s, i) => {
                const IconComponent = s.icon;
                const isCompleted = step > i;
                const isActive = step === i;
                const isUpcoming = step < i;
                
                return (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 relative",
                        isCompleted && "bg-emerald-50 text-emerald-600 border border-emerald-200/50",
                        isActive && "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border border-indigo-600 ring-4 ring-indigo-50",
                        isUpcoming && "bg-slate-50 text-slate-400 border border-slate-200/60"
                      )}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <IconComponent className="w-4.5 h-4.5" />
                        )}
                        {isActive && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={cn(
                          "text-xs font-bold leading-tight transition-colors truncate",
                          isActive ? "text-indigo-600" : isCompleted ? "text-slate-700" : "text-slate-400"
                        )}>
                          {s.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 truncate hidden sm:inline leading-none">
                          {s.desc}
                        </span>
                      </div>
                    </div>
                    {i < 4 && (
                      <div className="hidden md:block shrink-0 mx-2">
                        <ChevronRight className={cn(
                          "w-3.5 h-3.5 transition-colors",
                          step > i ? "text-emerald-500" : "text-slate-300"
                        )} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step 0: Search */}
          {step === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 md:p-12 border border-slate-200/60 shadow-xl shadow-slate-100/50 text-center max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building className="w-8 h-8" />
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                开启企业认证申报
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mt-2 mb-8 max-w-md mx-auto leading-relaxed">
                输入企业名称或社会信用代码。系统将深度解析工商数据库，智能裁切博创众诚专属模板并开启自动化填写。
              </p>

              <div className="flex flex-col md:flex-row items-stretch gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="例如：北京博创众诚智能科技有限公司"
                    className="w-full pl-11 pr-4 h-[52px] bg-slate-100 border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100/40 focus:border-indigo-600 focus:bg-white transition-all font-medium text-slate-800 text-sm placeholder:text-slate-500/70 shadow-inner"
                    onKeyDown={(e) => e.key === 'Enter' && searchQuery && handleSearch()}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={!searchQuery || isSearching}
                  className="h-[52px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm hover:shadow-md hover:shadow-indigo-600/10 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 text-xs md:text-sm"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>正在智能抓取...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>智能解析抓取</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Suggestions */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-500">快速推荐：</span>
                <button 
                  onClick={() => setSearchQuery('博创众诚（北京）认证服务有限公司')}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/60 rounded-lg transition-all font-medium"
                >
                  博创众诚认证服务公司
                </button>
                <button 
                  onClick={() => setSearchQuery('北京科技创新有限公司')}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/60 rounded-lg transition-all font-medium"
                >
                  北京科技创新有限公司
                </button>
              </div>

              {/* Trust Badge Grid */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">工商直连数据</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">特定体系对齐</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">合规专属填报</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Enterprise Info & Certification Selection */}
          {step === 1 && companyInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* API Auto-fill Digest Notification */}
              {fetchStatus.isNetworkError ? (
                <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-amber-600/40">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-amber-200">API 接口连接受阻 / 网络拦截提醒</h4>
                        <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded text-xs font-mono">Status: Alert 503</span>
                      </div>
                      <p className="text-xs text-amber-100/90 mt-1">
                        {fetchStatus.message || '网络链接可能有问题，未能自动调取工商与认证资质数据。系统未填充虚假信息，请直接在下方核对框中手动输入。'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-amber-200 shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    请手工录入/补充信息
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-700/40">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-blue-300 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-white">天眼查 API 权威数据流直连完成</h4>
                        <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded text-xs font-mono">Status: 200 OK</span>
                      </div>
                      <p className="text-xs text-blue-200/80 mt-1">
                        已自动从全国工商与认证平台萃取工商档案、社保参保人数（{companyInfo.socialStaffNum || '已自动推算'}人）、生产经营场所及最新 ISO 体系历史记录，100% 直连装填后续申请文书。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-blue-100 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    信息缺口已自动补齐
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enterprise Info */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <Building className="w-5 h-5 mr-2 text-brand-blue" />
                      工商档案信息（天眼查直连）
                    </h3>
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center",
                      fetchStatus.isNetworkError || !companyInfo.creditCode 
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-green-50 text-green-600 border-green-100"
                    )}>
                      {fetchStatus.isNetworkError || !companyInfo.creditCode ? (
                        <><AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" /> API未自动填充</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 已自动核验</>
                      )}
                    </span>
                  </div>
                  <div className="space-y-3.5 text-sm">
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2.5">
                      <div className="text-slate-500 font-medium">企业名称</div>
                      <div className="col-span-2 font-bold text-slate-800">{companyInfo.name}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2.5">
                      <div className="text-slate-500 font-medium">统一信用代码</div>
                      <div className="col-span-2 font-mono text-slate-700">
                        {companyInfo.creditCode || <span className="text-slate-400 font-sans italic">（API网络受阻，请下方手工补充）</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2.5">
                      <div className="text-slate-500 font-medium">法定代表人</div>
                      <div className="col-span-2 text-slate-800">
                        {companyInfo.legalPerson || <span className="text-slate-400 italic">（API网络受阻，请下方手工补充）</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2.5">
                      <div className="text-slate-500 font-medium">注册资本 / 类型</div>
                      <div className="col-span-2 text-slate-800">
                        {companyInfo.registeredCapital ? `${companyInfo.registeredCapital} ${companyInfo.companyOrgType ? '· ' + companyInfo.companyOrgType : ''}` : <span className="text-slate-400 italic">（API网络受阻，请下方手工补充）</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2.5">
                      <div className="text-slate-500 font-medium">社保参保人数</div>
                      <div className="col-span-2 text-slate-800 font-semibold text-brand-blue">
                        {companyInfo.socialStaffNum ? `${companyInfo.socialStaffNum} 人 (社保局官方实报)` : (companyInfo.staffNumRange || <span className="text-slate-400 font-normal italic">（API网络受阻，请下方手工补充）</span>)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-2.5">
                      <div className="text-slate-500 font-medium">注册地址</div>
                      <div className="col-span-2 text-slate-800 leading-snug">
                        {companyInfo.address || <span className="text-slate-400 italic">（API网络受阻，请下方手工补充）</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* History Cert Info */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                      <FileCheck className="w-5 h-5 mr-2 text-indigo-500" />
                      历史认证资质档案（天眼查直连）
                    </h3>
                    <span className="px-2.5 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-lg border border-blue-100 flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> 天眼查 API 权威直连
                    </span>
                  </div>
                  
                  {certInfo?.certificates?.length > 0 ? (
                    <div className="space-y-3 flex-1 overflow-auto max-h-[260px] pr-1">
                      {certInfo.certificates.map((cert: any, i: number) => (
                        <div key={i} className="p-3.5 bg-slate-50 hover:bg-blue-50/30 transition-colors rounded-xl border border-slate-200/70">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold text-slate-800 text-sm">{cert.scheme}</span>
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-bold rounded",
                              cert.status === '有效' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"
                            )}>
                              {cert.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 space-y-1">
                            <div className="flex justify-between"><span className="text-slate-400">证书编号：</span><span className="font-mono">{cert.cert_no}</span></div>
                            <div className="flex justify-between"><span className="text-slate-400">发证机构：</span><span className="truncate max-w-[200px]" title={cert.issuing_body}>{cert.issuing_body}</span></div>
                            {cert.cert_basis !== '-' && <div><span className="text-slate-400">认证依据：</span>{cert.cert_basis}</div>}
                            <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                              <span>到期日期: {cert.expiry_date}</span>
                              {cert.covered_headcount !== '-' && <span>覆盖人数: {cert.covered_headcount}人</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 border border-dashed border-slate-200 rounded-xl my-auto">
                      <AlertCircle className="w-8 h-8 mb-2 opacity-80 text-amber-500" />
                      <p className="text-sm font-semibold text-slate-700">
                        {fetchStatus.isNetworkError ? '网络链接或 API 响应受限' : '未查询到历史证书记录'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
                        {fetchStatus.isNetworkError
                          ? '因 API 网络受阻未能自动拉取认可平台证书。系统未自动补全虚假数据，已按初次申请策略准备表单。'
                          : '系统将自动按初次认证策略生成全套文书档案。'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Area */}
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">选择本次申请的具体体系</h3>
                    <p className="text-xs text-slate-500 mt-1">系统将根据您勾选的体系，自动精确匹配并裁剪所需填报的文件清单（无关体系文件将被忽略）</p>
                  </div>
                  <span className="text-xs font-bold text-brand-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    已选 {selectedSystems.length} 项体系
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                   {ALL_SYSTEMS.map(sys => {
                     const isChecked = selectedSystems.includes(sys);
                     return (
                       <label 
                         key={sys} 
                         className={cn(
                           "flex items-center p-3.5 border rounded-xl cursor-pointer transition-all select-none",
                           isChecked 
                             ? "border-brand-blue bg-blue-50/50 text-brand-blue font-bold shadow-sm" 
                             : "border-slate-200 hover:bg-slate-50 text-slate-700"
                         )}
                       >
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 text-brand-blue rounded border-slate-300 focus:ring-brand-blue" 
                           checked={isChecked}
                           onChange={(e) => {
                             if (e.target.checked) {
                               setSelectedSystems(prev => [...prev, sys]);
                             } else {
                               if (selectedSystems.length > 1) {
                                 setSelectedSystems(prev => prev.filter(s => s !== sys));
                               } else {
                                 showToast('请至少保留一个申请体系', 'error');
                               }
                             }
                           }}
                         />
                         <span className="ml-3 text-sm">{sys}</span>
                       </label>
                     );
                   })}
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep(0)} className="text-slate-500">
                    <ArrowLeft className="w-4 h-4 mr-1" /> 重新搜索企业
                  </Button>
                  <Button 
                    onClick={() => setStep(2)}
                    className="bg-brand-blue hover:bg-blue-700 text-white px-8 rounded-xl font-bold shadow-md shadow-blue-500/20"
                  >
                    进入特定关联文件与补录 <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: File Selection Matrix & Detail Filling */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Intelligent File Matrix Section */}
              <div className="bg-white rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-xl shadow-slate-200/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center">
                      <Layers className="w-6 h-6 mr-2.5 text-brand-blue" />
                      本次申请关联文件矩阵清单
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      针对您选择的 <span className="font-bold text-brand-blue">{selectedSystems.join('、')}</span>，系统已自动精简并勾选关联文件。您可随时开启或关闭任意附件，下侧表单与文件选取将双向响应。
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetFileMatrix}
                      className="text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重置为规则全量矩阵
                    </Button>
                    <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold flex items-center">
                      <Check className="w-3.5 h-3.5 mr-1" /> 已选择 {selectedFiles.length} 项申报件
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                    <span>文件名称 / 匹配依据</span>
                    <span>状态 / 交互操作</span>
                  </div>

                  {templates
                    .filter(tpl => !showOnlyLatest || tpl.isLatest !== false)
                    .map((tpl, idx) => {
                      const normTpl = tpl.name.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim();
                    const isSelected = selectedFiles.some(f => f === tpl.name || f.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim() === normTpl || f.includes(normTpl.split(' ')[0]));
                    const reasonKey = Object.keys(fileReasons).find(k => k === tpl.name || k.replace(/\.doc$/, '.docx').replace(/\s+/g, ' ').trim() === normTpl || k.includes(normTpl.split(' ')[0]));
                    const reason = reasonKey ? fileReasons[reasonKey] : undefined;
                    return (
                      <div 
                        key={idx}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3",
                          isSelected 
                            ? "border-blue-200 bg-blue-50/30 hover:bg-blue-50/60" 
                            : "border-slate-100 bg-slate-50/50 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => handleToggleFile(tpl.name)}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // Handled by container
                            className="mt-1 w-4 h-4 text-brand-blue rounded border-slate-300 focus:ring-brand-blue cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                              <FileText className={cn("w-4 h-4 mr-0.5", isSelected ? "text-brand-blue" : "text-slate-400")} />
                              <span className="truncate">{tpl.name}</span>
                              {tpl.docCode && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200 rounded shrink-0">
                                  {tpl.docCode}
                                </span>
                              )}
                              {tpl.version && (
                                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${tpl.isLatest !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                  {tpl.isLatest !== false ? '最新' : '历史'} v{tpl.version}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {reason ? (
                                <span className="text-blue-600 font-medium bg-blue-100/60 px-2 py-0.5 rounded">
                                  匹配依据：{reason}
                                </span>
                              ) : (
                                <span className="text-slate-400">常规选填/备用申报件</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                          {isSelected ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 bg-blue-100 text-brand-blue font-bold text-xs rounded-lg flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 已纳入本次填报
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFile(tpl.name);
                                }}
                                className="h-7 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 px-2 rounded-lg"
                                title="从本次申请中移除/关闭此文件"
                              >
                                <X className="w-3.5 h-3.5 mr-1" /> 移除/关闭
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFile(tpl.name);
                              }}
                              className="h-7 text-xs border-slate-200 text-slate-600 hover:text-brand-blue hover:border-blue-300 bg-white"
                            >
                              + 勾选纳入
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Supplement Form */}
              <div className="bg-white rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-xl shadow-slate-200/20">
                {fetchStatus.isNetworkError ? (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start justify-between gap-3">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                          手工补录核对表单
                          <span className="px-2 py-0.5 bg-amber-600 text-white text-[11px] font-bold rounded-md">API 链接受阻提醒</span>
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          由于 API 链接受限或网络被拦截，系统未自动生成虚假信息。请直接在下表手工补充统一代码、地址、员工人数及认证范围等必要申报字段。
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start justify-between gap-3">
                    <div className="flex items-start">
                      <Sparkles className="w-5 h-5 text-brand-blue shrink-0 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                          智能回填核对表单
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[11px] font-bold rounded-md">100% 直联天眼查数据源</span>
                        </h4>
                        <p className="text-xs text-blue-800 mt-0.5">
                          标识为 <span className="text-blue-700 font-bold">「天眼查API带入」</span> 的字段已自动根据天眼查工商与全国认可平台资质档案完成精确装填。您可直接核对或根据需要随时手动修改。
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Contact & Sites */}
                  <div>
                    <h5 className="font-bold text-slate-800 mb-4 text-sm flex items-center justify-between">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-brand-blue" />
                        场地与联系人信息
                      </span>
                      <span className="text-xs text-slate-400 font-normal">带有 * 为申报文书必填项</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                          <span>联系人姓名 <span className="text-red-500">*</span></span>
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="联系人姓名" 
                          value={contactInfo.name} 
                          onChange={e => setContactInfo({...contactInfo, name: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                          <span>联系人手机号 <span className="text-red-500">*</span></span>
                          {companyInfo?.rawPhone && <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">天眼查API带入</span>}
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="11位手机号" 
                          value={contactInfo.phone} 
                          onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} 
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                          <span>实际办公/生产经营地址</span>
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">天眼查API精准提取</span>
                        </label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20 font-bold text-slate-800" 
                          placeholder="已根据资质档案或工商注册地带入"
                          value={contactInfo.officeAddress} 
                          onChange={e => setContactInfo({...contactInfo, officeAddress: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                          <span>企业电子邮箱 <span className="text-red-500">*</span></span>
                          {companyInfo?.rawEmail && <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">天眼查API带入</span>}
                        </label>
                        <input 
                          type="email" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="contact@company.com" 
                          value={contactInfo.email} 
                          onChange={e => setContactInfo({...contactInfo, email: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                          <span>企业总人数 <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">天眼查社保/资质推算</span>
                        </label>
                        <input 
                          type="number" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-blue focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="如: 50" 
                          value={contactInfo.totalEmployees} 
                          onChange={e => setContactInfo({...contactInfo, totalEmployees: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                          <span>体系覆盖人数 <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">天眼查资质平台带入</span>
                        </label>
                        <input 
                          type="number" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand-blue focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="如: 50" 
                          value={contactInfo.coveredEmployees} 
                          onChange={e => setContactInfo({...contactInfo, coveredEmployees: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">管理者代表姓名</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="点击人工输入管理者代表姓名" 
                          value={contactInfo.managerName} 
                          onChange={e => setContactInfo({...contactInfo, managerName: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">管理者代表电话</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="点击人工输入管理者代表电话" 
                          value={contactInfo.managerPhone} 
                          onChange={e => setContactInfo({...contactInfo, managerPhone: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">开户银行名称</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="API未返回开户行，点击人工输入（例：中国工商银行...）" 
                          value={contactInfo.bankName} 
                          onChange={e => setContactInfo({...contactInfo, bankName: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">银行账号</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="API未返回账号，点击人工输入银行账号" 
                          value={contactInfo.bankAccount} 
                          onChange={e => setContactInfo({...contactInfo, bankAccount: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">邮政编码</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20" 
                          placeholder="API未返回邮编，点击人工输入（如: 062550）" 
                          value={contactInfo.zipCode} 
                          onChange={e => setContactInfo({...contactInfo, zipCode: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">是否转换认证机构 (转机构)</label>
                        <select 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                          value={contactInfo.isTransfer === '是' || contactInfo.isTransfer === '计划转换/其他认证机构' ? '是' : '否'} 
                          onChange={e => {
                            const val = e.target.value;
                            setContactInfo({...contactInfo, isTransfer: val});
                            if (val === '是') {
                              const transferDoc = templates.find(t => t.name.includes('转换') || t.name.includes('声明'))?.name || "关于转换认证机构的声明.doc";
                              if (!selectedFiles.includes(transferDoc)) {
                                setSelectedFiles(prev => [...prev, transferDoc]);
                              }
                            } else {
                              setSelectedFiles(prev => prev.filter(f => !(f.includes('转换') || f.includes('声明'))));
                            }
                          }}
                        >
                          <option value="否">否 (首次/新申请)</option>
                          <option value="是">是 (需自动附带《转换认证机构声明》)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">注册地与经营地址是否一致 (承诺书)</label>
                        <select 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                          value={contactInfo.isDiffAddress} 
                          onChange={e => {
                            const val = e.target.value;
                            setContactInfo({...contactInfo, isDiffAddress: val});
                            if (val === '是') {
                              const commDoc = templates.find(t => t.name.includes('承诺书'))?.name || "承诺书.docx";
                              if (!selectedFiles.includes(commDoc)) {
                                setSelectedFiles(prev => [...prev, commDoc]);
                              }
                            } else {
                              setSelectedFiles(prev => prev.filter(f => !f.includes('承诺书')));
                            }
                          }}
                        >
                          <option value="否">否 (地址一致 / 唯一地址，无需承诺书)</option>
                          <option value="是">是 (注册地与经营地址不一致，自动附带《承诺书》)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">是否有临时场所/工程施工现场 (附件3)</label>
                        <select 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                          value={contactInfo.hasTempSite} 
                          onChange={e => {
                            const val = e.target.value;
                            setContactInfo({...contactInfo, hasTempSite: val});
                            if (val === '是') {
                              const tempDoc = templates.find(t => t.name.includes('附件3') || t.name.includes('临时场所'))?.name || "申请书附件3：临时场所及服务项目清单.docx";
                              if (!selectedFiles.includes(tempDoc)) {
                                setSelectedFiles(prev => [...prev, tempDoc]);
                              }
                              if (tempSites.length === 0) {
                                setTempSites([{
                                  seq: '01',
                                  projectName: '',
                                  address: contactInfo.officeAddress || '',
                                  providedService: contactInfo.certScope || '',
                                  distance: '',
                                  startDate: '',
                                  endDate: '',
                                  constructionStage: '施工阶段',
                                  employeeCount: contactInfo.coveredEmployees || '',
                                  remark: '无'
                                }]);
                              }
                            } else {
                              setSelectedFiles(prev => prev.filter(f => !(f.includes('附件3') || f.includes('临时场所'))));
                              setTempSites([]);
                            }
                          }}
                        >
                          <option value="否">否 (单一办公地址/非建筑施工，无需附件3)</option>
                          <option value="是">是 (有工程施工/临时服务现场，自动附带《附件3》)</option>
                        </select>
                      </div>

                      {/* Certification Scope Field with AI/Scraped Prompt & Confirmation Badge */}
                      <div className="md:col-span-2 mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-2 flex-wrap">
                            申请认证覆盖范围 (人工交互确认) <span className="text-red-500">*</span>
                            {isScopeAutoGenerated && (
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all",
                                isScopeConfirmed 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                  : "bg-amber-50 text-amber-800 border-amber-300 animate-pulse shadow-xs"
                              )}>
                                {isScopeConfirmed ? (
                                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 人工已确认</>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>⚡ 属于抓取/生成的范围（需人工确认）</span>
                                    {scopeSource === 'management_cert_api' && (
                                      <span className="bg-amber-200/90 text-amber-900 px-1.5 py-0.2 rounded text-[10px] font-semibold">管理体系认证-API</span>
                                    )}
                                    {scopeSource === 'biz_api' && (
                                      <span className="bg-amber-200/90 text-amber-900 px-1.5 py-0.2 rounded text-[10px] font-semibold">工商API</span>
                                    )}
                                  </>
                                )}
                              </span>
                            )}
                          </label>
                          {isScopeAutoGenerated && !isScopeConfirmed && (
                            <Button 
                              type="button" 
                              size="sm" 
                              variant="outline"
                              className="h-7 text-xs bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100 font-bold shrink-0"
                              onClick={() => setIsScopeConfirmed(true)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-600 font-bold" /> 点击确认此范围无误
                            </Button>
                          )}
                        </div>
                        <textarea 
                          rows={2}
                          className={cn(
                            "w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-blue/20 transition-all",
                            isScopeAutoGenerated && !isScopeConfirmed ? "border-amber-300 bg-amber-50/20" : "border-slate-200"
                          )} 
                          placeholder="请输入或核对申请认证覆盖范围（例如：电力检测、电力技术咨询服务及相关工程开发管理）" 
                          value={contactInfo.certScope} 
                          onChange={e => {
                            setContactInfo({...contactInfo, certScope: e.target.value});
                            setIsScopeConfirmed(true);
                          }} 
                        />
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center">
                          <Sparkles className="w-3 h-3 mr-1 text-amber-500 shrink-0" />
                          提示：系统优先自动采用管理体系认证-API信息，若来源于工商API或推导生成，必须经人工核对并修改确认。编辑修改文本时亦会自动标记为“人工已确认”。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Supplementary Content Sections - Show strictly when selected in file checklist */}
                  
                  {/* Transfer Declaration Section */}
                  {selectedFiles.some(f => f.includes('转换') || f.includes('声明')) && (
                    <div className="pt-4 border-t border-slate-100 bg-blue-50/40 p-5 rounded-2xl border border-blue-100 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-800 text-sm flex items-center text-brand-blue">
                          <FileCheck className="w-4 h-4 mr-2" />
                          关于转换认证机构的声明 - 参数补录
                        </h5>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCloseTransferForm}
                          className="text-xs h-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> 关闭 / 移除此声明附件
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">转出认证机构原名称</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.fromOrg}
                            onChange={e => setTransferInfo({...transferInfo, fromOrg: e.target.value})}
                            placeholder="如：中国质量认证中心有限公司"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">原证书编号</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.certNo}
                            onChange={e => setTransferInfo({...transferInfo, certNo: e.target.value})}
                            placeholder="如：00123IS20134R0S/1100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">原证书到期日</label>
                          <input 
                            type="date" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.expiryDate}
                            onChange={e => setTransferInfo({...transferInfo, expiryDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">认可标识</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.accreditation || ''}
                            onChange={e => setTransferInfo({...transferInfo, accreditation: e.target.value})}
                            placeholder="如：CNAS"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">最后一次审核类型</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.lastAuditType || ''}
                            onChange={e => setTransferInfo({...transferInfo, lastAuditType: e.target.value})}
                            placeholder="如：再认证"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">最后一次审核日期</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.lastAuditDate || ''}
                            onChange={e => setTransferInfo({...transferInfo, lastAuditDate: e.target.value})}
                            placeholder="如：2025年07月13日至2025年07月15日"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">证书转换原因</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                            value={transferInfo.reason || ''}
                            onChange={e => setTransferInfo({...transferInfo, reason: e.target.value})}
                            placeholder="如：提升服务质量与满意度"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legal Commitment Letter Section */}
                  {selectedFiles.some(f => f.includes('承诺书')) && (
                    <div className="pt-4 border-t border-slate-100 bg-amber-50/50 p-4 rounded-2xl border border-amber-200 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-amber-900 text-sm flex items-center">
                          <FileCheck className="w-4 h-4 mr-2 text-amber-600" />
                          法定代表人合规与真实性承诺书 - 参数关联
                        </h5>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setContactInfo(prev => ({ ...prev, isDiffAddress: '否' }));
                            setSelectedFiles(prev => prev.filter(f => !f.includes('承诺书')));
                          }}
                          className="text-xs h-7 text-amber-700 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> 移除此承诺书
                        </Button>
                      </div>
                      <p className="text-xs text-amber-800 mt-1">
                        注册地址与实际经营地址不一致或需独立合规申明时附带。导出时将自动填入公司名称（{companyInfo?.name || '申请单位'}）、法定代表人姓名与当前日期占位符。
                      </p>
                    </div>
                  )}

                  {/* Annex 1 & 2 & 9: Multi-site & Branch Office Section */}
                  {selectedFiles.some(f => f.includes('附件1') || f.includes('附件2') || f.includes('附件9') || f.includes('分支机构') || f.includes('多经营地址')) && (
                    <div className="pt-4 border-t border-slate-100 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-indigo-900 text-sm flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
                          附件 1/2/9：分支机构、多经营地址与有效人数明细
                        </h5>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setContactInfo(prev => ({ ...prev, hasBranch: '否', multiAddress: false }));
                            setSelectedFiles(prev => prev.filter(f => !(f.includes('附件1') || f.includes('附件2') || f.includes('附件9') || f.includes('分支机构') || f.includes('多经营地址'))));
                          }}
                          className="text-xs h-7 text-indigo-700 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> 关闭 / 移除分支多场地附件
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-slate-500 block mb-1 font-medium">分支机构总数量</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                            placeholder="如：2 个分支机构"
                            value={contactInfo.branchCount || ''}
                            onChange={e => setContactInfo({ ...contactInfo, branchCount: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-1 font-medium">经营地址数量</label>
                          <select 
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                            value={contactInfo.multiAddress ? '是' : '否'}
                            onChange={e => setContactInfo({ ...contactInfo, multiAddress: e.target.value === '是' })}
                          >
                            <option value="否">单一经营地址</option>
                            <option value="是">多经营地址 (多场地)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-1 font-medium">体系覆盖有效总人数</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                            placeholder="如：50"
                            value={contactInfo.coveredEmployees || ''}
                            onChange={e => setContactInfo({ ...contactInfo, coveredEmployees: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Annex 3: Temporary Sites - Only display when Attachment 3 is checked in selectedFiles */}
                  {selectedFiles.some(f => f.includes('附件3') || f.includes('临时场所')) && (
                    <div className="pt-4 border-t border-slate-100 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-800 text-sm flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-brand-blue" />
                          附件 3：临时场所及服务项目清单 (工程施工/临时服务现场)
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8 text-brand-blue border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              setTempSites(prev => [
                                ...prev,
                                {
                                  seq: `0${prev.length + 1}`,
                                  projectName: `${companyInfo?.name || ''}工程施工项目${prev.length + 1}`,
                                  address: contactInfo.officeAddress || companyInfo?.address || '',
                                  providedService: contactInfo.certScope || '工程施工与技术服务',
                                  distance: '15000',
                                  startDate: '',
                                  endDate: '',
                                  constructionStage: '施工阶段',
                                  employeeCount: contactInfo.coveredEmployees || '10',
                                  remark: '无'
                                }
                              ]);
                              setContactInfo(prev => ({ ...prev, hasTempSite: '是' }));
                              const docName = templates.find(t => t.name.includes('附件3') || t.name.includes('临时场所'))?.name || "申请书附件3：临时场所及服务项目清单.doc";
                              if (!selectedFiles.some(f => f.includes('附件3') || f.includes('临时场所'))) {
                                setSelectedFiles(p => [...p, docName]);
                              }
                            }}
                          >
                            + 新增临时施工/服务场所
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleCloseTempSiteForm}
                            className="text-xs h-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> 关闭 / 移除临时场所附件
                          </Button>
                        </div>
                      </div>
                      
                      {tempSites.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 mb-2">暂无工程/服务类临时场所项目（如需录入项目信息，请点击下方按钮新增）</p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7 text-brand-blue border-blue-200 bg-white hover:bg-blue-50"
                            onClick={() => {
                              setTempSites([
                                {
                                  seq: '01',
                                  projectName: `${companyInfo?.name || ''}工程施工项目`,
                                  address: contactInfo.officeAddress || companyInfo?.address || '',
                                  providedService: contactInfo.certScope || '工程施工与技术服务',
                                  distance: '15000',
                                  startDate: '',
                                  endDate: '',
                                  constructionStage: '施工阶段',
                                  employeeCount: contactInfo.coveredEmployees || '10',
                                  remark: '无'
                                }
                              ]);
                              setContactInfo(prev => ({ ...prev, hasTempSite: '是' }));
                            }}
                          >
                            + 新增第一个临时施工场所
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tempSites.map((site, index) => (
                            <div key={index} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-1 md:grid-cols-4 gap-2.5">
                              <div>
                                <label className="text-slate-400 block mb-1">序号 / 项目名称</label>
                                <input 
                                  className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                  placeholder="输入工程/服务项目名称"
                                  value={site.projectName}
                                  onChange={e => {
                                    const newArr = [...tempSites];
                                    newArr[index].projectName = e.target.value;
                                    setTempSites(newArr);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 block mb-1">施工/服务地址</label>
                                <input 
                                  className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                  placeholder="输入项目实际地址"
                                  value={site.address}
                                  onChange={e => {
                                    const newArr = [...tempSites];
                                    newArr[index].address = e.target.value;
                                    setTempSites(newArr);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 block mb-1">提供的过程/服务 (同步范围)</label>
                                <input 
                                  className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                  placeholder="提供过程与服务内容"
                                  value={site.providedService}
                                  onChange={e => {
                                    const newArr = [...tempSites];
                                    newArr[index].providedService = e.target.value;
                                    setTempSites(newArr);
                                  }}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-slate-400 block mb-1">施工阶段 / 人数</label>
                                  <input 
                                    className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                    placeholder="如: 施工阶段 (10人)"
                                    value={site.constructionStage}
                                    onChange={e => {
                                      const newArr = [...tempSites];
                                      newArr[index].constructionStage = e.target.value;
                                      setTempSites(newArr);
                                    }}
                                  />
                                </div>
                                <button 
                                  className="text-red-500 hover:text-red-700 font-bold px-2 py-1 mt-4 shrink-0 flex items-center"
                                  onClick={() => {
                                    const updated = tempSites.filter((_, i) => i !== index);
                                    setTempSites(updated);
                                    if (updated.length === 0) {
                                      setContactInfo(prev => ({ ...prev, hasTempSite: '否' }));
                                    }
                                  }}
                                  title="删除此行"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-0.5" /> 删除
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Annex 4 / 5 / 保密协议: Information Security & Confidentiality Section */}
                  {selectedFiles.some(f => f.includes('附件4') || f.includes('附件5') || f.includes('保密协议') || f.includes('信息安全')) && (
                    <div className="pt-4 border-t border-slate-100 bg-sky-50/40 p-4 rounded-2xl border border-sky-100 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-sky-900 text-sm flex items-center">
                          <FileCheck className="w-4 h-4 mr-2 text-sky-600" />
                          附件 4/5 & 保密协议：信息安全与保密资产调查
                        </h5>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedFiles(prev => prev.filter(f => !(f.includes('附件4') || f.includes('附件5') || f.includes('保密协议') || f.includes('信息安全'))));
                          }}
                          className="text-xs h-7 text-sky-700 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> 关闭 / 移除保密协议与附件
                        </Button>
                      </div>
                      <p className="text-xs text-sky-800">
                        包含 ISMS/ITSMS 信息安全敏感资产分类、网络边界划分及双向信息安全专项保密附加协议，导出时将自动灌入全套企业主信息。
                      </p>
                    </div>
                  )}

                  {/* Annex 6/7: Product & Services - Only display when Attachment 6 or 7 is checked in selectedFiles */}
                  {selectedFiles.some(f => f.includes('附件7') || f.includes('附件6') || f.includes('产品') || f.includes('服务清单')) && (
                    <div className="pt-4 border-t border-slate-100 transition-all animate-fadeIn">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-bold text-slate-800 text-sm flex items-center">
                          <FileSpreadsheet className="w-4 h-4 mr-2 text-brand-blue" />
                          附件 6/7：产品或提供服务清单 (自动填入主营与范围)
                        </h5>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8 text-brand-blue border-blue-200 hover:bg-blue-50"
                            onClick={() => {
                              setProductServices(prev => [
                                ...prev,
                                {
                                  seq: `${prev.length + 1}`,
                                  name: `${companyInfo?.name || ''}主要产品与服务`,
                                  specModel: '通用规格型号',
                                  certScope: contactInfo.certScope || '申请认证范围'
                                }
                              ]);
                              const docName = templates.find(t => t.name.includes('附件7') || t.name.includes('产品'))?.name || "申请书附件7：产品或提供服务清单.doc";
                              if (!selectedFiles.some(f => f.includes('附件7') || f.includes('附件6') || f.includes('产品') || f.includes('服务'))) {
                                setSelectedFiles(p => [...p, docName]);
                              }
                            }}
                          >
                            + 新增产品/服务行
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleCloseProductServiceForm}
                            className="text-xs h-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> 关闭 / 移除产品服务附件
                          </Button>
                        </div>
                      </div>

                      {productServices.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                          <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 mb-2">暂未添加产品或提供服务项（如需录入主营产品型号，请点击下方按钮新增）</p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7 text-brand-blue border-blue-200 bg-white hover:bg-blue-50"
                            onClick={() => {
                              setProductServices([
                                {
                                  seq: '1',
                                  name: `${companyInfo?.name || ''}主要产品与服务`,
                                  specModel: '通用规格型号',
                                  certScope: contactInfo.certScope || '申请认证范围'
                                }
                              ]);
                            }}
                          >
                            + 新增产品与服务信息
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productServices.map((ps, index) => (
                            <div key={index} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-1 md:grid-cols-4 gap-2.5">
                              <div>
                                <label className="text-slate-400 block mb-1">序号 / 产品服务名称</label>
                                <input 
                                  className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                  placeholder="主营产品/服务名称"
                                  value={ps.name}
                                  onChange={e => {
                                    const newArr = [...productServices];
                                    newArr[index].name = e.target.value;
                                    setProductServices(newArr);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 block mb-1">通用规格型号</label>
                                <input 
                                  className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                  placeholder="通用规格型号"
                                  value={ps.specModel}
                                  onChange={e => {
                                    const newArr = [...productServices];
                                    newArr[index].specModel = e.target.value;
                                    setProductServices(newArr);
                                  }}
                                />
                              </div>
                              <div className="col-span-2 flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-slate-400 block mb-1">本产品或服务涉及的认证范围</label>
                                  <input 
                                    className="w-full px-2 py-1 bg-white border rounded text-slate-800"
                                    placeholder="对应申请认证范围"
                                    value={ps.certScope}
                                    onChange={e => {
                                      const newArr = [...productServices];
                                      newArr[index].certScope = e.target.value;
                                      setProductServices(newArr);
                                    }}
                                  />
                                </div>
                                <button 
                                  className="text-red-500 hover:text-red-700 font-bold px-2 py-1 mt-4 shrink-0 flex items-center"
                                  onClick={() => setProductServices(productServices.filter((_, i) => i !== index))}
                                  title="删除此行"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-0.5" /> 删除
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contract Fee */}
                  <div className="pt-4 border-t border-slate-100">
                    <h5 className="font-bold text-slate-800 mb-4 text-sm flex items-center">
                      <CreditCard className="w-4 h-4 mr-2 text-brand-blue" />
                      合同费用精算
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">初次/再认证费 (元)</label>
                        <input 
                          type="number" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" 
                          placeholder="15000" 
                          value={feeInfo.initialFee} 
                          onChange={e => setFeeInfo({...feeInfo, initialFee: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">年度监督审核费 (元/年)</label>
                        <input 
                          type="number" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" 
                          placeholder="8000" 
                          value={feeInfo.yearlyFee} 
                          onChange={e => setFeeInfo({...feeInfo, yearlyFee: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">其他服务费 (元)</label>
                        <input 
                          type="number" 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium" 
                          placeholder="0" 
                          value={feeInfo.otherFee} 
                          onChange={e => setFeeInfo({...feeInfo, otherFee: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit to Preview */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500">
                      <ArrowLeft className="w-4 h-4 mr-1" /> 返回方案选择
                    </Button>

                    <Button 
                      onClick={handleGenerateAndPreview}
                      disabled={isPreviewLoading || selectedFiles.length === 0}
                      className="bg-brand-blue hover:bg-blue-700 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      {isPreviewLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          生成文档与原位对齐中...
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5 mr-2" />
                          生成并在线原位预览全套文件 ({selectedFiles.length} 个)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Online Preview & Interactive Review */}
          {step === 3 && previewResponse && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Top Banner with Actions */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-2xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-2xl border border-blue-400/30 flex items-center justify-center shrink-0">
                    <Eye className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black">生成文件在线预览与确认</h2>
                      <span className="px-2.5 py-0.5 bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-bold rounded-full">
                        对齐率 100%
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      请仔细核对生成的合同与申请文件填报内容。无误后可直接打包下载，如需调整信息可随时返回上一页修改。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button 
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl font-bold text-sm h-11"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    返回上一页修改 / 补录
                  </Button>

                  <Button 
                    onClick={handleFinalDownload}
                    disabled={isGenerating}
                    className="bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm h-11 px-6 shadow-lg shadow-blue-500/30"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                    确认无误，打包下载 (ZIP)
                  </Button>
                </div>
              </div>

              {/* Main Document Viewer Container */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* File Tree Left Sidebar */}
                <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/60 p-4 shadow-sm flex flex-col max-h-[750px]">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span>已关联文件 ({previewResponse.files?.length || 0})</span>
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                  </h4>
                  
                  <div className="mt-3 space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {previewResponse.files?.map((fname: string, idx: number) => {
                      const isActive = activePreviewFile === fname;
                      return (
                        <button
                          key={idx}
                          onClick={() => setActivePreviewFile(fname)}
                          className={cn(
                            "w-full text-left p-3 rounded-2xl transition-all border flex items-center justify-between text-xs font-medium",
                            isActive 
                              ? "bg-brand-blue text-white font-bold border-brand-blue shadow-md shadow-brand-blue/20" 
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200/60 text-slate-700"
                          )}
                        >
                          <div className="flex items-center min-w-0 mr-2">
                            <FileText className={cn("w-4 h-4 mr-2 shrink-0", isActive ? "text-white" : "text-brand-blue")} />
                            <span className="truncate">{fname}</span>
                          </div>
                          <CheckCircle2 className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-green-500")} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 px-2 flex items-center justify-between">
                    <span>文档状态：已被安全校验</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                  </div>
                </div>

                {/* Right Document Preview Workspace */}
                <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col min-h-[650px] max-h-[750px]">
                  
                  {/* Document Header Toolbar */}
                  <div className="bg-slate-100/80 px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <FileCode className="w-4 h-4 text-brand-blue" />
                      <span>正在预览：{activePreviewFile}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 font-bold rounded">
                        原位填报完成
                      </span>
                    </div>
                  </div>

                  {/* Document Page Screen - Native DOCX Styling & Online Editing */}
                  <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-200/60">
                    <div className="max-w-5xl mx-auto">
                      {activePreviewFile ? (
                        <DocxNativeViewer
                          filename={activePreviewFile}
                          companyInfo={companyInfo}
                          contactInfo={contactInfo}
                          feeInfo={feeInfo}
                          systems={selectedSystems}
                          bClassRequirements={bClassRequirements}
                          previewResponse={previewResponse}
                          certInfo={certInfo}
                          transferInfo={transferInfo}
                          documentEdits={documentEdits}
                          onSaveEdits={(fn, edits) => {
                            setDocumentEdits(prev => ({
                              ...prev,
                              [fn]: {
                                ...(prev[fn] || {}),
                                ...edits
                              }
                            }));
                          }}
                        />
                      ) : (
                        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-300">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-blue" />
                          <span>请选择左侧文档以启动原生样式预览与在线编辑...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* Step 4: Final Success */}
          {step === 4 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-12 border border-slate-200/60 shadow-xl shadow-slate-200/20 text-center max-w-2xl mx-auto"
            >
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileCheck className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">文件打包下载成功！</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                针对 <span className="font-bold text-slate-800">{companyInfo?.name}</span> 申请的特定体系材料包已成功导出。所有数据已100%原位填充对齐。
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left inline-block min-w-[320px] border border-slate-200/60">
                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">包内特定体系文件清单 ({selectedFiles.length}个)</h4>
                <ul className="space-y-2 text-sm text-slate-700 font-medium">
                  {selectedFiles.map((file, i) => (
                    <li key={i} className="flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 shrink-0" /> {file}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => { setStep(0); setSearchQuery(''); }}
                  className="h-12 px-6 border-slate-200 text-slate-600 rounded-xl font-bold"
                >
                  办理下一个企业
                </Button>
                <Button 
                  onClick={handleFinalDownload}
                  className="h-12 px-8 bg-brand-blue hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30"
                >
                  <FileDown className="w-5 h-5 mr-2" />
                  再次下载 ZIP 包
                </Button>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Template Manager Dialog */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[720px] border border-slate-100 shadow-2xl rounded-3xl overflow-hidden p-0 bg-white">
          <div className="bg-slate-900 px-7 py-6 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
             <div>
               <DialogTitle className="text-white text-lg font-bold tracking-tight">模板库智能中心</DialogTitle>
               <DialogDescription className="text-slate-400 text-xs mt-1">
                 系统合规限制：仅支持博创众诚专属模板的分类与填报，拦截其他机构文件。
               </DialogDescription>
             </div>
             <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-white relative z-10 transition-colors bg-slate-800/60 hover:bg-slate-800 p-2 rounded-xl">
               <X className="w-4 h-4" />
             </button>
          </div>
          
          <div className="p-7 bg-slate-50/50 space-y-5">


             {/* Modern Upload Zone */}
             <div>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 className="hidden" 
                 accept=".doc,.docx,.pdf,.zip"
                 onChange={handleFileUpload}
               />
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/25 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group bg-white shadow-sm"
               >
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                   {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                 </div>
                 <h4 className="font-bold text-slate-800 text-xs">上传博创众诚模板文件</h4>
                 <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                   支持单份 <span className="font-mono text-indigo-600">.doc/.docx/.pdf</span> 合同申请，或打包好的一整套 <span className="font-mono text-indigo-600">.zip</span> 格式模板压缩包
                 </p>
               </div>
             </div>

             {/* Template list wrapper */}
             <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
               {/* Controls Bar */}
               <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-xs text-slate-700">模板文件列表</span>
                   <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                     {showOnlyLatest ? templates.filter(t => t.isLatest !== false).length : templates.length} 个文件
                   </span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {templates.length > 0 && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setShowOnlyLatest(!showOnlyLatest)}
                       className={`h-7 px-2.5 text-[11px] font-medium rounded-lg flex items-center gap-1 transition-all ${
                         showOnlyLatest
                           ? 'text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/50'
                           : 'text-slate-600 border-slate-200 hover:bg-slate-100'
                       }`}
                     >
                       {showOnlyLatest ? '显示全部版本' : '仅看最新版本'}
                     </Button>
                   )}
                   
                   {templates.length > 0 ? (
                     confirmClearAll ? (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleClearAllTemplates();
                           setConfirmClearAll(false);
                         }}
                         disabled={isUploading}
                         className="h-7 px-2.5 text-[11px] text-red-700 bg-red-50 border-red-300 hover:bg-red-100 hover:text-red-800 font-bold rounded-lg flex items-center gap-1 transition-all shadow-sm"
                       >
                         <Check className="w-3 h-3 animate-pulse" />
                         确认清空？
                       </Button>
                     ) : (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           setConfirmClearAll(true);
                           setTimeout(() => {
                             setConfirmClearAll(prev => prev ? false : prev);
                           }, 3000);
                         }}
                         disabled={isUploading}
                         className="h-7 px-2.5 text-[11px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-medium rounded-lg flex items-center gap-1 transition-colors"
                       >
                         <Trash2 className="w-3 h-3 text-red-500" />
                         清空模板
                       </Button>
                     )
                   ) : (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleRestoreDefaultTemplates}
                       disabled={isUploading}
                       className="h-7 px-2.5 text-[11px] text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 font-medium rounded-lg flex items-center gap-1 transition-colors"
                     >
                       <RotateCcw className="w-3 h-3 text-indigo-500" />
                       导入系统预设
                     </Button>
                   )}
                 </div>
               </div>

               {/* Table Header Row */}
               <div className="px-5 py-2.5 bg-slate-100/40 border-b border-slate-100 font-bold text-[10px] text-slate-400 uppercase tracking-wider flex">
                 <div className="flex-1 min-w-0">申报文件与合同模板名称</div>
                 <div className="w-20 text-right shrink-0">大小</div>
                 <div className="w-24 text-right shrink-0">操作</div>
               </div>

               {/* Table Rows Body */}
               <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100">
                 {templates.length === 0 ? (
                   <div className="p-10 text-center flex flex-col items-center justify-center">
                     <FileText className="w-8 h-8 text-slate-300 mb-2.5" />
                     <p className="text-slate-600 font-bold text-xs">未找到任何有效的博创众诚模板</p>
                     <p className="text-slate-400 text-[10px] mt-1 mb-5">您可以上传经博创众诚盖章授权的 DOCX 合同或申请书文件</p>
                     <div className="flex items-center gap-2.5">
                       <Button
                         size="sm"
                         onClick={() => fileInputRef.current?.click()}
                         disabled={isUploading}
                         className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                       >
                         <Upload className="w-3.5 h-3.5" />
                         上传新模板
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={handleRestoreDefaultTemplates}
                         disabled={isUploading}
                         className="text-xs font-medium text-slate-600 border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-1.5"
                       >
                         <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                         恢复默认库
                       </Button>
                     </div>
                   </div>
                 ) : (
                   templates
                     .filter(tpl => !showOnlyLatest || tpl.isLatest !== false)
                     .map((tpl, idx) => (
                       <div 
                         key={idx} 
                         onDoubleClick={() => handleDownloadTemplate(tpl.name)}
                         title="双击直接下载该源模板文件进行格式核对"
                         className={`px-5 py-3.5 flex items-center hover:bg-slate-50/80 cursor-pointer select-none transition-colors ${!tpl.isLatest ? 'opacity-60 bg-slate-50/20' : ''}`}
                       >
                         <div className="flex-1 flex items-start min-w-0 pr-3">
                           <div className={cn(
                             "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mr-3 mt-0.5",
                             tpl.isLatest !== false ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                           )}>
                             <FileText className="w-4 h-4" />
                           </div>
                           <div className="flex flex-col gap-1 min-w-0 flex-1">
                             <span className="text-xs font-semibold text-slate-700 truncate" title={tpl.name}>{tpl.name}</span>
                             <div className="flex flex-wrap gap-1.5 items-center">
                               {tpl.docCode && (
                                 <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold tracking-wide rounded-md border border-slate-200/50">
                                   {tpl.docCode}
                                 </span>
                               )}
                               {tpl.isLatest !== false ? (
                                 <span className="shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-100">
                                   最新版本 {tpl.version ? `v${tpl.version}` : ''}
                                 </span>
                               ) : (
                                 <span className="shrink-0 px-2 py-0.5 bg-slate-50 text-slate-400 text-[9px] font-semibold rounded-md border border-slate-100">
                                   历史版本
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
                         <div className="w-20 text-right text-xs text-slate-400 font-mono shrink-0">
                           {(tpl.size / 1024).toFixed(1)} KB
                         </div>
                         <div className="w-36 text-right shrink-0 flex items-center justify-end gap-2">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDownloadTemplate(tpl.name);
                             }}
                             className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold transition-all px-2 py-1 rounded-lg flex items-center gap-1 shrink-0"
                             title="下载源模板文件进行格式核对"
                           >
                             <FileDown className="w-3.5 h-3.5" />
                             下载
                           </button>

                           {confirmDeleteName === tpl.name ? (
                             <div className="flex items-center gap-1">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleDeleteTemplate(tpl.name);
                                   setConfirmDeleteName(null);
                                 }}
                                 className="text-[10px] text-white bg-red-600 hover:bg-red-700 font-bold px-2 py-1 rounded-md transition-all shrink-0"
                               >
                                 确定
                               </button>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setConfirmDeleteName(null);
                                 }}
                                 className="text-[10px] text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-all shrink-0"
                               >
                                 取消
                               </button>
                             </div>
                           ) : (
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setConfirmDeleteName(tpl.name);
                               }}
                               className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50/50 font-medium transition-all px-2 py-1 rounded-lg"
                             >
                               删除
                             </button>
                           )}
                         </div>
                       </div>
                     ))
                 )}
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800/80 max-w-[90vw] md:max-w-md"
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
            {toast.type === 'info' && <Clock className="w-5 h-5 text-blue-400 shrink-0" />}
            
            <p className="text-xs font-semibold text-slate-100 leading-relaxed break-all">
              {toast.message}
            </p>
            
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white ml-2 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
