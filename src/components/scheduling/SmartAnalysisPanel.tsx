import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Upload, FileText, MapPin, Users, Layers, Search, Building2, CheckCircle2, Trash2, ArrowRight, RefreshCw, Sparkles, Filter, FileSpreadsheet, AlertCircle, Award, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import * as XLSX from 'xlsx';
import { categoriesTree } from '../../data/categories';
import customMappingsRaw from '../../data/custom_mappings.json';

export interface CertRecord {
  id: string;
  province: string;      // 省份
  orgName: string;       // 组织全程/全称
  salesperson: string;   // 业务员
  standard: string;      // 标准
  totalMandays: number;  // 总人日
  profCode: string;      // 专业代码
  regAddress: string;    // 注册地址
  opsAddress: string;    // 经营地址
  contractNo: string;    // 合同编号
  riskLevel: string;     // 风险等级
  personnelCount: number;// 体系人数
  accreditation: string; // 认可标志
  appScope: string;      // 申请范围
  projectStatus?: string; // 项目状态
  isDemo?: boolean;
  isAutoMatched?: boolean; // 是否是系统自动匹配
  matchReason?: string;    // 自动匹配依据
}

const DEMO_RECORDS: CertRecord[] = [
  {
    id: "REC-1001",
    province: "山东",
    orgName: "山东双力重工股份有限公司",
    salesperson: "刘美芳",
    standard: "QMS / EMS / OHSMS",
    totalMandays: 12.5,
    profCode: "17.02.01 (机械制造)",
    regAddress: "山东省济南市高新区港兴三路100号",
    opsAddress: "山东省济南市高新区港兴三路100号",
    contractNo: "HT-2026-SD0911",
    riskLevel: "高风险",
    personnelCount: 450,
    accreditation: "CNAS",
    appScope: "履带式重型液压挖掘机、旋挖钻机及高空作业车的设计、制造、售后服务和相关管理活动",
    projectStatus: "待派人"
  },
  {
    id: "REC-1002",
    province: "江苏",
    orgName: "苏州浩华精密电子科技有限公司",
    salesperson: "张建国",
    standard: "QMS / ISMS",
    totalMandays: 6.0,
    profCode: "19.01.02 (电子装配)",
    regAddress: "江苏省苏州市工业园区星湖街328号",
    opsAddress: "江苏省苏州市吴中区经济开发区旺山路88号",
    contractNo: "HT-2026-JS4412",
    riskLevel: "中风险",
    personnelCount: 120,
    accreditation: "CNAS / UKAS",
    appScope: "高精度贴片电容、薄膜电阻及双面多层印制电路板的贴片装配(SMT)和测试服务",
    projectStatus: "待审核"
  },
  {
    id: "REC-1003",
    province: "广东",
    orgName: "深圳科创源数字能源技术服务有限公司",
    salesperson: "陈晓东",
    standard: "QMS / EMS / OHSMS / ITSMS",
    totalMandays: 16.0,
    profCode: "35.04.02 (软件和信息技术)",
    regAddress: "广东省深圳市南山区高新南九道软件产业基地",
    opsAddress: "广东省深圳市南山区高新南九道软件产业基地1栋A座",
    contractNo: "HT-2026-GD8809",
    riskLevel: "中风险",
    personnelCount: 380,
    accreditation: "CNAS",
    appScope: "分布式光伏电站运维监控系统、BMS电池管理系统开发、软件系统集成及技术支持外包服务",
    projectStatus: "待派人"
  },
  {
    id: "REC-1004",
    province: "浙江",
    orgName: "宁波佳源塑胶制品有限公司",
    salesperson: "王海涛",
    standard: "EMS / OHSMS",
    totalMandays: 4.5,
    profCode: "14.01.01 (橡胶和塑料制品)",
    regAddress: "浙江省宁波市北仑区黄山路12号",
    opsAddress: "浙江省宁波市北仑区春晓工业区云霄路15号",
    contractNo: "HT-2026-ZJ1234",
    riskLevel: "一般风险",
    personnelCount: 85,
    accreditation: "CNAS",
    appScope: "汽车用注塑保险杠、塑料格栅及精密仪表面板的注塑成型生产与销售",
    projectStatus: "审核中"
  },
  {
    id: "REC-1005",
    province: "四川",
    orgName: "成都蜀山香料食品加工厂",
    salesperson: "李建平",
    standard: "QMS / FSMS",
    totalMandays: 8.0,
    profCode: "03.01.02 (食品加工)",
    regAddress: "四川省成都市温江区海峡两岸科技产业开发园",
    opsAddress: "四川省成都市郫都区现代工业港北区安和路18号",
    contractNo: "HT-2026-SC5589",
    riskLevel: "高风险",
    personnelCount: 150,
    accreditation: "CNAS",
    appScope: "固态调味粉、复合火锅底料及半固态香辛酱料的炒制加工、灌装及销售",
    projectStatus: "待派人"
  },
  {
    id: "REC-1006",
    province: "北京",
    orgName: "北京天工智联安全防护设备有限公司",
    salesperson: "刘美芳",
    standard: "QMS",
    totalMandays: 4.0,
    profCode: "22.01 (防护设备)",
    regAddress: "北京市昌平区科技园区超前路37号",
    opsAddress: "北京市昌平区南口镇工业区红泥路8号",
    contractNo: "HT-2026-BJ0033",
    riskLevel: "中风险",
    personnelCount: 65,
    accreditation: "CNAS",
    appScope: "特种工业防护口罩、耐高温作业手套及防静电服的剪裁缝制与装配",
    projectStatus: "待审核"
  },
  {
    id: "REC-1007",
    province: "江苏",
    orgName: "南京泽浩路电力科技有限公司",
    salesperson: "朱经理",
    standard: "QMS / EMS",
    totalMandays: 6.0,
    profCode: "", // No code
    regAddress: "江苏省南京市江宁区诚信大道88号",
    opsAddress: "江苏省南京市江宁区诚信大道88号",
    contractNo: "HT-2026-JS8977",
    riskLevel: "中风险",
    personnelCount: 45,
    accreditation: "CNAS",
    appScope: "输配电及控制设备、电线电缆、电子元器件的技术研发、制造、销售及技术服务",
    projectStatus: "待评审"
  },
  {
    id: "REC-1008",
    province: "陕西",
    orgName: "陕西开达化工有限责任公司",
    salesperson: "杨经理",
    standard: "QMS / EMS",
    totalMandays: 8.5,
    profCode: "", // No code
    regAddress: "陕西省西安市高新区锦业路32号",
    opsAddress: "陕西省西安市高新区锦业路32号",
    contractNo: "HT-2026-SX5521",
    riskLevel: "高风险",
    personnelCount: 110,
    accreditation: "CNAS",
    appScope: "水处理剂、石油助剂、精细化工产品（不含危险化学品及易制毒品）的生产与销售",
    projectStatus: "待评审"
  },
  {
    id: "REC-1009",
    province: "河北",
    orgName: "河北启恒电力科技有限公司",
    salesperson: "张经理",
    standard: "QMS / EMS / OHSMS",
    totalMandays: 10.0,
    profCode: "", // No code
    regAddress: "河北省石家庄市新华区裕华路102号",
    opsAddress: "河北省石家庄市新华区裕华路102号",
    contractNo: "HT-2026-HB4401",
    riskLevel: "中风险",
    personnelCount: 75,
    accreditation: "CNAS",
    appScope: "高低压开关柜、配电箱、电力变压器、箱式变电站、电缆桥架的组装、生产及销售",
    projectStatus: "待派人"
  },
  {
    id: "REC-1010",
    province: "江苏",
    orgName: "南京营销检测服务有限公司",
    salesperson: "王经理",
    standard: "QMS",
    totalMandays: 4.5,
    profCode: "", // No code
    regAddress: "江苏省南京市鼓楼区中山路99号",
    opsAddress: "江苏省南京市鼓楼区中山路99号",
    contractNo: "HT-2026-JS9011",
    riskLevel: "一般风险",
    personnelCount: 30,
    accreditation: "CNAS",
    appScope: "计算机软硬件的技术开发、销售、技术咨询、技术服务；网络系统集成",
    projectStatus: "待评审"
  },
  {
    id: "REC-1011",
    province: "山东",
    orgName: "山东硒科智能科技有限公司",
    salesperson: "徐经理",
    standard: "QMS / EMS / OHSMS",
    totalMandays: 12.0,
    profCode: "", // No code
    regAddress: "山东省济南市历下区泉城路1号",
    opsAddress: "山东省济南市历下区泉城路1号",
    contractNo: "HT-2026-SD5541",
    riskLevel: "高风险",
    personnelCount: 160,
    accreditation: "CNAS",
    appScope: "智能机器人、自动化控制设备、传感器、电子产品的研发、组装生产与技术服务",
    projectStatus: "待派人"
  },
  {
    id: "REC-1012",
    province: "江苏",
    orgName: "常州塞层新材料科技有限公司",
    salesperson: "周经理",
    standard: "QMS / EMS",
    totalMandays: 7.0,
    profCode: "", // No code
    regAddress: "江苏省常州市新北区长江路200号",
    opsAddress: "江苏省常州市新北区长江路200号",
    contractNo: "HT-2026-JS1123",
    riskLevel: "一般风险",
    personnelCount: 50,
    accreditation: "CNAS",
    appScope: "高分子新材料、泡沫塑料、包装材料的设计、生产与销售",
    projectStatus: "待评审"
  }
];

// Flat-mapping core categories logic for local fast indexing (Range Retrieval)
const flatCategoriesList: any[] = [];
const flattenTreeNodes = (nodes: any[]) => {
  nodes.forEach(node => {
    flatCategoriesList.push({
      code: node.smallId || node.mediumId || node.majorId || '',
      name: node.name || '',
      description: node.description || '',
      includes: node.includes || [],
      excludes: node.excludes || []
    });
    if (node.children && node.children.length > 0) {
      flattenTreeNodes(node.children);
    }
  });
};
if (categoriesTree && categoriesTree.length > 0) {
  flattenTreeNodes(categoriesTree);
}

// Local Range Matching Heuristic
const matchScopeToCodesLocal = (scope: string, orgName: string, standardStr: string): { codeString: string, reason: string } => {
  if (!scope) return { codeString: '', reason: '无申请范围' };
  
  const matchedCodesSet = new Set<string>();
  const matchReasons: string[] = [];
  
  // 1. Check exact or partial matches in custom mappings
  const sortedCustomKeys = Object.keys(customMappingsRaw).sort((a, b) => b.length - a.length);
  let customMatched = false;
  for (const key of sortedCustomKeys) {
    if (key.length >= 2 && (scope.includes(key) || orgName.includes(key))) {
      const codes = (customMappingsRaw as Record<string, string[]>)[key];
      if (codes && codes.length > 0) {
        codes.forEach(c => matchedCodesSet.add(c));
        matchReasons.push(`映射词库匹配: "${key}"`);
        customMatched = true;
        if (matchedCodesSet.size >= 2) break;
      }
    }
  }
  
  // 2. Look for matches in categoriesTree name or includes
  if (!customMatched) {
    for (const cat of flatCategoriesList) {
      const code = cat.code;
      if (!code || code.length < 5) continue;
      
      const name = cat.name;
      if (name && name.length >= 2 && scope.includes(name)) {
        matchedCodesSet.add(code);
        matchReasons.push(`标准分类名匹配: "${name}"`);
        if (matchedCodesSet.size >= 2) break;
      }
      
      if (cat.includes && Array.isArray(cat.includes)) {
        for (const inc of cat.includes) {
          const cleanInc = String(inc).replace(/如：|等/g, '');
          if (cleanInc.length >= 3 && scope.includes(cleanInc)) {
            matchedCodesSet.add(code);
            matchReasons.push(`标准业务项包含匹配: "${cleanInc}"`);
            break;
          }
        }
        if (matchedCodesSet.size >= 2) break;
      }
    }
  }

  // 3. Fallback Heuristics for typical industries
  if (matchedCodesSet.size === 0) {
    if (scope.includes('软件') || scope.includes('系统集成') || scope.includes('信息技术') || scope.includes('互联网') || scope.includes('APP') || scope.includes('数据库')) {
      matchedCodesSet.add('33.02.01');
      matchReasons.push('软件服务默认映射');
    } else if (scope.includes('变压器') || scope.includes('开关柜') || scope.includes('电力') || scope.includes('电线') || scope.includes('电缆') || scope.includes('输配电')) {
      matchedCodesSet.add('19.01.02');
      matchReasons.push('电力电气制造默认映射');
    } else if (scope.includes('化工') || scope.includes('化学') || scope.includes('水处理剂') || scope.includes('石油助剂')) {
      matchedCodesSet.add('12.01.01');
      matchReasons.push('精细化工制造默认映射');
    } else if (scope.includes('塑料') || scope.includes('注塑') || scope.includes('高分子') || scope.includes('泡沫塑料') || scope.includes('包装材料')) {
      matchedCodesSet.add('14.02.01');
      matchReasons.push('塑料包装新材料默认映射');
    } else if (scope.includes('机械') || scope.includes('制造') || scope.includes('设备') || scope.includes('机器人') || scope.includes('传感器')) {
      matchedCodesSet.add('17.10.02');
      matchReasons.push('智能机械制造默认映射');
    } else {
      matchedCodesSet.add('17.02');
      matchReasons.push('智能判定通用分类');
    }
  }

  // 4. Format codes grouped by standards (待评审无代码项目只匹配三体系代码 QMS, EMS, OHSMS)
  const standards = standardStr.split(/[^A-Za-z0-9]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  const codesList = Array.from(matchedCodesSet);
  
  const formattedParts: string[] = [];
  standards.forEach(std => {
    // 待评审无代码的项目，只匹配三体系代码
    if (std === 'QMS' || std === 'EMS' || std === 'OHSMS') {
      const codePart = codesList.join(', ');
      formattedParts.push(`${std}: ${codePart}`);
    }
  });

  const finalCodeString = formattedParts.join('; ') || `QMS: ${codesList.join(', ')}`;
  const finalReason = matchReasons.join(' | ');

  return { codeString: finalCodeString, reason: finalReason };
};

const renderProfCodes = (profCode: string) => {
  if (!profCode) return <span className="text-slate-400 font-normal">-</span>;
  const codes = profCode.split(/[;；,，\s]+/).map(c => c.trim()).filter(Boolean);
  if (codes.length === 0) return <span className="text-slate-400 font-normal">-</span>;
  return (
    <div className="flex flex-wrap gap-1.5 py-1 max-w-full">
      {codes.map((code, idx) => (
        <span 
          key={idx} 
          className="font-mono text-[10.5px] font-bold text-slate-700 bg-slate-100/60 border border-slate-200/50 rounded px-1.5 py-0.5 inline-block whitespace-nowrap shadow-xs hover:bg-slate-200/50 transition-colors"
        >
          {code}
        </span>
      ))}
    </div>
  );
};

const renderStandards = (standard: string) => {
  if (!standard) return <span className="text-slate-400 font-normal">-</span>;
  const items = standard.split(/[,，;；/|\s]+/).map(s => s.trim()).filter(Boolean);
  if (items.length === 0) return <span className="text-slate-400 font-normal">-</span>;
  return (
    <div className="flex flex-wrap gap-1 py-1 max-w-full">
      {items.map((item, idx) => (
        <span 
          key={idx} 
          className="bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 font-bold text-[10px] inline-block whitespace-nowrap shadow-xs hover:bg-blue-100/70 transition-colors"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const renderContractNo = (contractNo: string) => {
  if (!contractNo) return <span className="text-slate-400 font-normal">-</span>;
  const match = contractNo.match(/^([A-Za-z0-9\-]+)(.*)$/);
  if (match) {
    const code = match[1];
    const rest = match[2].trim();
    if (rest) {
      const formattedRest = rest
        .replace(/(合同状态：|项目组备注：|市场要求：|审核要求：|评审备注：|专业管理人员：)/g, '\n$1')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
        
      return (
        <div className="flex flex-col gap-1 py-1 text-[11px] leading-relaxed max-w-full">
          <span className="font-mono font-bold text-slate-800 bg-slate-100/80 border border-slate-200/50 rounded px-1.5 py-0.5 inline-block w-fit whitespace-nowrap shadow-xs">
            {code}
          </span>
          {formattedRest.map((item, idx) => (
            <span key={idx} className="text-slate-500 font-medium text-[10px] break-words whitespace-normal leading-normal pl-0.5">
              {item}
            </span>
          ))}
        </div>
      );
    } else {
      return (
        <span className="font-mono font-bold text-slate-800 bg-slate-100/80 border border-slate-200/50 rounded px-1.5 py-0.5 inline-block w-fit whitespace-nowrap shadow-xs">
          {code}
        </span>
      );
    }
  }
  return <span className="break-all whitespace-normal leading-relaxed text-slate-600 font-medium">{contractNo}</span>;
};

const matchProvince = (prov1: string, prov2: string): boolean => {
  if (!prov1 || !prov2) return false;
  const p1 = String(prov1).trim().replace(/[省市区县特别行政区自治区]/g, '');
  const p2 = String(prov2).trim().replace(/[省市区县特别行政区自治区]/g, '');
  if (!p1 || !p2) return false;
  return p1.startsWith(p2) || p2.startsWith(p1) || p1 === p2;
};

const parseProvinceCity = (addressStr: string) => {
  const address = String(addressStr || '').trim();
  if (!address) return { province: '未知', city: '未知' };
  
  // Simple heuristics for Chinese provinces and municipalities
  const municipalities = ['北京', '上海', '天津', '重庆'];
  for (const m of municipalities) {
    if (address.includes(m)) return { province: m, city: m };
  }
  
  const provinceMatch = address.match(/^([^省]+省|内蒙古自治区|新疆维吾尔自治区|西藏自治区|宁夏回族自治区|广西壮族自治区)/);
  const province = provinceMatch ? provinceMatch[1].replace(/省$/, '') : address.substring(0, 2);
  
  // Try to get city
  let city = '其他';
  const rest = provinceMatch ? address.substring(provinceMatch[0].length) : address.substring(2);
  const cityMatch = rest.match(/^([^市]+市|[^州]+自治州|[^盟]+盟)/);
  if (cityMatch) {
    city = cityMatch[1];
  } else if (rest.length > 0) {
    city = rest.substring(0, 3).replace(/[区县街道]/g, '');
  }
  
  return { 
    province: province.substring(0, 3).replace(/[市区县]/g, ''), 
    city: city.replace(/市$/, '') 
  };
};

const getQualifications = (majorStr: string) => {
  const str = String(majorStr || '').toUpperCase();
  const hasQ = str.includes('Q') || str.includes('质量');
  const hasE = str.includes('E') || str.includes('环境');
  const hasS = str.includes('S') || str.includes('职业健康') || str.includes('安全');
  
  const list: string[] = [];
  if (hasQ) list.push('Q');
  if (hasE) list.push('E');
  if (hasS) list.push('S');
  return list;
};

const normalizeSystem = (sys: string): string => {
  if (!sys) return '';
  const s = sys.toUpperCase().trim();
  if (s === 'Q' || s === 'QMS' || s.includes('质量')) return 'QMS';
  if (s === 'E' || s === 'EMS' || s.includes('环境')) return 'EMS';
  if (s === 'S' || s === 'OHSMS' || s === 'OHSAS' || s.includes('职业') || s.includes('安全')) return 'OHSMS';
  return s;
};

const normalizeCode = (code: string): string => {
  if (!code) return '';
  return code
    .split('.')
    .map(part => {
      const trimmed = part.trim();
      if (/^\d+$/.test(trimmed)) {
        return trimmed.length === 1 ? '0' + trimmed : trimmed;
      }
      return trimmed;
    })
    .join('.');
};

const getTeacherCodes = (t: any): string[] => {
  const codeStr = String(t['专业类别'] || t['代码'] || t['代码类型'] || t.code || t.Code || '').trim();
  if (!codeStr) return [];

  const parts = codeStr.split(/[;；\n]+/).map(p => p.trim()).filter(Boolean);
  const codes: string[] = [];
  let currentSystem = '';

  parts.forEach(p => {
    let codeVal = p;
    const match = p.match(/^([A-Za-z0-9]+)(?:[\u4e00-\u9fa5]*)?[:：](.*)/i);
    if (match) {
      currentSystem = match[1].toUpperCase();
      codeVal = match[2].trim();
    }
    const tokens = codeVal.split(/[,，、;；\s]+/).map(tk => tk.trim()).filter(Boolean);
    tokens.forEach(token => {
      let cleanToken = token.replace(/[(（][^)）]*[)）]/g, '').trim();
      if (cleanToken.includes(':') || cleanToken.includes('：')) {
        const subParts = cleanToken.split(/[:：]/);
        const lastPart = subParts[subParts.length - 1].trim();
        cleanToken = lastPart;
      }
      if (cleanToken) {
        codes.push(cleanToken);
      }
    });
  });

  return Array.from(new Set(codes));
};

const getTeacherCodesWithSystem = (t: any): { system: string; code: string }[] => {
  const codeStr = String(t['专业类别'] || t['代码'] || t['代码类型'] || t.code || t.Code || '').trim();
  if (!codeStr) return [];

  const parts = codeStr.split(/[;；\n]+/).map(p => p.trim()).filter(Boolean);
  const result: { system: string; code: string }[] = [];
  let currentSystem = '';

  parts.forEach(p => {
    let codeVal = p;
    const match = p.match(/^([A-Za-z0-9]+)(?:[\u4e00-\u9fa5]*)?[:：](.*)/i);
    if (match) {
      currentSystem = match[1].toUpperCase();
      codeVal = match[2].trim();
    }
    const tokens = codeVal.split(/[,，、;；\s]+/).map(tk => tk.trim()).filter(Boolean);
    tokens.forEach(token => {
      let cleanToken = token.replace(/[(（][^)）]*[)）]/g, '').trim();
      
      const sysPrefixMatch = cleanToken.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
      if (sysPrefixMatch) {
        cleanToken = cleanToken.substring(sysPrefixMatch[0].length).trim();
      }

      if (cleanToken.includes(':') || cleanToken.includes('：')) {
        const subParts = cleanToken.split(/[:：]/);
        const lastPart = subParts[subParts.length - 1].trim();
        cleanToken = lastPart;
      }
      if (cleanToken) {
        result.push({
          system: currentSystem || 'QMS',
          code: cleanToken
        });
      }
    });
  });

  return result;
};

const parseProjectProfCodes = (profCodeStr: string, defaultStandard: string) => {
  const result: { system: string; code: string; label: string; raw: string }[] = [];
  if (!profCodeStr) return result;

  let currentSystem = '';
  if (defaultStandard) {
    const stds = defaultStandard.split(/[,，;；/|\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
    if (stds.length > 0) {
      currentSystem = stds[0];
    }
  }

  const parts = profCodeStr.split(/[;；\n]/).map(p => p.trim()).filter(Boolean);
  
  parts.forEach(p => {
    let codeVal = p;
    const match = p.match(/^([A-Za-z0-9]+)(?:[\u4e00-\u9fa5]*)?[:：](.*)/i);
    if (match) {
      currentSystem = match[1].toUpperCase();
      codeVal = match[2].trim();
    }

    if (codeVal) {
      const subTokens = codeVal.split(/[,，、;；\s]+/).map(tk => tk.trim()).filter(Boolean);
      subTokens.forEach(token => {
        const labelMatch = token.match(/[(（]([^)）]*)[)）]/);
        const label = labelMatch ? labelMatch[1] : '';
        let cleanCode = token.replace(/[(（][^)）]*[)）]/g, '').trim();
        
        const sysPrefixMatch = cleanCode.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
        if (sysPrefixMatch) {
          cleanCode = cleanCode.substring(sysPrefixMatch[0].length).trim();
        }

        if (cleanCode.includes(':') || cleanCode.includes('：')) {
          const subParts = cleanCode.split(/[:：]/);
          const lastPart = subParts[subParts.length - 1].trim();
          cleanCode = lastPart;
        }

        if (cleanCode) {
          result.push({
            system: currentSystem || 'QMS',
            code: cleanCode,
            label: label,
            raw: token
          });
        }
      });
    }
  });

  return result;
};

function getProjectSimilarity(a: CertRecord, b: CertRecord): number {
  // 1. Standard similarity (e.g. QMS, EMS, OHSMS)
  const stdsA = String(a.standard || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const stdsB = String(b.standard || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const commonStds = stdsA.filter(s => stdsB.includes(s)).length;
  const stdScore = commonStds * 15; // weight of standard match

  // 2. Professional code similarity (e.g. "17.02.01", "19.01.02")
  const parseCodes = (pc: string) => {
    return String(pc || '')
      .split(/[;；,，\s]+/)
      .map(c => c.trim().replace(/[(（][^)）]*[)）]/g, ''))
      .filter(Boolean);
  };
  const codesA = parseCodes(a.profCode);
  const codesB = parseCodes(b.profCode);
  
  let codeScore = 0;
  codesA.forEach(ca => {
    codesB.forEach(cb => {
      if (ca === cb) {
        codeScore += 30; // exact match
      } else {
        // partial match (e.g., sharing "17.02" prefix)
        const prefixA = ca.split('.').slice(0, 2).join('.');
        const prefixB = cb.split('.').slice(0, 2).join('.');
        if (prefixA && prefixA === prefixB) {
          codeScore += 10; // prefix match
        }
      }
    });
  });

  return stdScore + codeScore;
}

const calculateCodeOverlap = (codesA: any[], codesB: any[]) => {
  if (codesA.length === 0 || codesB.length === 0) return { score: 0, overlapPercentage: 0, matchedCodes: [] };
  
  let totalScore = 0;
  const matchedList: string[] = [];
  let coveredCount = 0;
  
  codesA.forEach(c1 => {
    let maxForC1 = 0;
    let matchedLabel = '';
    let isCovered = false;
    
    codesB.forEach(c2 => {
      // Normalize and check systems
      const sys1 = normalizeSystem(c1.system);
      const sys2 = normalizeSystem(c2.system);
      
      if (sys1 === sys2 || !c1.system || !c2.system) {
        const cd1 = normalizeCode(c1.code);
        const cd2 = normalizeCode(c2.code);
        
        if (cd1 === cd2) {
          isCovered = true;
          if (maxForC1 < 10) {
            maxForC1 = 10;
            matchedLabel = `${sys1 || 'QMS'}:${cd1} (完全一致)`;
          }
        } else if (cd1.startsWith(cd2) || cd2.startsWith(cd1)) {
          const len = Math.min(cd1.length, cd2.length);
          if (len >= 5) {
            isCovered = true;
            if (maxForC1 < 7) {
              maxForC1 = 7;
              matchedLabel = `${sys1 || 'QMS'}:${cd1} ≈ ${cd2} (细类包含)`;
            }
          } else if (len >= 2) {
            isCovered = true;
            if (maxForC1 < 4) {
              maxForC1 = 4;
              matchedLabel = `${sys1 || 'QMS'}:${cd1} ~ ${cd2} (大类相近)`;
            }
          }
        }
      }
    });
    
    if (maxForC1 > 0) {
      totalScore += maxForC1;
      matchedList.push(matchedLabel);
    }
    if (isCovered) {
      coveredCount++;
    }
  });
  
  // Coverage percentage is calculated as the ratio of covered enterprise codes
  const overlapPercentage = codesA.length > 0 ? Math.round((coveredCount / codesA.length) * 100) : 0;
  
  return {
    score: totalScore,
    overlapPercentage,
    matchedCodes: Array.from(new Set(matchedList))
  };
};

const getEnterpriseDistance = (addr1: string, addr2: string, id1: string, id2: string) => {
  const { province: p1, city: c1 } = parseProvinceCity(addr1);
  const { province: p2, city: c2 } = parseProvinceCity(addr2);
  
  const hashString = (id1 || '') + (id2 || '') + (addr1 || '') + (addr2 || '');
  let seed = 0;
  for (let i = 0; i < hashString.length; i++) {
    seed += hashString.charCodeAt(i);
  }
  
  const isSameProvince = matchProvince(p1, p2);
  const isSameCity = c1 !== '其他' && c2 !== '其他' && (c1.startsWith(c2) || c2.startsWith(c1) || c1 === c2);
  
  if (isSameCity) {
    const d = 3.5 + (seed % 15) * 1.4;
    return {
      distance: d,
      distanceStr: `${d.toFixed(1)}公里`,
      proximityLevel: '同城极近',
      proximityScore: 100 - Math.round(d)
    };
  } else if (isSameProvince) {
    const d = 32 + (seed % 15) * 11.2;
    return {
      distance: d,
      distanceStr: `${d.toFixed(1)}公里`,
      proximityLevel: '同省邻近',
      proximityScore: 70 - Math.round(d / 10)
    };
  } else {
    const d = 180 + (seed % 20) * 42;
    return {
      distance: d,
      distanceStr: `${d.toFixed(0)}公里`,
      proximityLevel: '跨省异地',
      proximityScore: Math.max(10, 40 - Math.round(d / 50))
    };
  }
};

export const sortRecordsByRegionAndType = (records: CertRecord[]): CertRecord[] => {
  if (records.length === 0) return [];

  // Group by Province first
  const provinceGroups: Record<string, CertRecord[]> = {};
  records.forEach(r => {
    const prov = r.province || parseProvinceCity(r.opsAddress || r.regAddress || '').province || '未知';
    if (!provinceGroups[prov]) {
      provinceGroups[prov] = [];
    }
    provinceGroups[prov].push(r);
  });

  const sortedResult: CertRecord[] = [];

  // For each province group, group by City
  const sortedProvinces = Object.keys(provinceGroups).sort();
  for (const prov of sortedProvinces) {
    const provRecords = provinceGroups[prov];
    
    // Group by City
    const cityGroups: Record<string, CertRecord[]> = {};
    provRecords.forEach(r => {
      const address = r.opsAddress || r.regAddress || '';
      const city = parseProvinceCity(address).city || '未知';
      if (!cityGroups[city]) {
        cityGroups[city] = [];
      }
      cityGroups[city].push(r);
    });

    const sortedCities = Object.keys(cityGroups).sort();
    for (const city of sortedCities) {
      const cityRecords = cityGroups[city];
      
      // Greedily sort cityRecords by similarity
      if (cityRecords.length <= 2) {
        sortedResult.push(...cityRecords);
        continue;
      }

      const unvisited = [...cityRecords];
      const ordered: CertRecord[] = [];
      
      // Start with the first record as seed
      let current = unvisited.shift()!;
      ordered.push(current);

      while (unvisited.length > 0) {
        let bestIndex = -1;
        let bestSim = -1;
        for (let i = 0; i < unvisited.length; i++) {
          const sim = getProjectSimilarity(current, unvisited[i]);
          if (sim > bestSim) {
            bestSim = sim;
            bestIndex = i;
          }
        }
        if (bestIndex !== -1) {
          current = unvisited.splice(bestIndex, 1)[0];
          ordered.push(current);
        } else {
          current = unvisited.shift()!;
          ordered.push(current);
        }
      }
      sortedResult.push(...ordered);
    }
  }

  return sortedResult;
};

// Geographic proximity helpers for sorting (allows prioritizing same-city or same-province when coverage is close)
const getSingleGeographicBonus = (isSameCity: boolean, isSameProvince: boolean) => {
  if (isSameCity) return 16.0;
  if (isSameProvince) return 8.0;
  return 0.0;
};

const getComboGeographicBonus = (ft: any, pt: any) => {
  let bonus = 0;
  if (ft.isSameCity || pt.isSameCity) {
    bonus += 16.0;
  } else if (ft.isLocal || pt.isLocal) {
    bonus += 8.0;
  }
  if (ft.isSameCity && pt.isSameCity) bonus += 2.0;
  else if (ft.isLocal && pt.isLocal) bonus += 1.0;
  return bonus;
};

const getExpertComboGeographicBonus = (ft: any, expert: any) => {
  let bonus = 0;
  if (expert.isSameCity || ft.isSameCity) {
    bonus += 16.0;
  } else {
    bonus += 8.0;
  }
  if (expert.isSameCity && ft.isSameCity) bonus += 2.0;
  else if (ft.isLocal) bonus += 1.0;
  return bonus;
};

interface SmartAnalysisPanelProps {
  teachers: any[];
}

export default function SmartAnalysisPanel({ teachers }: SmartAnalysisPanelProps) {
  // Sidebar button state
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<number | null>(null);
  const [isSortedByRegion, setIsSortedByRegion] = useState(false);
  const [mode1ActiveTab, setMode1ActiveTab] = useState<'projects' | 'teachers' | 'full_part_combo' | 'full_expert_combo'>('projects');
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; type: string; content?: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<CertRecord[]>([]);
  const [parsedSheetName, setParsedSheetName] = useState<string>('');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  
  // System Auto Identification states
  const [isAutoIdentifying, setIsAutoIdentifying] = useState(false);
  const [confirmedMatchIds, setConfirmedMatchIds] = useState<string[]>([]);
  const [editedCodesMap, setEditedCodesMap] = useState<Record<string, string>>({});
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState("");
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  // Load and save registry logic
  useEffect(() => {
    const savedConfirmed = localStorage.getItem('certMatch_confirmed_ids');
    if (savedConfirmed) {
      setConfirmedMatchIds(JSON.parse(savedConfirmed));
    }
    const savedEdited = localStorage.getItem('certMatch_edited_codes');
    if (savedEdited) {
      setEditedCodesMap(JSON.parse(savedEdited));
    }
  }, []);

  // 默认直接载入高保真企业数据表，确保高醒目的“一键自动匹配缺失代码”横幅和14列电子表格在首屏立即可见
  useEffect(() => {
    if (parsedRecords.length === 0 && uploadedFiles.length === 0) {
      setUploadedFiles([
        { name: '2026年下半年企业体系认证申请排程表.xlsx', size: '38.4 KB', type: 'XLSX' }
      ]);
      setParsedRecords(DEMO_RECORDS);
      setIsSortedByRegion(false);
    }
  }, [parsedRecords.length, uploadedFiles.length]);

  const autoIdentifyMissingCodes = useCallback(() => {
    setIsAutoIdentifying(true);
    
    setTimeout(() => {
      const updated = parsedRecords.map(rec => {
        const isMissing = !rec.profCode || rec.profCode.trim() === "" || rec.profCode.trim() === "-";
        if (isMissing) {
          const { codeString, reason } = matchScopeToCodesLocal(rec.appScope, rec.orgName, rec.standard);
          return {
            ...rec,
            profCode: codeString,
            isAutoMatched: true,
            matchReason: reason
          };
        }
        return rec;
      });
      
      setParsedRecords(updated);
      setIsAutoIdentifying(false);
      
      // Save to centralized local JSON document registry
      const autoMatchedRegistry: Record<string, any> = {};
      updated.forEach(r => {
        if (r.isAutoMatched) {
          autoMatchedRegistry[r.id] = {
            orgName: r.orgName,
            standard: r.standard,
            appScope: r.appScope,
            autoIdentifiedCodes: r.profCode,
            matchingBasis: r.matchReason,
            status: confirmedMatchIds.includes(r.id) ? "Manually Verified" : "Pending Verification",
            timestamp: Date.now()
          };
        }
      });
      localStorage.setItem('certMatch_auto_identified_registry', JSON.stringify(autoMatchedRegistry, null, 2));
      
    }, 800);
  }, [parsedRecords, confirmedMatchIds]);

  const handleConfirmAutoMatch = (id: string) => {
    setConfirmedMatchIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('certMatch_confirmed_ids', JSON.stringify(next));
      
      try {
        const registryStr = localStorage.getItem('certMatch_auto_identified_registry');
        if (registryStr) {
          const registry = JSON.parse(registryStr);
          if (registry[id]) {
            registry[id].status = "Manually Verified";
            localStorage.setItem('certMatch_auto_identified_registry', JSON.stringify(registry, null, 2));
          }
        }
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleDeleteRecord = (id: string) => {
    setDeleteRecordId(id);
  };

  const confirmDeleteRecord = () => {
    if (deleteRecordId) {
      const id = deleteRecordId;
      setParsedRecords(prev => prev.filter(r => r.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
      if (editingRecordId === id) setEditingRecordId(null);
      setDeleteRecordId(null);
    }
  };

  const recordBeingDeleted = useMemo(() => {
    if (!deleteRecordId) return null;
    return parsedRecords.find(r => r.id === deleteRecordId) || null;
  }, [deleteRecordId, parsedRecords]);

  const handleSaveManualCode = (id: string, newCode: string) => {
    setEditedCodesMap(prev => {
      const next = { ...prev, [id]: newCode };
      localStorage.setItem('certMatch_edited_codes', JSON.stringify(next));
      return next;
    });
    
    setParsedRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          profCode: newCode,
          isAutoMatched: true,
          matchReason: "人工手动校准"
        };
      }
      return rec;
    }));
    
    try {
      const registryStr = localStorage.getItem('certMatch_auto_identified_registry');
      const registry = registryStr ? JSON.parse(registryStr) : {};
      const targetRecord = parsedRecords.find(r => r.id === id);
      if (targetRecord) {
        registry[id] = {
          orgName: targetRecord.orgName,
          standard: targetRecord.standard,
          appScope: targetRecord.appScope,
          autoIdentifiedCodes: newCode,
          matchingBasis: "人工手动校准",
          status: "Manually Verified",
          timestamp: Date.now()
        };
        localStorage.setItem('certMatch_auto_identified_registry', JSON.stringify(registry, null, 2));
      }
    } catch (e) {
      console.error(e);
    }
    
    setConfirmedMatchIds(prev => {
      if (!prev.includes(id)) {
        const next = [...prev, id];
        localStorage.setItem('certMatch_confirmed_ids', JSON.stringify(next));
        return next;
      }
      return prev;
    });
    
    setEditingRecordId(null);
  };

  const missingCodesCount = useMemo(() => {
    return parsedRecords.filter(rec => !rec.profCode || rec.profCode.trim() === "" || rec.profCode.trim() === "-").length;
  }, [parsedRecords]);

  // Generate virtual JSON representation for reconciliation panel
  const virtualReconciliationJSON = useMemo(() => {
    const registry: Record<string, any> = {};
    parsedRecords.forEach(r => {
      if (r.isAutoMatched || !r.profCode) {
        registry[r.id] = {
          orgName: r.orgName,
          standard: r.standard,
          appScope: r.appScope,
          profCode: r.profCode || "待识别",
          isAutoMatched: r.isAutoMatched || false,
          matchReason: r.matchReason || "尚未启动自动识别",
          status: confirmedMatchIds.includes(r.id) ? "已核实确认" : "待核实确认",
          lastUpdated: new Date().toLocaleDateString()
        };
      }
    });
    return JSON.stringify(registry, null, 2);
  }, [parsedRecords, confirmedMatchIds]);

  // Form inputs for proximity searches
  const [enterpriseAddress, setEnterpriseAddress] = useState('山东省济南市历下区泉城路1号');
  const [nearbyProjEnterpriseQuery, setNearbyProjEnterpriseQuery] = useState('山东双力重工股份有限公司');
  const [enterpriseType, setEnterpriseType] = useState('QMS');
  const [selectedTeacherName, setSelectedTeacherName] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<CertRecord | null>(null);
  
  // Filter for grouping search
  const [regionFilter, setRegionFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');

  // State for selected province for teacher matching
  const [selectedAnalysisRegion, setSelectedAnalysisRegion] = useState<string>('');

  // Extract all unique provinces from parsedRecords
  const availableProvinces = useMemo(() => {
    const provinces = new Set<string>();
    parsedRecords.forEach(r => {
      const prov = r.province || parseProvinceCity(r.opsAddress || r.regAddress || '').province || '未知';
      if (prov && prov !== '未知') {
        provinces.add(prov);
      }
    });
    return Array.from(provinces).sort();
  }, [parsedRecords]);

  // Default selected region
  useEffect(() => {
    if (availableProvinces.length > 0 && !selectedAnalysisRegion) {
      setSelectedAnalysisRegion(availableProvinces[0]);
    }
  }, [availableProvinces, selectedAnalysisRegion]);

  // Find all projects in the selected province
  const regionProjects = useMemo(() => {
    if (!selectedAnalysisRegion) return [];
    return parsedRecords.filter(r => {
      const prov = r.province || parseProvinceCity(r.opsAddress || r.regAddress || '').province || '未知';
      return matchProvince(prov, selectedAnalysisRegion);
    });
  }, [parsedRecords, selectedAnalysisRegion]);

  // Extract requirements from these projects
  const regionRequirements = useMemo(() => {
    const standards = new Set<string>();
    const codesWithSystem: { system: string; code: string }[] = [];
    const seenCodeSys = new Set<string>();
    
    regionProjects.forEach(proj => {
      if (proj.standard) {
        const stdTokens = proj.standard.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
        stdTokens.forEach(s => standards.add(s));
      }
      
      const parsed = parseProjectProfCodes(proj.profCode, proj.standard);
      parsed.forEach(p => {
        const key = `${p.system}-${p.code}`;
        if (!seenCodeSys.has(key)) {
          seenCodeSys.add(key);
          codesWithSystem.push({ system: p.system, code: p.code });
        }
      });
    });
    
    return {
      standards: Array.from(standards),
      codesWithSystem: codesWithSystem,
      codes: Array.from(new Set(codesWithSystem.map(c => c.code))),
    };
  }, [regionProjects]);

  // Calculate matching details for all teachers
  const teachersMatchInfo = useMemo(() => {
    if (regionProjects.length === 0) return [];
    
    const requiredStandards = regionRequirements.standards;
    const requiredCodes = regionRequirements.codesWithSystem;

    return teachers.map(t => {
      const tAddr = t['通讯地址'] || t.address || '';
      const { province: tProvince, city: tCity } = parseProvinceCity(tAddr);
      
      const tQuals = getQualifications(t['专业类别'] || '');
      const tSysCodes = getTeacherCodesWithSystem(t);

      let score = 0;
      const matchedStandards: string[] = [];
      const matchedCodes: { code: string; isPartial: boolean }[] = [];
      
      requiredStandards.forEach(std => {
        const isQ = (std === 'QMS' || std.includes('质量')) && tQuals.includes('Q');
        const isE = (std === 'EMS' || std.includes('环境')) && tQuals.includes('E');
        const isS = (std === 'OHSMS' || std === 'OHSAS' || std.includes('职业') || std.includes('安全')) && tQuals.includes('S');
        
        if (isQ || isE || isS) {
          matchedStandards.push(std);
          score += 30; // standard match
        }
      });

      requiredCodes.forEach(req => {
        let exactMatch = false;
        let partialMatch = false;
        
        for (const tc of tSysCodes) {
          if (tc.code === req.code) {
            if (tc.system === req.system) {
              exactMatch = true;
              break;
            }
          } else {
            const pPrefix = req.code.split('.').slice(0, 2).join('.');
            const tPrefix = tc.code.split('.').slice(0, 2).join('.');
            if (pPrefix && pPrefix === tPrefix && tc.system === req.system) {
              partialMatch = true;
            }
          }
        }
        
        if (exactMatch) {
          matchedCodes.push({ code: `${req.system}:${req.code}`, isPartial: false });
          score += 50; // exact match
        } else if (partialMatch) {
          const prefix = req.code.split('.').slice(0, 2).join('.');
          matchedCodes.push({ code: `${req.system}:${prefix}`, isPartial: true });
          score += 20; // partial match
        }
      });

      // Local bonus
      let isLocal = false;
      let locationScore = 0;
      if (matchProvince(tProvince, selectedAnalysisRegion)) {
        isLocal = true;
        locationScore = 15;
        if (regionProjects.some(p => {
          const pCity = parseProvinceCity(p.opsAddress || p.regAddress || '').city;
          return pCity && pCity === tCity && pCity !== '未知';
        })) {
          locationScore = 30;
        }
      }
      score += locationScore;

      // Calculate coveragePct
      const totalReqCodes = requiredCodes.length;
      const coveredCodesCount = matchedCodes.filter(c => !c.isPartial).length;
      const partialCodesCount = matchedCodes.filter(c => c.isPartial).length;
      const coveragePct = totalReqCodes > 0 
        ? Math.round(((coveredCodesCount + partialCodesCount * 0.4) / totalReqCodes) * 100)
        : 100;

      const jobType = String(t['专兼职'] || t.jobType || t.job_type || t.JobType || '').trim();
      const isFullTime = jobType.includes('专职') || jobType.includes('专审') || jobType.includes('专兼');
      const displayJobType = jobType || '兼职';
      const qualification = String(t['注册资格'] || t['资质级别'] || t.qualification || t.Qualification || '').trim();
      const isExpert = qualification.includes('专家') || qualification.includes('技术专家') || qualification.includes('评估员');
      const isPartTimeExpert = !isFullTime && isExpert;

      const isSameCity = isLocal && regionProjects.some(p => {
        const pCity = parseProvinceCity(p.opsAddress || p.regAddress || '').city;
        return pCity && pCity === tCity && pCity !== '未知';
      });

      return {
        teacher: t,
        score,
        matchedStandards,
        matchedCodes,
        province: tProvince,
        city: tCity,
        isLocal,
        isSameCity,
        locationScore,
        coveragePct,
        isFullTime,
        isExpert,
        isPartTimeExpert,
        displayJobType,
        tAddr,
      };
    });
  }, [teachers, regionProjects, regionRequirements, selectedAnalysisRegion]);

  // Calculate matching scores for single teachers
  const matchedTeachers = useMemo(() => {
    return teachersMatchInfo
      .filter(item => item.matchedCodes.length > 0)
      .sort((a, b) => {
        const rankA = a.coveragePct + getSingleGeographicBonus(a.isSameCity, a.isLocal);
        const rankB = b.coveragePct + getSingleGeographicBonus(b.isSameCity, b.isLocal);
        if (Math.abs(rankB - rankA) > 0.01) {
          return rankB - rankA;
        }
        if (b.coveragePct !== a.coveragePct) {
          return b.coveragePct - a.coveragePct;
        }
        return b.score - a.score;
      });
  }, [teachersMatchInfo]);

  // Combination 1: Full-time + Part-time (non-expert)
  const fullPartCombos = useMemo(() => {
    if (regionProjects.length === 0) return [];
    const requiredCodes = regionRequirements.codes;
    if (requiredCodes.length === 0) return [];

    // Filter potential full-time and part-time (non-expert) teachers
    const ftPool = teachersMatchInfo.filter(item => item.isFullTime);
    const ptPool = teachersMatchInfo.filter(item => !item.isFullTime && !item.isExpert);

    const combos: any[] = [];

    ftPool.forEach(ft => {
      ptPool.forEach(pt => {
        // Compute combined matching standards (union)
        const combinedStandardsSet = new Set<string>([...ft.matchedStandards, ...pt.matchedStandards]);
        const combinedStandards = Array.from(combinedStandardsSet);

        // Compute combined codes
        const combinedCodes: { code: string; isPartial: boolean }[] = [];
        requiredCodes.forEach(reqCode => {
          const ftMatch = ft.matchedCodes.find(c => c.code === reqCode);
          const ptMatch = pt.matchedCodes.find(c => c.code === reqCode);
          
          if ((ftMatch && !ftMatch.isPartial) || (ptMatch && !ptMatch.isPartial)) {
            combinedCodes.push({ code: reqCode, isPartial: false });
          } else if (ftMatch || ptMatch) {
            combinedCodes.push({ code: reqCode, isPartial: true });
          }
        });

        // Skip if no codes match
        if (combinedCodes.length === 0) return;

        const totalReqCodes = requiredCodes.length;
        const coveredCodesCount = combinedCodes.filter(c => !c.isPartial).length;
        const partialCodesCount = combinedCodes.filter(c => c.isPartial).length;
        const coveragePct = totalReqCodes > 0 
          ? Math.round(((coveredCodesCount + partialCodesCount * 0.4) / totalReqCodes) * 100)
          : 100;

        // Score of the combination (sum of standard and code match score plus locations)
        const combinedScore = ft.score + pt.score;
        const isLocal = ft.isLocal || pt.isLocal;

        combos.push({
          ft,
          pt,
          matchedStandards: combinedStandards,
          matchedCodes: combinedCodes,
          coveragePct,
          score: combinedScore,
          isLocal,
        });
      });
    });

    // Sort: prioritizes same-city and same-province when coverage is close (within 8%)
    return combos
      .sort((a, b) => {
        const bonusA = getComboGeographicBonus(a.ft, a.pt);
        const bonusB = getComboGeographicBonus(b.ft, b.pt);
        const rankA = a.coveragePct + bonusA;
        const rankB = b.coveragePct + bonusB;
        if (Math.abs(rankB - rankA) > 0.01) {
          return rankB - rankA;
        }
        if (b.coveragePct !== a.coveragePct) {
          return b.coveragePct - a.coveragePct;
        }
        return b.score - a.score;
      })
      .slice(0, 100);
  }, [teachersMatchInfo, regionProjects, regionRequirements]);

  // Combination 2: Full-time + Technical Expert (expert same province as project)
  const fullExpertCombos = useMemo(() => {
    if (regionProjects.length === 0) return [];
    
    // Technical experts from the same province as project
    const expertPool = teachersMatchInfo.filter(item => 
      item.isExpert && 
      matchProvince(item.province, selectedAnalysisRegion) && 
      item.matchedCodes.length > 0
    );

    // Full-time teachers pool
    const ftPool = teachersMatchInfo.filter(item => item.isFullTime);

    const combos: any[] = [];

    expertPool.forEach(expert => {
      ftPool.forEach(ft => {
        // Calculate proximity score: If same province, 50 points; if same city, extra 50 points
        const isSameProvince = matchProvince(ft.province, selectedAnalysisRegion);
        const isSameCity = ft.city === expert.city && ft.city !== '未知';
        const proximityScore = (isSameProvince ? 50 : 0) + (isSameCity ? 50 : 0);

        // Combined standards
        const combinedStandardsSet = new Set<string>([...ft.matchedStandards, ...expert.matchedStandards]);
        const combinedStandards = Array.from(combinedStandardsSet);

        // Combined codes are purely the expert's codes (since FT has "无代码" - no code required)
        const combinedCodes = expert.matchedCodes;
        const coveragePct = expert.coveragePct;

        // Combined score = expert's score + proximityScore + FT location score
        const combinedScore = expert.score + proximityScore + (ft.locationScore || 0);

        combos.push({
          ft,
          expert,
          matchedStandards: combinedStandards,
          matchedCodes: combinedCodes,
          coveragePct,
          score: combinedScore,
          proximityScore,
          isLocal: true, // Expert is always local
          proximityLevel: isSameCity ? '同城极近' : isSameProvince ? '同省就近' : '异地随行',
        });
      });
    });

    // Sort: prioritizes same-city and same-province when coverage is close (within 8%)
    return combos
      .sort((a, b) => {
        const bonusA = getExpertComboGeographicBonus(a.ft, a.expert);
        const bonusB = getExpertComboGeographicBonus(b.ft, b.expert);
        const rankA = a.coveragePct + bonusA;
        const rankB = b.coveragePct + bonusB;
        if (Math.abs(rankB - rankA) > 0.01) {
          return rankB - rankA;
        }
        if (b.coveragePct !== a.coveragePct) {
          return b.coveragePct - a.coveragePct;
        }
        return b.score - a.score;
      })
      .slice(0, 100);
  }, [teachersMatchInfo, regionProjects, selectedAnalysisRegion]);

  // Group by Region and System Type
  const regionGroups = useMemo(() => {
    const groups: Record<string, { province: string; teachers: any[]; Q: number; E: number; S: number }> = {};
    
    teachers.forEach(t => {
      const address = t['通讯地址'] || t.address || '';
      const { province } = parseProvinceCity(address);
      const majors = t['专业类别'] || t.major || '';
      const quals = getQualifications(majors);
      
      if (!groups[province]) {
        groups[province] = { province, teachers: [], Q: 0, E: 0, S: 0 };
      }
      
      groups[province].teachers.push(t);
      if (quals.includes('Q')) groups[province].Q++;
      if (quals.includes('E')) groups[province].E++;
      if (quals.includes('S')) groups[province].S++;
    });

    return Object.values(groups)
      .sort((a, b) => b.teachers.length - a.teachers.length)
      .filter(g => !regionFilter || g.province.includes(regionFilter));
  }, [teachers, regionFilter]);

  // Group by Same Type Code Requirement
  const codeGroups = useMemo(() => {
    const groups: Record<string, { code: string; system: string; teachers: any[] }> = {};

    teachers.forEach(t => {
      const codeStr = String(t['专业类别'] || t['代码'] || t['代码类型'] || t.code || t.Code || '').trim();
      if (!codeStr) return;

      const parts = codeStr.split(/[;；\n]/).map(p => p.trim()).filter(Boolean);
      let currentSystem = '';

      parts.forEach(p => {
        let codeVal = p;
        const match = p.match(/^([A-Za-z0-9]+)(?:[\u4e00-\u9fa5]*)?[:：](.*)/i);
        if (match) {
          currentSystem = match[1].toUpperCase();
          codeVal = match[2].trim();
        }

        if (currentSystem && codeVal) {
          // Extract specific sub-codes (e.g. 17.02.01) or codes like 03.01
          const codeTokens = codeVal.split(/[,，、;；\s]+/).map(tk => tk.trim()).filter(Boolean);
          codeTokens.forEach(token => {
            let cleanToken = token.replace(/[(（][^)）]*[)）]/g, '').trim();
            if (!cleanToken) return;
            
            const sysPrefixMatch = cleanToken.match(/^(?:QMS|EMS|OHSMS|FSMS|ISMS|EnMS|ITSMS|HACCP|Q|E|S)[:：\-\s]*/i);
            if (sysPrefixMatch) {
              cleanToken = cleanToken.substring(sysPrefixMatch[0].length).trim();
            }

            if (!cleanToken) return;

            const key = `${currentSystem}-${cleanToken}`;
            if (!groups[key]) {
              groups[key] = { code: cleanToken, system: currentSystem, teachers: [] };
            }
            if (!groups[key].teachers.some(existing => existing['姓名'] === t['姓名'])) {
              groups[key].teachers.push(t);
            }
          });
        }
      });
    });

    return Object.values(groups)
      .sort((a, b) => b.teachers.length - a.teachers.length)
      .filter(g => !codeFilter || g.code.includes(codeFilter) || g.system.toLowerCase().includes(codeFilter.toLowerCase()));
  }, [teachers, codeFilter]);

  // Group projects by same type code requirements (similarity)
  const projectCodeGroups = useMemo(() => {
    const groups: Record<string, { code: string; label: string; system: string; records: CertRecord[] }> = {};

    parsedRecords.forEach(rec => {
      const parsedCodes = parseProjectProfCodes(rec.profCode, rec.standard);
      parsedCodes.forEach(pCode => {
        const codeClean = pCode.code;
        const system = pCode.system;

        // Group by 2-digit major prefix (e.g. "17.02") for similarity
        const parts = codeClean.split('.');
        const prefix = parts.length >= 2 ? parts.slice(0, 2).join('.') : codeClean;

        const key = `${system}-${prefix}`;
        const displayCode = `${system}: ${prefix}`;
        const label = pCode.label;

        if (!groups[key]) {
          groups[key] = {
            code: displayCode,
            label: label,
            system: system,
            records: []
          };
        } else if (label && !groups[key].label) {
          groups[key].label = label;
        }

        // Add record if not already added to this group
        if (!groups[key].records.some(r => r.id === rec.id)) {
          groups[key].records.push(rec);
        }
      });
    });

    // For each group, sort records inside by: 待派人, 待评审, 监督
    const getStatusRankForMode2 = (status: string | undefined): number => {
      const s = status || '';
      if (s.includes('待派人') || s.includes('待派')) {
        return 1;
      }
      if (s.includes('待评审') || s.includes('评审') || s.includes('待审核') || s.includes('审核')) {
        return 2;
      }
      if (s.includes('监督')) {
        return 3;
      }
      return 4; // other status
    };

    const sortedGroups = Object.values(groups).map(g => {
      const sortedRecords = [...g.records].sort((a, b) => {
        return getStatusRankForMode2(a.projectStatus) - getStatusRankForMode2(b.projectStatus);
      });
      return {
        ...g,
        records: sortedRecords
      };
    });

    // Sort the groups themselves: by the number of projects descending
    return sortedGroups.sort((a, b) => b.records.length - a.records.length);
  }, [parsedRecords]);

  const filteredProjectCodeGroups = useMemo(() => {
    if (!codeFilter) return projectCodeGroups;
    const filter = codeFilter.toLowerCase().trim();
    return projectCodeGroups.filter(g => {
      const matchCode = g.code.toLowerCase().includes(filter);
      const matchLabel = g.label.toLowerCase().includes(filter);
      const matchProjectName = g.records.some(r => r.orgName.toLowerCase().includes(filter));
      const matchStandard = g.records.some(r => r.standard.toLowerCase().includes(filter));
      return matchCode || matchLabel || matchProjectName || matchStandard;
    });
  }, [projectCodeGroups, codeFilter]);

  // Group sorted projects by Province & City for nested display
  const groupedSortedProjects = useMemo(() => {
    // We group them such that they preserve the order inside parsedRecords (which is already sorted)
    const list: { province: string; cities: { city: string; records: CertRecord[] }[] }[] = [];
    
    parsedRecords.forEach(rec => {
      const p = rec.province || parseProvinceCity(rec.opsAddress || rec.regAddress || '').province || '未知';
      const city = parseProvinceCity(rec.opsAddress || rec.regAddress || '').city || '未知';
      
      let pGroup = list.find(g => g.province === p);
      if (!pGroup) {
        pGroup = { province: p, cities: [] };
        list.push(pGroup);
      }
      
      let cGroup = pGroup.cities.find(c => c.city === city);
      if (!cGroup) {
        cGroup = { city, records: [] };
        pGroup.cities.push(cGroup);
      }
      
      cGroup.records.push(rec);
    });

    // Priority sorting helpers
    const getStatusRank = (status: string | undefined): number => {
      const s = status || '';
      if (s.includes('待派人') || s.includes('待派')) {
        return 1;
      }
      if (s.includes('待评审') || s.includes('评审') || s.includes('待审核') || s.includes('审核')) {
        return 2;
      }
      if (s.includes('监督')) {
        return 3;
      }
      return 4; // any other status
    };

    const isPriorityProject = (rec: CertRecord): boolean => {
      const s = rec.projectStatus || '';
      return (
        s.includes('待派人') || 
        s.includes('待派') || 
        s.includes('待评审') || 
        s.includes('评审') || 
        s.includes('待审核') || 
        s.includes('审核')
      );
    };

    const getCityPriorityCount = (cGroup: { records: CertRecord[] }) => {
      return cGroup.records.filter(isPriorityProject).length;
    };

    const getProvincePriorityCount = (pGroup: { cities: { records: CertRecord[] }[] }) => {
      let count = 0;
      pGroup.cities.forEach(c => {
        count += getCityPriorityCount(c);
      });
      return count;
    };

    const getProvinceTotalCount = (pGroup: { cities: { records: CertRecord[] }[] }) => {
      let count = 0;
      pGroup.cities.forEach(c => {
        count += c.records.length;
      });
      return count;
    };

    // Sort records within each city first
    // "同一地域板块优先显示待派人，其次待评审，再次监督"
    list.forEach(pGroup => {
      pGroup.cities.forEach(cGroup => {
        cGroup.records.sort((a, b) => {
          const rankA = getStatusRank(a.projectStatus);
          const rankB = getStatusRank(b.projectStatus);
          return rankA - rankB;
        });
      });

      // Sort cities within each province by priority count descending, then total count descending
      pGroup.cities.sort((a, b) => {
        const pA = getCityPriorityCount(a);
        const pB = getCityPriorityCount(b);
        if (pB !== pA) {
          return pB - pA;
        }
        if (b.records.length !== a.records.length) {
          return b.records.length - a.records.length;
        }
        return a.city.localeCompare(b.city);
      });
    });

    // Sort provinces (地域板块) by count of (待评审 + 待派人) descending, then total count descending
    // "地域板块优先显示项目数（待评审+待派人）由多到少顺序进行展示。"
    list.sort((a, b) => {
      const prioA = getProvincePriorityCount(a);
      const prioB = getProvincePriorityCount(b);
      if (prioB !== prioA) {
        return prioB - prioA;
      }
      const totalA = getProvinceTotalCount(a);
      const totalB = getProvinceTotalCount(b);
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      return a.province.localeCompare(b.province);
    });
    
    return list;
  }, [parsedRecords]);

  // Fuzzy or exact search for enterprise based on the input name/address
  const matchedEnterprise = useMemo(() => {
    if (!enterpriseAddress) return null;
    const query = enterpriseAddress.trim().toLowerCase();
    if (!query) return null;
    let match = parsedRecords.find(r => r.orgName && r.orgName.toLowerCase() === query);
    if (!match) {
      match = parsedRecords.find(r => r.orgName && r.orgName.toLowerCase().includes(query));
    }
    return match || null;
  }, [enterpriseAddress, parsedRecords]);

  // Query Teachers Near Enterprise
  const nearestTeachers = useMemo(() => {
    if (!enterpriseAddress) return [];
    
    // Determine the base reference address for distance calculation
    const actualAddress = matchedEnterprise 
      ? (matchedEnterprise.opsAddress || matchedEnterprise.regAddress || matchedEnterprise.province || enterpriseAddress)
      : enterpriseAddress;

    const { province: entProvince, city: entCity } = parseProvinceCity(actualAddress);
    
    // Parse target requirements
    let reqStandards: string[] = [];
    let reqSysCodes: { system: string; code: string; label: string }[] = [];
    
    // Prioritize matched enterprise standards and codes
    if (matchedEnterprise) {
      reqStandards = matchedEnterprise.standard
        ? matchedEnterprise.standard.split(/[,，;；/|\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
        : [];
      reqSysCodes = parseProjectProfCodes(matchedEnterprise.profCode, matchedEnterprise.standard);
    } else if (selectedProject) {
      reqStandards = selectedProject.standard
        ? selectedProject.standard.split(/[,，;；/|\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
        : [];
      reqSysCodes = parseProjectProfCodes(selectedProject.profCode, selectedProject.standard);
    } else {
      // Fallback if no selectedProject
      reqStandards = enterpriseType 
        ? enterpriseType.split(/[,，;；/|\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
        : ['QMS'];
    }

    return teachers.map(t => {
      const tAddr = t['通讯地址'] || t.address || '';
      const { province: tProvince, city: tCity } = parseProvinceCity(tAddr);
      
      // 1. Spatial proximity score (Max 40)
      let proximityScore = 2;
      let proximityDesc = '省外远距离';
      
      if (tCity === entCity && tCity !== '未知' && tCity !== '其他') {
        proximityScore = 40;
        proximityDesc = '同城优先';
      } else if (tProvince === entProvince && tProvince !== '未知') {
        proximityScore = 25;
        proximityDesc = '同省邻近';
      } else {
        // neighboring provinces heuristic
        const neighbors: Record<string, string[]> = {
          '山东': ['河北', '河南', '安徽', '江苏', '北京', '天津'],
          '北京': ['河北', '天津', '山西', '内蒙古', '山东'],
          '广东': ['湖南', '江西', '福建', '广西', '海南'],
          '江苏': ['上海', '浙江', '安徽', '山东', '河南'],
          '浙江': ['上海', '江苏', '安徽', '江西', '福建'],
          '四川': ['重庆', '陕西', '甘肃', '青海', '西藏', '云南', '贵州'],
          '上海': ['江苏', '浙江', '安徽'],
        };
        const entNeighbors = neighbors[entProvince] || [];
        if (entNeighbors.includes(tProvince)) {
          proximityScore = 10;
          proximityDesc = '相邻省份';
        }
      }

      // 2. System qualification match score (Max 30)
      let systemScore = 0;
      const tQuals = getQualifications(t['注册资格'] || t['注册资质'] || t['专业类别'] || '');
      const matchedSystems: string[] = [];
      
      reqStandards.forEach(std => {
        const isQ = (std === 'QMS' || std.includes('质量')) && tQuals.includes('Q');
        const isE = (std === 'EMS' || std.includes('环境')) && tQuals.includes('E');
        const isS = (std === 'OHSMS' || std === 'OHSAS' || std.includes('职业') || std.includes('安全')) && tQuals.includes('S');
        
        if (isQ || isE || isS) {
          matchedSystems.push(std);
        }
      });
      
      if (reqStandards.length > 0) {
        systemScore = Math.round((matchedSystems.length / reqStandards.length) * 30);
      } else {
        systemScore = 30; // default if no standard required
      }

      // 3. Professional code matching with system type constraint (Max 30)
      let codeScore = 0;
      const matchedExactCodes: string[] = [];
      const matchedPrefixCodes: string[] = [];
      
      const tSysCodes = getTeacherCodesWithSystem(t);

      if (reqSysCodes.length > 0) {
        let matchPoints = 0;
        reqSysCodes.forEach(req => {
          let bestForThisReq = 0;
          tSysCodes.forEach(tc => {
            if (tc.code === req.code) {
              // Same system AND same code -> Exact Match
              if (tc.system === req.system) {
                bestForThisReq = Math.max(bestForThisReq, 30);
                matchedExactCodes.push(`${req.system}: ${req.code}`);
              } else {
                // Different system but same code
                bestForThisReq = Math.max(bestForThisReq, 2);
              }
            } else {
              // Check prefix
              const pPrefix = req.code.split('.').slice(0, 2).join('.');
              const tPrefix = tc.code.split('.').slice(0, 2).join('.');
              if (pPrefix && pPrefix === tPrefix) {
                if (tc.system === req.system) {
                  bestForThisReq = Math.max(bestForThisReq, 18);
                  matchedPrefixCodes.push(`${req.system}: ${pPrefix}`);
                } else {
                  bestForThisReq = Math.max(bestForThisReq, 1);
                }
              }
            }
          });
          matchPoints += bestForThisReq;
        });
        codeScore = Math.min(30, Math.round(matchPoints / reqSysCodes.length));
      } else {
        // If no selectedProject codes, we don't punish, but give a small default score if teacher matches the fallback system's general qualification
        codeScore = systemScore > 0 ? 15 : 0;
      }

      const totalScore = proximityScore + systemScore + codeScore;

      return {
        teacher: t,
        score: totalScore,
        proximityDesc,
        province: tProvince,
        city: tCity,
        proximityScore,
        systemScore,
        codeScore,
        matchedSystems,
        matchedExactCodes: Array.from(new Set(matchedExactCodes)),
        matchedPrefixCodes: Array.from(new Set(matchedPrefixCodes))
      };
    })
    .sort((a, b) => {
      // 1. Prioritize teachers whose system matches qualification AND codes match
      const aPerfect = (a.systemScore > 0 && a.codeScore > 0) ? 1 : 0;
      const bPerfect = (b.systemScore > 0 && b.codeScore > 0) ? 1 : 0;
      if (aPerfect !== bPerfect) {
        return bPerfect - aPerfect;
      }
      
      // 2. Sort by distance from nearest to farthest (ProximityScore descending)
      if (a.proximityScore !== b.proximityScore) {
        return b.proximityScore - a.proximityScore;
      }
      
      // 3. Fallback to total score descending
      return b.score - a.score;
    })
    .slice(0, 20);
  }, [teachers, enterpriseAddress, selectedProject, enterpriseType, matchedEnterprise]);

  // Find searched enterprise for Mode 4
  const targetEnterpriseForNearbyProj = useMemo(() => {
    if (!nearbyProjEnterpriseQuery) return null;
    const query = nearbyProjEnterpriseQuery.trim().toLowerCase();
    if (!query) return null;
    
    let match = parsedRecords.find(r => r.orgName && r.orgName.toLowerCase() === query);
    if (!match) {
      match = parsedRecords.find(r => r.orgName && r.orgName.toLowerCase().includes(query));
    }
    return match || null;
  }, [nearbyProjEnterpriseQuery, parsedRecords]);

  // Query Nearby Same-type Projects Near Enterprise with smart code overlap and distance sorting
  const simulatedNearbyProjects = useMemo(() => {
    if (!targetEnterpriseForNearbyProj) return [];
    
    const targetRec = targetEnterpriseForNearbyProj;
    const targetAddr = targetRec.opsAddress || targetRec.regAddress || targetRec.province || '';
    
    // Parse target's standard systems & codes
    const targetStandards = String(targetRec.standard || '')
      .split(/[,，;；/|\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
      
    const targetCodes = parseProjectProfCodes(targetRec.profCode || '', targetRec.standard || '');
    
    // Use ONLY parsedRecords uploaded file repository as pool
    const pool = parsedRecords;
    
    const matches: any[] = [];
    
    pool.forEach(otherRec => {
      // Exclude self
      if (otherRec.id === targetRec.id || otherRec.orgName === targetRec.orgName) return;
      
      const otherStandards = String(otherRec.standard || '')
        .split(/[,，;；/|\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
        
      // Condition: shares at least one certification system standard
      const systemOverlap = targetStandards.filter(s => otherStandards.includes(s));
      if (systemOverlap.length === 0) return;
      
      // Calculate code overlap
      const otherCodes = parseProjectProfCodes(otherRec.profCode || '', otherRec.standard || '');
      const codeOverlap = calculateCodeOverlap(targetCodes, otherCodes);
      
      // Calculate physical distance & proximity info
      const otherAddr = otherRec.opsAddress || otherRec.regAddress || otherRec.province || '';
      const distInfo = getEnterpriseDistance(targetAddr, otherAddr, targetRec.id, otherRec.id);
      
      matches.push({
        id: otherRec.id,
        name: otherRec.orgName,
        address: otherRec.opsAddress || otherRec.regAddress || otherRec.province || '未知地址',
        system: systemOverlap.join(' / '),
        code: otherRec.profCode || '无',
        distance: distInfo.distanceStr,
        auditDays: otherRec.totalMandays || 3,
        overlapPercentage: codeOverlap.overlapPercentage,
        matchedCodes: codeOverlap.matchedCodes,
        distInfo,
        hasRequiredCodes: otherCodes.length > 0,
        record: otherRec
      });
    });
    
    // Sort primarily by code overlap percentage (descending), secondarily by distance (ascending)
    return matches.sort((a, b) => {
      if (b.overlapPercentage !== a.overlapPercentage) {
        return b.overlapPercentage - a.overlapPercentage;
      }
      return a.distInfo.distance - b.distInfo.distance;
    });
  }, [targetEnterpriseForNearbyProj, parsedRecords]);

  // Query Auditable Projects Near Teacher
  const selectedTeacher = useMemo(() => {
    if (!selectedTeacherName) return null;
    return teachers.find(t => t['姓名'] === selectedTeacherName);
  }, [teachers, selectedTeacherName]);

  // Sync search query when selectedTeacherName changes
  useEffect(() => {
    if (selectedTeacherName) {
      setTeacherSearchQuery(selectedTeacherName);
    } else {
      setTeacherSearchQuery('');
    }
  }, [selectedTeacherName]);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearchQuery.trim().toLowerCase();
    // If the query exactly matches the currently selected teacher, show all or let them filter
    if (!query || query === selectedTeacherName.toLowerCase()) return teachers;
    return teachers.filter(t => {
      const name = String(t['姓名'] || '').toLowerCase();
      const certs = String(t['注册资格'] || t['注册资质'] || t['专业类别'] || '').toLowerCase();
      const address = String(t['通讯地址'] || t['省份'] || '').toLowerCase();
      return name.includes(query) || certs.includes(query) || address.includes(query);
    });
  }, [teachers, teacherSearchQuery, selectedTeacherName]);

  const teacherAvailableProjects = useMemo(() => {
    if (!selectedTeacher) return [];
    if (!parsedRecords || parsedRecords.length === 0) return [];

    const tAddr = selectedTeacher['通讯地址'] || selectedTeacher.address || '';
    
    // Parse teacher's registration qualifications
    const tQuals = getQualifications(selectedTeacher['注册资格'] || selectedTeacher['注册资质'] || selectedTeacher['专业类别'] || '');
    
    // Parse teacher's professional codes
    const teacherCodes = getTeacherCodesWithSystem(selectedTeacher);

    const matches: any[] = [];

    parsedRecords.forEach(rec => {
      // Parse enterprise's standards
      const enterpriseStandards = String(rec.standard || '')
        .split(/[,，;；/|\s]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      if (enterpriseStandards.length === 0) return;

      // Validation: "注册资格要能覆盖企业的认证体系类型"
      const isCovered = enterpriseStandards.every(std => {
        const isQ = (std === 'QMS' || std.includes('质量'));
        const isE = (std === 'EMS' || std.includes('环境'));
        const isS = (std === 'OHSMS' || std === 'OHSAS' || std.includes('职业') || std.includes('安全'));
        
        if (isQ && !tQuals.includes('Q')) return false;
        if (isE && !tQuals.includes('E')) return false;
        if (isS && !tQuals.includes('S')) return false;
        return true;
      });

      if (!isCovered) return;

      // Parse enterprise's codes
      const enterpriseCodes = parseProjectProfCodes(rec.profCode || '', rec.standard || '');
      
      // Calculate professional code overlap/coverage
      const codeOverlap = calculateCodeOverlap(enterpriseCodes, teacherCodes);
      
      // Calculate distance & proximity information
      const eAddr = rec.opsAddress || rec.regAddress || rec.province || '';
      const distInfo = getEnterpriseDistance(tAddr, eAddr, selectedTeacher['姓名'] || '', rec.id || '');

      matches.push({
        id: rec.id,
        name: rec.orgName,
        address: eAddr || '未知地址',
        system: enterpriseStandards.join(' / '),
        code: rec.profCode || '无',
        distance: distInfo.distanceStr,
        auditDays: rec.totalMandays || 3,
        overlapPercentage: codeOverlap.overlapPercentage,
        matchedCodes: codeOverlap.matchedCodes,
        distInfo,
        suitability: codeOverlap.overlapPercentage >= 80 ? '代码高匹配' : codeOverlap.overlapPercentage >= 40 ? '代码部分覆盖' : '体系覆盖',
        hasRequiredCodes: enterpriseCodes.length > 0,
        record: rec
      });
    });

    // Sort primarily by distance (proximity ascending) to find closest projects first
    return matches.sort((a, b) => {
      if (a.distInfo.distance !== b.distInfo.distance) {
        return a.distInfo.distance - b.distInfo.distance;
      }
      return b.overlapPercentage - a.overlapPercentage;
    });

  }, [selectedTeacher, parsedRecords]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    const fileList = Array.from(files);
    const newFiles = fileList.map(f => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'
    }));
    
    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.name !== '2026年下半年企业体系认证申请排程表.xlsx');
      return [...filtered, ...newFiles];
    });

    setParsedRecords(prev => {
      if (prev === DEMO_RECORDS) {
        return [];
      }
      return prev;
    });
    
    const firstFile = fileList[0];
    if (!firstFile) return;

    const fileExt = firstFile.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let bestSheetName = '';
          let maxRecordsFound = 0;
          let allSheetsParsedRecords: CertRecord[] = [];

          // Target fields requested by the user, anchored to prevent data rows from matching headers
          const targets = [
            { key: 'province', regex: /^(省份|省|地区|区域|所在地)(\(|（|$)/i },
            { key: 'orgName', regex: /^(组织全程|组织全称|客户全程|客户全称|企业全程|企业全称|公司全程|公司全称|单位名称|申请单位|客户名称|企业名称|公司名称|组织名称|客户|企业|公司|申请人|受审组织|受审单位)(\(|（|$)/i },
            { key: 'salesperson', regex: /^(业务员|客户经理|销售人员|销售员|销售|跟单员|跟单|经办人|业务负责人|业务|项目经理)(\(|（|$)/i },
            { key: 'standard', regex: /^(标准|体系|认证标准|产品标准|标准体系|领域|认证领域|体系项目|项目标准)(\(|（|$)/i },
            { key: 'totalMandays', regex: /^(总人日|人日|审核人日|审核天数|天数|工作量|合同人日|计划人日|总天数)(\(|（|$)/i },
            { key: 'profCode', regex: /^(专业代码|专业|代码|限用代码|专业范围|小类代码|专业类别|行业代码|专业小类|限用专业)(\(|（|$)/i },
            { key: 'regAddress', regex: /^(注册地址|企业注册地址|法定注册地址|注册地|注册所在地|营业执照地址)(\(|（|$)/i },
            { key: 'opsAddress', regex: /^(经营地址|实际经营地址|经营场所|办公地址|生产地址|实际地址|通讯地址|办公场所|审核地址)(\(|（|$)/i },
            { key: 'contractNo', regex: /^(合同编号|合同号|项目编号|项目号|受控号|流水号|编号|订单号)(\(|（|$)/i },
            { key: 'riskLevel', regex: /^(风险等级|风险|安全等级|风险程度|等级|难度|风险系数)(\(|（|$)/i },
            { key: 'personnelCount', regex: /^(体系人数|体系覆盖人数|人数|员工数|覆盖人数|企业人数|体系覆盖数|总人数|申报人数)(\(|（|$)/i },
            { key: 'accreditation', regex: /^(认可标志|认可标识|标志|标识|认可|是否认可|认可类型)(\(|（|$)/i },
            { key: 'appScope', regex: /^(申请范围|认证范围|经营范围|范围|产品范围|审核范围|核心范围|业务范围)(\(|（|$)/i },
            { key: 'projectStatus', regex: /^(项目状态|状态|排程状态|审核状态|派人状态|项目进度)(\(|（|$)/i },
          ];

          // Scan all sheets to find the one with the maximum valid records
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
            if (rows.length === 0) continue;

            const getHeaderSpecificity = (key: string, header: string): number => {
              const h = String(header).trim().toLowerCase();
              
              if (key === 'contractNo') {
                if (h.includes('合同编号') || h.includes('合同号')) return 3;
                if (h.includes('项目编号') || h.includes('项目号') || h.includes('订单号')) return 2;
                if (h === '编号' || h.includes('受控号') || h.includes('流水号') || h.includes('编号')) return 1;
                return 0;
              }
              
              if (key === 'orgName') {
                if (h.includes('全程') || h.includes('全称')) return 3;
                if (h.includes('名称') || h.includes('受审')) return 2;
                if (h === '客户' || h === '企业' || h === '公司' || h === '申请人') return 1;
                return 0;
              }
              
              if (key === 'salesperson') {
                if (h.includes('业务员') || h.includes('客户经理')) return 3;
                if (h.includes('销售') || h.includes('跟单') || h.includes('负责人') || h === '业务') return 2;
                if (h.includes('经办') || h.includes('项目经理')) return 1;
                return 0;
              }
              
              if (key === 'standard') {
                if (h === '标准' || h.includes('标准体系') || h.includes('认证标准') || h.includes('产品标准')) return 3;
                if (h.includes('体系') || h.includes('领域')) return 2;
                if (h.includes('项目') || h.includes('范围')) return 1;
                return 0;
              }
              
              if (key === 'profCode') {
                if (h.includes('专业代码') || h.includes('小类代码') || h.includes('行业代码') || h.includes('限用代码')) return 3;
                if (h.includes('代码') || h.includes('专业范围') || h.includes('专业类别') || h.includes('限用专业')) return 2;
                if (h.includes('专业')) return 1;
                return 0;
              }
              
              if (key === 'personnelCount') {
                if (h.includes('体系') && (h.includes('人数') || h.includes('人员') || h.includes('数'))) return 3;
                if (h.includes('人数') || h.includes('员工数') || h.includes('覆盖') || h.includes('总人数')) return 2;
                if (h.includes('申报') || h.includes('企业人数')) return 1;
                return 0;
              }
              
              return 1;
            };

            let bestHeaderRowIndex = -1;
            let bestMatchCount = 0;
            let bestMapping: Record<string, number> = {};

            // Search first 25 rows of the sheet for headers
            const searchLimit = Math.min(rows.length, 25);
            for (let r = 0; r < searchLimit; r++) {
              const row = rows[r];
              if (!row || !Array.isArray(row)) continue;
              
              const mapping: Record<string, number> = {};
              let matches = 0;
              
              for (let c = 0; c < row.length; c++) {
                const val = String(row[c] || '').trim();
                if (!val) continue;
                
                for (const target of targets) {
                  if (target.regex.test(val)) {
                    let actualKey = target.key;
                    
                    // Safety check: standard column containing mostly numbers is actually personnel count
                    if (actualKey === 'standard') {
                      let numericCount = 0;
                      let totalChecked = 0;
                      for (let nextR = r + 1; nextR < Math.min(rows.length, r + 10); nextR++) {
                        const nextRow = rows[nextR];
                        if (nextRow && nextRow[c] !== undefined && nextRow[c] !== null) {
                          const cellVal = String(nextRow[c]).trim();
                          if (cellVal) {
                            totalChecked++;
                            if (/^\d+(\.\d+)?$/.test(cellVal)) {
                              numericCount++;
                            }
                          }
                        }
                      }
                      if (totalChecked > 0 && (numericCount / totalChecked) > 0.6) {
                        actualKey = 'personnelCount';
                      }
                    }
                    
                    // Safety check: personnelCount containing non-numeric/standard-like text like "QMS" is actually standard
                    if (actualKey === 'personnelCount') {
                      let textCount = 0;
                      let totalChecked = 0;
                      for (let nextR = r + 1; nextR < Math.min(rows.length, r + 10); nextR++) {
                        const nextRow = rows[nextR];
                        if (nextRow && nextRow[c] !== undefined && nextRow[c] !== null) {
                          const cellVal = String(nextRow[c]).trim();
                          if (cellVal) {
                            totalChecked++;
                            if (/[a-zA-Z]{2,}/.test(cellVal) || cellVal.includes('体系') || cellVal.includes('标准') || cellVal.includes('QMS') || cellVal.includes('EMS')) {
                              textCount++;
                            }
                          }
                        }
                      }
                      if (totalChecked > 0 && (textCount / totalChecked) > 0.6) {
                        actualKey = 'standard';
                      }
                    }

                    // Avoid duplicate/overwrite conflict:
                    // If this key is already mapped, we need to decide which column is a better fit.
                    if (mapping[actualKey] !== undefined) {
                      const prevCol = mapping[actualKey];
                      const prevHeader = String(row[prevCol] || '').trim();
                      
                      const currentSpec = getHeaderSpecificity(actualKey, val);
                      const prevSpec = getHeaderSpecificity(actualKey, prevHeader);
                      
                      if (currentSpec > prevSpec) {
                        mapping[actualKey] = c;
                      } else if (currentSpec === prevSpec) {
                        // If same specificity, use specific overrides or default to keeping the first one mapped (more standard in Excel columns)
                        if (actualKey === 'standard') {
                          if (val === '标准' && prevHeader !== '标准') {
                            mapping[actualKey] = c;
                          }
                        } else if (actualKey === 'personnelCount') {
                          if ((val.includes('人数') || val.includes('人员')) && !(prevHeader.includes('人数') || prevHeader.includes('人员'))) {
                            mapping[actualKey] = c;
                          }
                        }
                      }
                    } else {
                      mapping[actualKey] = c;
                      matches++;
                    }
                    break;
                  }
                }
              }
              
              if (matches > bestMatchCount) {
                bestMatchCount = matches;
                bestHeaderRowIndex = r;
                bestMapping = mapping;
              }
            }

            const parsed: CertRecord[] = [];

            if (bestHeaderRowIndex !== -1 && bestMatchCount >= 2) {
              for (let r = bestHeaderRowIndex + 1; r < rows.length; r++) {
                const row = rows[r];
                if (!row || row.length === 0) continue;
                
                const hasValues = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
                if (!hasValues) continue;

                const getVal = (key: string) => {
                  const colIdx = bestMapping[key];
                  if (colIdx !== undefined && colIdx < row.length) {
                    return String(row[colIdx] || '').trim();
                  }
                  return '';
                };

                const orgNameVal = getVal('orgName');
                // Skip headers or rows that don't look like actual company names
                if (!orgNameVal || orgNameVal.length <= 2 || orgNameVal.includes('组织全') || orgNameVal.includes('客户名称') || orgNameVal.includes('企业名称')) {
                  continue;
                }

                const personnelStr = getVal('personnelCount').replace(/[^\d]/g, '');
                const personnel = parseInt(personnelStr, 10) || 50;
                const mandays = parseFloat(getVal('totalMandays')) || 4.5;

                const rawContractNo = getVal('contractNo');
                let cleanContractNo = rawContractNo;
                if (rawContractNo) {
                  const labels = ['合同状态：', '项目组备注：', '市场要求：', '审核要求：', '评审备注：', '专业管理人员：', '合同状态:', '项目组备注:', '市场要求:', '审核要求:', '评审备注:', '专业管理人员:'];
                  let firstIndex = -1;
                  for (const label of labels) {
                    const idx = rawContractNo.indexOf(label);
                    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
                      firstIndex = idx;
                    }
                  }
                  if (firstIndex !== -1) {
                    cleanContractNo = rawContractNo.substring(0, firstIndex).trim();
                  }
                }
                const finalContractNo = cleanContractNo || rawContractNo || 'HT-' + Math.floor(Math.random() * 1000000);

                let projectStatusVal = getVal('projectStatus');
                if ((!projectStatusVal || projectStatusVal === '待派人') && rawContractNo) {
                  let statusText = '';
                  if (rawContractNo.includes('合同状态：')) {
                    statusText = rawContractNo.split('合同状态：')[1] || '';
                  } else if (rawContractNo.includes('合同状态:')) {
                    statusText = rawContractNo.split('合同状态:')[1] || '';
                  } else if (rawContractNo.includes('台同状态：')) {
                    statusText = rawContractNo.split('台同状态：')[1] || '';
                  } else if (rawContractNo.includes('台同状态:')) {
                    statusText = rawContractNo.split('台同状态:')[1] || '';
                  }

                  if (statusText) {
                    const stopLabels = ['项目组备注', '市场要求', '审核要求', '评审备注', '专业管理人员', '合同状态', '台同状态'];
                    let stopIndex = -1;
                    for (const label of stopLabels) {
                      const idx = statusText.indexOf(label);
                      if (idx !== -1 && (stopIndex === -1 || idx < stopIndex)) {
                        stopIndex = idx;
                      }
                    }
                    if (stopIndex !== -1) {
                      statusText = statusText.substring(0, stopIndex);
                    }
                    statusText = statusText.replace(/[:：；;、,\s/]+$/, '').trim();
                    if (statusText) {
                      projectStatusVal = statusText;
                    }
                  }
                }
                if (!projectStatusVal) {
                  projectStatusVal = '待派人';
                }

                parsed.push({
                  id: `REC-${1001 + parsed.length}`,
                  province: getVal('province') || '山东',
                  orgName: orgNameVal,
                  salesperson: getVal('salesperson') || '自办',
                  standard: getVal('standard') || 'QMS',
                  totalMandays: mandays,
                  profCode: getVal('profCode') || '17.02',
                  regAddress: getVal('regAddress') || '未录入',
                  opsAddress: getVal('opsAddress') || '未录入',
                  contractNo: finalContractNo,
                  riskLevel: getVal('riskLevel') || '中风险',
                  personnelCount: personnel,
                  accreditation: getVal('accreditation') || 'CNAS',
                  appScope: getVal('appScope') || '通用认证范围',
                  projectStatus: projectStatusVal,
                });
              }
            } else {
              // Fallback: positional parsing
              for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                if (!row || row.length < 3) continue;
                
                const org = String(row[1] || '').trim();
                if (org && org.length > 3 && !org.includes('组织') && !org.includes('客户') && !org.includes('企业') && !org.includes('公司')) {
                  const rawContractNo = String(row[8] || '').trim();
                  let cleanContractNo = rawContractNo;
                  if (rawContractNo) {
                    const labels = ['合同状态：', '项目组备注：', '市场要求：', '审核要求：', '评审备注：', '专业管理人员：', '合同状态:', '项目组备注:', '市场要求:', '审核要求:', '评审备注:', '专业管理人员:'];
                    let firstIndex = -1;
                    for (const label of labels) {
                      const idx = rawContractNo.indexOf(label);
                      if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
                        firstIndex = idx;
                      }
                    }
                    if (firstIndex !== -1) {
                      cleanContractNo = rawContractNo.substring(0, firstIndex).trim();
                    }
                  }
                  const finalContractNo = cleanContractNo || rawContractNo || 'HT-' + Math.floor(Math.random() * 1000000);

                  let projectStatusVal = String(row[13] || '待派人').trim();
                  if ((!projectStatusVal || projectStatusVal === '待派人') && rawContractNo) {
                    let statusText = '';
                    if (rawContractNo.includes('合同状态：')) {
                      statusText = rawContractNo.split('合同状态：')[1] || '';
                    } else if (rawContractNo.includes('合同状态:')) {
                      statusText = rawContractNo.split('合同状态:')[1] || '';
                    } else if (rawContractNo.includes('台同状态：')) {
                      statusText = rawContractNo.split('台同状态：')[1] || '';
                    } else if (rawContractNo.includes('台同状态:')) {
                      statusText = rawContractNo.split('台同状态:')[1] || '';
                    }

                    if (statusText) {
                      const stopLabels = ['项目组备注', '市场要求', '审核要求', '评审备注', '专业管理人员', '合同状态', '台同状态'];
                      let stopIndex = -1;
                      for (const label of stopLabels) {
                        const idx = statusText.indexOf(label);
                        if (idx !== -1 && (stopIndex === -1 || idx < stopIndex)) {
                          stopIndex = idx;
                        }
                      }
                      if (stopIndex !== -1) {
                        statusText = statusText.substring(0, stopIndex);
                      }
                      statusText = statusText.replace(/[:：；;、,\s/]+$/, '').trim();
                      if (statusText) {
                        projectStatusVal = statusText;
                      }
                    }
                  }
                  if (!projectStatusVal) {
                    projectStatusVal = '待派人';
                  }

                  parsed.push({
                    id: `REC-${1001 + parsed.length}`,
                    province: String(row[0] || '山东').trim(),
                    orgName: org,
                    salesperson: String(row[2] || '张经理').trim(),
                    standard: String(row[3] || 'QMS').trim(),
                    totalMandays: parseFloat(row[4]) || 4.5,
                    profCode: String(row[5] || '17.02').trim(),
                    regAddress: String(row[6] || '').trim() || '同经营地址',
                    opsAddress: String(row[7] || '').trim() || '未录入',
                    contractNo: finalContractNo,
                    riskLevel: String(row[9] || '中风险').trim(),
                    personnelCount: parseInt(String(row[10] || '50').replace(/[^\d]/g, ''), 10) || 50,
                    accreditation: String(row[11] || 'CNAS').trim(),
                    appScope: String(row[12] || '').trim() || '产品生产与售后服务',
                    projectStatus: projectStatusVal,
                  });
                }
              }
            }

            if (parsed.length > maxRecordsFound) {
              maxRecordsFound = parsed.length;
              allSheetsParsedRecords = parsed;
              bestSheetName = sheetName;
            }
          }

          if (allSheetsParsedRecords.length > 0) {
            setParsedRecords(allSheetsParsedRecords);
            setParsedSheetName(bestSheetName);
            
            const firstParsed = allSheetsParsedRecords[0];
            if (firstParsed.opsAddress && firstParsed.opsAddress !== '未录入') {
              setEnterpriseAddress(firstParsed.opsAddress);
            } else if (firstParsed.regAddress && firstParsed.regAddress !== '未录入') {
              setEnterpriseAddress(firstParsed.regAddress);
            }
            if (firstParsed.standard) {
              setEnterpriseType(firstParsed.standard);
            }
          }
        } catch (err) {
          console.error("Failed to parse Excel file:", err);
        }
      };
      reader.readAsArrayBuffer(firstFile);
    } else if (firstFile.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const addrMatch = text.match(/(?:地址|位于|设在)[:：\s]*([^\n，,；;。]+)/);
        if (addrMatch && addrMatch[1]) {
          setEnterpriseAddress(addrMatch[1].trim());
        }
      };
      reader.readAsText(firstFile);
    }
  };

  const clearUploadedFiles = () => {
    setUploadedFiles([]);
    setParsedRecords([]);
    setParsedSheetName('');
    setIsSortedByRegion(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 p-4">
      {/* Main Grid Wrapper referencing the blue image layout structure */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left column sidebar with solid blue vertical buttons over a yellowish-orange frame */}
        <div className="lg:col-span-4 bg-[#FFE893] p-3 rounded-2xl border-4 border-amber-400 flex flex-col gap-3 shadow-md">
          <div className="text-xs font-bold text-amber-900 px-1 flex flex-col gap-1.5 border-b border-amber-300/40 pb-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">✨ 核心分析算法</span>
              <span className="text-[10px] bg-amber-400 px-1.5 py-0.5 rounded text-amber-950 font-mono">WORKSPACE</span>
            </div>
            <div className="text-[10px] bg-amber-50/60 border border-amber-300/50 rounded px-2 py-1 text-slate-700 flex items-center justify-between font-medium">
              <span>受控数据源</span>
              <span><span className="font-mono font-bold text-blue-700 text-xs">{teachers.length}</span> 位注册审核员</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              setActiveAnalysisMode(1);
              if (parsedRecords.length > 0) {
                const sorted = sortRecordsByRegionAndType(parsedRecords);
                setParsedRecords(sorted);
                setIsSortedByRegion(true);
              }
            }}
            className={cn(
              "w-full h-16 rounded-xl font-bold text-sm px-4 text-left transition-all flex items-center justify-between shadow-md",
              activeAnalysisMode === 1
                ? "bg-blue-800 text-white border-2 border-white scale-[1.02]"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            <span>按照地域和体系类型分组</span>
            <Users className="w-5 h-5 opacity-80 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => {
              setActiveAnalysisMode(2);
            }}
            className={cn(
              "w-full h-16 rounded-xl font-bold text-sm px-4 text-left transition-all flex items-center justify-between shadow-md",
              activeAnalysisMode === 2
                ? "bg-blue-800 text-white border-2 border-white scale-[1.02]"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            <span>按照同类型代码需求分组</span>
            <Layers className="w-5 h-5 opacity-80 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => {
              setActiveAnalysisMode(3);
            }}
            className={cn(
              "w-full h-16 rounded-xl font-bold text-sm px-4 text-left transition-all flex items-center justify-between shadow-md",
              activeAnalysisMode === 3
                ? "bg-blue-800 text-white border-2 border-white scale-[1.02]"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            <span>查询企业附近老师</span>
            <MapPin className="w-5 h-5 opacity-80 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => {
              setActiveAnalysisMode(4);
            }}
            className={cn(
              "w-full h-16 rounded-xl font-bold text-sm px-4 text-left transition-all flex items-center justify-between shadow-md",
              activeAnalysisMode === 4
                ? "bg-blue-800 text-white border-2 border-white scale-[1.02]"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            <span>查询企业附近同类型项目</span>
            <Building2 className="w-5 h-5 opacity-80 shrink-0 ml-2" />
          </button>

          <button
            onClick={() => {
              setActiveAnalysisMode(5);
            }}
            className={cn(
              "w-full h-16 rounded-xl font-bold text-sm px-4 text-left transition-all flex items-center justify-between shadow-md",
              activeAnalysisMode === 5
                ? "bg-blue-800 text-white border-2 border-white scale-[1.02]"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            <span>查询老师附近可审核项目</span>
            <CheckCircle2 className="w-5 h-5 opacity-80 shrink-0 ml-2" />
          </button>

          <div className="mt-auto bg-amber-200/50 rounded-xl p-3 border border-amber-300 text-amber-950">
            <h4 className="text-xs font-bold mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
              就近排程辅助器
            </h4>
            <p className="text-[10px] leading-relaxed text-amber-800">
              点击上方左侧核心算法，右侧内容展示区将即时更新匹配图谱，完美解决资源倒置和高昂差旅报销痛点。
            </p>
          </div>
        </div>

        {/* Right panel: "文档上传及内容显示区" */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden relative">
          
          {/* Top toolbar for document interaction */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">文档上传及内容显示区</span>
            </div>
            
            <div className="flex items-center gap-2">
              {uploadedFiles.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-red-600 hover:bg-red-50"
                  onClick={clearUploadedFiles}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> 清空文档
                </Button>
              )}
              
              <label className="h-7 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                <Upload className="w-3 h-3" />
                上传企业文档
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  accept=".txt,.csv,.xlsx,.xls,.pdf,.doc,.docx" 
                  onChange={handleFileSelect} 
                />
              </label>
            </div>
          </div>

          {/* Interactive display container */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            
            {/* If no core analysis algorithm is selected yet, show the beautiful default upload blueprint/landing area */}
            {activeAnalysisMode === null ? (
              parsedRecords.length > 0 ? (
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                  {/* Warning banner about missing codes */}
                  {missingCodesCount > 0 && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between shrink-0 animate-fadeIn text-[11px] gap-4">
                      <div className="flex items-center gap-2 text-amber-950 font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                        <span>当前文档有 <b>{missingCodesCount}</b> 个待评审项目缺少专业代码。系统支持通过“范围检索”模块根据企业申请范围和行业属性进行代码自动识别！</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          size="xs" 
                          onClick={autoIdentifyMissingCodes}
                          disabled={isAutoIdentifying}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-7 px-3 rounded shadow-xs"
                        >
                          {isAutoIdentifying ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              智能识别匹配中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              一键自动匹配缺失代码
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Search and control bar */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                        已成功识别并加载 {parsedSheetName ? `【${parsedSheetName}】中的` : ""} {parsedRecords.length} 条真实企业数据
                      </span>
                      <span className="text-[11px] text-slate-500">（含 省份、组织全程、业务员、标准、总人日等 13 个要素维度）</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="搜索企业全称或省份..."
                          value={tableSearchQuery}
                          onChange={(e) => setTableSearchQuery(e.target.value)}
                          className="pl-8 pr-3 h-7 text-xs bg-white border border-slate-200 rounded-lg outline-none w-52 focus:ring-1 focus:ring-blue-500 text-slate-800"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 text-xs border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 flex items-center gap-1 font-bold"
                        onClick={() => setShowReconciliationModal(true)}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        代码对账文档 (.json)
                      </Button>
                      <Button 
                        variant="outline" 
                        size="xs" 
                        className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200 font-bold" 
                        onClick={() => {
                          setParsedRecords([]);
                          setUploadedFiles([]);
                        }}
                      >
                        清空数据
                      </Button>
                    </div>
                  </div>

                  {/* Spreadsheet-like table container with 14 columns as requested */}
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed min-w-[2550px]">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-10 h-10">
                          <th className="px-3 py-2 w-12 text-center bg-slate-100">序号</th>
                          <th className="px-3 py-2 w-64">合同编号</th>
                          <th className="px-3 py-2 w-28 text-center bg-sky-50 text-sky-800">项目状态</th>
                          <th className="px-4 py-2 w-64">组织全程 (客户全称)</th>
                          <th className="px-3 py-2 w-20">省份</th>
                          <th className="px-3 py-2 w-24">业务员</th>
                          <th className="px-3 py-2 w-36">标准 (体系)</th>
                          <th className="px-3 py-2 w-24">总人日</th>
                          <th className="px-3 py-2 w-72">专业代码 (含体系类型)</th>
                          <th className="px-4 py-2 w-64">注册地址</th>
                          <th className="px-4 py-2 w-64">经营地址</th>
                          <th className="px-3 py-2 w-28">风险等级</th>
                          <th className="px-3 py-2 w-24">体系人数</th>
                          <th className="px-3 py-2 w-28">认可标志</th>
                          <th className="px-4 py-2 w-80">申请范围</th>
                          <th className="px-3 py-2 w-32 text-center sticky right-0 bg-slate-100 border-l border-slate-200 shadow-l">排程算法联动</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                        {parsedRecords
                          .filter(rec => 
                            !tableSearchQuery || 
                            rec.orgName.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                            rec.province.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                            rec.contractNo.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                            rec.standard.toLowerCase().includes(tableSearchQuery.toLowerCase())
                          )
                          .map((rec, idx) => (
                            <tr key={rec.id} className="hover:bg-blue-50/25 transition-colors group align-middle border-b border-slate-100">
                              <td className="px-3 py-2.5 text-center font-mono text-[10px] text-slate-400 font-bold bg-slate-50/50">{idx + 1}</td>
                              <td className="px-3 py-2.5 font-medium text-slate-600" title={rec.contractNo}>
                                {renderContractNo(rec.contractNo)}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold border inline-block",
                                  rec.projectStatus?.includes('待派人') || rec.projectStatus?.includes('待派') ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  rec.projectStatus?.includes('待审核') || rec.projectStatus?.includes('审核') ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  rec.projectStatus?.includes('完成') || rec.projectStatus?.includes('已') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  "bg-slate-50 text-slate-600 border-slate-200"
                                )}>
                                  {rec.projectStatus || '待派人'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-normal break-words" title={rec.orgName}>{rec.orgName}</td>
                              <td className="px-3 py-2.5">
                                <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">{rec.province}</span>
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 font-medium">{rec.salesperson}</td>
                              <td className="px-3 py-2.5">
                                {renderStandards(rec.standard)}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{rec.totalMandays} 人日</td>
                              <td className="px-3 py-2.5" title={rec.profCode}>
                                {editingRecordId === rec.id ? (
                                  <div className="flex items-center gap-1.5 py-1">
                                    <input 
                                      type="text" 
                                      value={tempEditValue}
                                      onChange={(e) => setTempEditValue(e.target.value)}
                                      className="font-mono text-[11px] h-6 px-1.5 border border-blue-500 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-800 w-44"
                                      placeholder="e.g. QMS: 17.02"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveManualCode(rec.id, tempEditValue);
                                        } else if (e.key === 'Escape') {
                                          setEditingRecordId(null);
                                        }
                                      }}
                                    />
                                    <Button 
                                      variant="ghost" 
                                      size="xs" 
                                      className="h-6 w-6 p-0 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                      onClick={() => handleSaveManualCode(rec.id, tempEditValue)}
                                    >
                                      ✓
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="xs" 
                                      className="h-6 w-6 p-0 text-slate-400 bg-slate-50 hover:bg-slate-100"
                                      onClick={() => setEditingRecordId(null)}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {renderProfCodes(rec.profCode)}
                                      {rec.isAutoMatched && !confirmedMatchIds.includes(rec.id) && (
                                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded font-bold shrink-0 shadow-2xs flex items-center gap-0.5 animate-pulse">
                                          🤖 自动识别
                                        </span>
                                      )}
                                      {rec.isAutoMatched && confirmedMatchIds.includes(rec.id) && (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded font-bold shrink-0 flex items-center gap-0.5">
                                          ✓ 已核实
                                        </span>
                                      )}
                                    </div>
                                    
                                    {rec.isAutoMatched ? (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9.5px] text-slate-400 italic font-normal max-w-[150px] truncate" title={rec.matchReason}>
                                          依据: {rec.matchReason}
                                        </span>
                                        {!confirmedMatchIds.includes(rec.id) && (
                                          <button 
                                            onClick={() => handleConfirmAutoMatch(rec.id)}
                                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline shrink-0"
                                          >
                                            核实
                                          </button>
                                        )}
                                        <button 
                                          onClick={() => {
                                            setEditingRecordId(rec.id);
                                            setTempEditValue(rec.profCode);
                                          }}
                                          className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline shrink-0"
                                        >
                                          修改
                                        </button>
                                      </div>
                                    ) : (
                                      (!rec.profCode || rec.profCode.trim() === "" || rec.profCode.trim() === "-") && (
                                        <button 
                                          onClick={() => {
                                            setEditingRecordId(rec.id);
                                            setTempEditValue("");
                                          }}
                                          className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline self-start"
                                        >
                                          + 手动补充代码
                                        </button>
                                      )
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 whitespace-normal break-words" title={rec.regAddress}>{rec.regAddress}</td>
                              <td className="px-4 py-2.5 text-slate-600 whitespace-normal break-words font-medium" title={rec.opsAddress}>{rec.opsAddress}</td>
                              <td className="px-3 py-2.5">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold border inline-block",
                                  rec.riskLevel.includes('高') ? "bg-red-50 text-red-700 border-red-100" :
                                  rec.riskLevel.includes('中') ? "bg-amber-50 text-amber-700 border-amber-100" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  {rec.riskLevel}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-mono font-medium text-slate-600">{rec.personnelCount} 人</td>
                              <td className="px-3 py-2.5">
                                <span className="bg-purple-50 text-purple-700 border border-purple-100 rounded px-1.5 py-0.5 font-bold text-[10px] inline-block">
                                  {rec.accreditation}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 whitespace-normal break-words text-[11px]" title={rec.appScope}>{rec.appScope}</td>
                              <td className="px-3 py-2.5 text-center sticky right-0 bg-white group-hover:bg-slate-50/50 border-l border-slate-200 shadow-l">
                                <div className="flex items-center justify-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="xs" 
                                    className="h-6 text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded px-2"
                                    onClick={() => {
                                      setEnterpriseAddress(rec.opsAddress !== '未录入' ? rec.opsAddress : rec.regAddress);
                                      if (rec.standard) {
                                        setEnterpriseType(rec.standard.split(/[,\s/+]+/)[0] || 'QMS');
                                      } else {
                                        setEnterpriseType('QMS');
                                      }
                                      setSelectedProject(rec);
                                      setActiveAnalysisMode(3); // Directly trigger Proximity analysis
                                    }}
                                  >
                                    📍 就近推荐老师
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded"
                                    onClick={() => handleDeleteRecord(rec.id)}
                                    title="删除该项目"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Smart interactive instructions bar */}
                  <div className="bg-blue-50 px-4 py-2 border-t border-blue-100 text-[11px] text-blue-800 flex items-center justify-between shrink-0">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-600" />
                      <span>💡 <b>智慧数据联动：</b>双击或点击右端 <b>📍 就近推荐老师</b> 按钮，系统将立即用此真实企业的 13 个参数计算最优就近派遣老师！</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[9px]">XLSX PARSER V2</span>
                  </div>
                </div>
              ) : (
                <div 
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center p-8 transition-all duration-300",
                    isDragging ? "bg-blue-50/70 border-4 border-dashed border-blue-400" : "bg-[#4572c4] text-white"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="max-w-md text-center space-y-4">
                    <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center text-white mx-auto animate-bounce duration-1000">
                      <Upload className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">文档上传与智能内容检索面板</h3>
                      <p className="text-xs opacity-85 mt-1 leading-relaxed">
                        支持上传格式：.xlsx, .xls, .csv, .txt 等常用表格或文本格式文档
                      </p>
                    </div>
                    
                    {/* Show already uploaded documents briefly */}
                    {uploadedFiles.length > 0 ? (
                      <div className="bg-white/10 p-3 rounded-xl text-left border border-white/20 text-xs space-y-2 mt-4 max-h-[140px] overflow-auto custom-scrollbar">
                        <div className="font-bold border-b border-white/20 pb-1 flex justify-between">
                          <span>已加载的解析文档:</span>
                          <span className="font-mono text-[10px] bg-white/20 px-1 rounded">{uploadedFiles.length}个</span>
                        </div>
                        {uploadedFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs font-mono">
                            <span className="truncate max-w-[200px] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-300 shrink-0" />
                              {f.name}
                            </span>
                            <span className="opacity-70 text-[10px]">{f.size}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-white/20 bg-white/5 rounded-xl p-3 text-xs flex flex-col items-center gap-3">
                        <span className="opacity-70 text-[10px]">💡 快捷测试：直接拖拽企业名单Excel或一键载入高保真表格</span>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-white bg-white/10 hover:bg-white/20 border-0 font-bold"
                            onClick={() => {
                              setUploadedFiles([
                                { name: '2026年下半年企业体系认证申请排程表.xlsx', size: '38.4 KB', type: 'XLSX' }
                              ]);
                              setParsedRecords(DEMO_RECORDS);
                              setIsSortedByRegion(false);
                            }}
                          >
                            一键自动载入高仿Excel数据表
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 flex items-center justify-center gap-2 text-xs font-bold text-[#ffd35c]">
                      <span>👈 现在，点击左边黄色面板中的算法开始计算！</span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              // Functional Mode Contents
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
                
                {/* Active Mode indicator bar */}
                <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-800">
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {activeAnalysisMode === 1 && "按照地域和体系类型分组列表"}
                      {activeAnalysisMode === 2 && "按照同类型代码需求分组列表"}
                      {activeAnalysisMode === 3 && "企业附近老师距离分析图谱"}
                      {activeAnalysisMode === 4 && "企业附近同类型项目匹配表"}
                      {activeAnalysisMode === 5 && "老师附近可审核项目匹配表"}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    className="h-6 text-[10px] text-blue-600 hover:bg-blue-100"
                    onClick={() => setActiveAnalysisMode(null)}
                  >
                    返回文档主页
                  </Button>
                </div>

                {/* Sub-Contents Scroll Area */}
                <div className="flex-1 p-4 overflow-auto custom-scrollbar min-h-0">
                  
                  {/* Mode 1: Group by Region & System */}
                  {activeAnalysisMode === 1 && (
                    <div className="space-y-4">
                      {/* Tab switching */}
                      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
                        <button
                          onClick={() => setMode1ActiveTab('projects')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold transition-all",
                            mode1ActiveTab === 'projects'
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          )}
                        >
                          🏢 聚类项目分部 ({parsedRecords.length} 项)
                        </button>
                        <button
                          onClick={() => setMode1ActiveTab('teachers')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold transition-all",
                            mode1ActiveTab === 'teachers'
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          )}
                        >
                          👨‍🏫 匹配审核员分布 ({matchedTeachers.length} 人)
                        </button>
                        <button
                          onClick={() => setMode1ActiveTab('full_part_combo')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold transition-all",
                            mode1ActiveTab === 'full_part_combo'
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          )}
                        >
                          👥 专兼组合(非专家) ({fullPartCombos.length} 组)
                        </button>
                        <button
                          onClick={() => setMode1ActiveTab('full_expert_combo')}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-bold transition-all",
                            mode1ActiveTab === 'full_expert_combo'
                              ? "bg-white text-blue-700 shadow-xs"
                              : "text-slate-600 hover:text-slate-800"
                          )}
                        >
                          🏅 专职+技术专家 ({fullExpertCombos.length} 组)
                        </button>
                      </div>

                      {/* Filter Box */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="过滤地区省份（如 山东、北京...）"
                          value={regionFilter}
                          onChange={(e) => setRegionFilter(e.target.value)}
                          className="flex-1 text-xs outline-none bg-transparent"
                        />
                        {regionFilter && (
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => setRegionFilter('')}
                            className="h-5 text-slate-400 hover:text-slate-600 text-[10px] px-1"
                          >
                            清空
                          </Button>
                        )}
                      </div>

                      {mode1ActiveTab === 'projects' && (
                        /* Projects Tab */
                        parsedRecords.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                            <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            <p className="text-xs">暂无导入的企业项目数据，请返回主页上传文件或一键载入测试数据。</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Explanatory notes */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-[13px]">
                                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>算法聚类及相似度排序已生效！</span>
                              </div>
                              <p className="opacity-90 leading-relaxed text-[11px]">
                                导入的项目已依 <b>省份</b> 分类，<b>同城市</b> 的记录合并展示。同一省市区域内具有 <b>相同或相似体系类型、部分相同专业代码</b> 的项目已智能聚合。<b>相似度越高，排序越靠前。整个项目目录已重排。</b>
                              </p>
                            </div>

                            <div className="space-y-4">
                              {groupedSortedProjects
                                .filter(g => !regionFilter || g.province.includes(regionFilter))
                                .map((pGroup, pIdx) => {
                                  const totalInProv = pGroup.cities.reduce((sum, c) => sum + c.records.length, 0);
                                  return (
                                    <div key={pIdx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                                      {/* Province Header */}
                                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                          <MapPin className="w-4.5 h-4.5 text-blue-600" />
                                          <span className="bg-blue-100 text-blue-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                                            {pGroup.province}
                                          </span>
                                        </h3>
                                        <span className="text-xs font-bold text-slate-500">
                                          共 {totalInProv} 个项目
                                        </span>
                                      </div>

                                      {/* Cities inside Province */}
                                      <div className="space-y-4 pl-2">
                                        {pGroup.cities.map((cGroup, cIdx) => (
                                          <div key={cIdx} className="space-y-2">
                                            {/* City Sub-header */}
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                              <span>{cGroup.city}市</span>
                                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                                                {cGroup.records.length} 个项目
                                              </span>
                                            </div>

                                            {/* Projects sorted list in City */}
                                            <div className="grid grid-cols-1 gap-2 pl-3">
                                              {cGroup.records.map((rec, rIdx) => (
                                                <div 
                                                  key={rec.id} 
                                                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 hover:border-blue-200 rounded-lg p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all relative overflow-hidden group"
                                                >
                                                  {/* Similarity index badge */}
                                                  <div className="absolute top-0 right-0 bg-blue-50/80 group-hover:bg-blue-100/80 text-[9px] font-mono font-extrabold text-blue-600 px-1.5 py-0.5 rounded-bl">
                                                    聚类顺位 #{rIdx + 1}
                                                  </div>

                                                  <div className="flex-1 space-y-1.5">
                                                    <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                                                      <span className="text-xs font-extrabold text-slate-800">
                                                        {rec.orgName}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400 font-medium">
                                                        {rec.opsAddress || rec.regAddress}
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                      <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-slate-500 font-bold">体系标准:</span>
                                                        {renderStandards(rec.standard)}
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-slate-500 font-bold">专业代码:</span>
                                                        {renderProfCodes(rec.profCode)}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="shrink-0 flex items-center gap-3">
                                                    <div className="text-right">
                                                      <div className="text-[10px] text-slate-400 font-medium">合同编号</div>
                                                      <div className="font-mono text-[10.5px] font-bold text-slate-700">
                                                        {rec.contractNo ? rec.contractNo.split(' ')[0] : '-'}
                                                      </div>
                                                    </div>
                                                    <div className="text-right">
                                                      <div className="text-[10px] text-slate-400 font-medium mb-0.5">项目状态</div>
                                                      <span className={cn(
                                                        "px-1.5 py-0.2 rounded text-[9.5px] font-bold border inline-block",
                                                        rec.projectStatus?.includes('待派人') || rec.projectStatus?.includes('待派') ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                        rec.projectStatus?.includes('待审核') || rec.projectStatus?.includes('审核') ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                        rec.projectStatus?.includes('完成') || rec.projectStatus?.includes('已') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                        "bg-slate-50 text-slate-600 border-slate-200"
                                                      )}>
                                                        {rec.projectStatus || '待派人'}
                                                      </span>
                                                    </div>
                                                    <Button 
                                                      size="xs" 
                                                      variant="outline" 
                                                      className="h-7 text-[10px] border-slate-200 text-slate-600 hover:bg-slate-100"
                                                      onClick={() => {
                                                        setEnterpriseAddress(rec.opsAddress || rec.regAddress || '');
                                                        if (rec.standard) setEnterpriseType(rec.standard.split(/[,\s/+]+/)[0] || 'QMS');
                                                        setActiveAnalysisMode(3);
                                                      }}
                                                    >
                                                      📍 匹配老师
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="xs"
                                                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded"
                                                      onClick={() => handleDeleteRecord(rec.id)}
                                                      title="删除该项目"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )
                      )}

                      {mode1ActiveTab === 'teachers' && (
                          /* Matched Recommended Auditors Tab */
                        <div className="space-y-4">
                          {parsedRecords.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="text-xs">暂无导入的项目需求，请先返回主页上传文件，或一键导入测试项目。</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Selection of analysis region */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 block">
                                  🗺️ 第一步：选择分析与匹配的项目所在省份/区域：
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                  {availableProvinces.map(prov => (
                                    <button
                                      key={prov}
                                      onClick={() => setSelectedAnalysisRegion(prov)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                        selectedAnalysisRegion === prov
                                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      )}
                                    >
                                      📍 {prov} ({parsedRecords.filter(r => {
                                        const pProv = r.province || parseProvinceCity(r.opsAddress || r.regAddress || '').province;
                                        return pProv === prov;
                                      }).length}个项目)
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Selected Region Demands Overview */}
                              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="font-bold flex items-center gap-1.5 text-[13px] text-emerald-900">
                                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                                    <span>【{selectedAnalysisRegion || '未选择'}】区域项目需求画像已生成：</span>
                                  </div>
                                  <p className="text-[11px] opacity-90 leading-relaxed">
                                    共包含 <b>{regionProjects.length}</b> 个待申报企业项目。系统已自动对所需体系标准与专业代码进行归纳并高精度去重。
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 shrink-0">
                                  <div className="bg-white/95 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-2xs">
                                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">需要认证体系</span>
                                    <div className="flex gap-1">
                                      {regionRequirements.standards.length > 0 ? (
                                        regionRequirements.standards.map(std => (
                                          <span key={std} className="bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                                            {std}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">无特定体系</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="bg-white/95 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-2xs max-w-[200px]">
                                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">专业代码要求 ({regionRequirements.codes.length})</span>
                                    <div className="flex flex-wrap gap-0.5 max-h-[32px] overflow-y-auto custom-scrollbar">
                                      {regionRequirements.codes.length > 0 ? (
                                        regionRequirements.codes.map(code => (
                                          <span key={code} className="bg-blue-100 text-blue-800 text-[9px] font-mono font-bold px-1 rounded">
                                            {code}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-400 text-[10px]">无特定代码</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Recommended list */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    🗺️ 第二步：根据体系及专业代码智能匹配审核员排序如下：
                                  </span>
                                </div>

                                {matchedTeachers.length === 0 ? (
                                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                                    未找到任何能匹配此区域项目（体系或专业代码）的注册审核员。
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {matchedTeachers.map((m, idx) => {
                                      const t = m.teacher;
                                      const jobType = String(t['专兼职'] || t.jobType || t.job_type || t.JobType || '').trim();
                                      const isFullTime = jobType.includes('专职') || jobType.includes('专审') || jobType.includes('专兼');
                                      const displayJobType = jobType || '兼职';
                                      const qualification = String(t['注册资格'] || t['资质级别'] || t.qualification || t.Qualification || '').trim();
                                      const isExpert = qualification.includes('专家') || qualification.includes('技术专家') || qualification.includes('评估员');
                                      const isPartTimeExpert = !isFullTime && isExpert;

                                      const totalReqCodes = regionRequirements.codes.length;
                                      const coveredCodesCount = m.matchedCodes.filter(c => !c.isPartial).length;
                                      const partialCodesCount = m.matchedCodes.filter(c => c.isPartial).length;
                                      
                                      const coveragePct = totalReqCodes > 0 
                                        ? Math.round(((coveredCodesCount + partialCodesCount * 0.4) / totalReqCodes) * 100)
                                        : 100;

                                      const tAddr = t['通讯地址'] || t.address || '';

                                      return (
                                        <div 
                                          key={idx} 
                                          className={cn(
                                            "bg-white border hover:border-blue-300 rounded-xl p-3.5 shadow-2xs transition-all relative overflow-hidden group flex flex-col justify-between min-h-[170px]",
                                            isPartTimeExpert 
                                              ? "border-amber-300 bg-gradient-to-br from-amber-50/10 via-white to-amber-50/5 shadow-amber-100/50"
                                              : m.isLocal 
                                                ? "border-blue-200 bg-gradient-to-br from-white to-blue-50/10" 
                                                : "border-slate-200"
                                          )}
                                        >
                                          <div className="absolute top-0 right-0 flex items-center">
                                            {isPartTimeExpert && (
                                              <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-bl animate-pulse">
                                                ★ 外部专家
                                              </span>
                                            )}
                                            {!isPartTimeExpert && m.isLocal && (
                                              <span className="bg-blue-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-bl">
                                                本地优先
                                              </span>
                                            )}
                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.5">
                                              推荐指数 #{idx + 1}
                                            </span>
                                          </div>

                                          <div className="space-y-2.5">
                                            <div>
                                              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                                <span className="text-base">👨‍🏫</span>
                                                <span className={cn(isPartTimeExpert && "text-amber-900 font-extrabold")}>
                                                  {t['姓名'] || t.name}
                                                </span>
                                                
                                                {/* Full-time / Part-time clear badges */}
                                                <span className={cn(
                                                  "text-[9px] font-bold px-1.5 py-0.2 rounded border shadow-3xs font-sans shrink-0",
                                                  isFullTime 
                                                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                                )}>
                                                  {displayJobType}
                                                </span>

                                                {/* Technical Expert label for part-time experts */}
                                                {isPartTimeExpert && (
                                                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-extrabold px-1 rounded shadow-3xs shrink-0 flex items-center gap-0.5">
                                                    技术专家
                                                  </span>
                                                )}
                                              </h4>
                                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                                                <span className="truncate max-w-[220px]" title={tAddr}>{tAddr || '地址未录入'}</span>
                                                {m.isLocal && <span className="text-[10px] text-blue-600 font-bold shrink-0">(同省距离优)</span>}
                                              </p>
                                            </div>

                                            <div className="space-y-1.5">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0">体系匹配:</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {m.matchedStandards.length > 0 ? (
                                                    m.matchedStandards.map(std => (
                                                      <span key={std} className="bg-emerald-50 text-emerald-700 text-[9.5px] border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                                        ✓ {std}
                                                      </span>
                                                    ))
                                                  ) : (
                                                    <span className="text-slate-400 text-[10.5px]">无直接匹配</span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-start gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">代码匹配:</span>
                                                <div className="flex flex-wrap gap-1 max-h-[44px] overflow-y-auto custom-scrollbar">
                                                  {m.matchedCodes.length > 0 ? (
                                                    m.matchedCodes.map((mc, ci) => (
                                                      <span 
                                                        key={ci} 
                                                        className={cn(
                                                          "text-[9.5px] px-1.5 py-0.2 rounded font-bold border",
                                                          mc.isPartial 
                                                            ? "bg-amber-50/50 text-amber-700 border-amber-200" 
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                        )}
                                                      >
                                                        ✓ {mc.code}{mc.isPartial && ' (部分)'}
                                                      </span>
                                                    ))
                                                  ) : (
                                                    <span className="text-slate-400 text-[10.5px]">无代码覆盖</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <div className="flex-1 max-w-[130px]">
                                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                                                <span>{m.isLocal ? "本省代码覆盖度" : "非本省代码覆盖度"}</span>
                                                <span className="font-mono text-blue-600 font-extrabold">{coveragePct}%</span>
                                              </div>
                                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                  className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    coveragePct >= 80 ? "bg-emerald-500" :
                                                    coveragePct >= 50 ? "bg-blue-500" :
                                                    "bg-amber-500"
                                                  )}
                                                  style={{ width: `${Math.min(coveragePct, 100)}%` }}
                                                />
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-slate-400 font-bold font-mono shrink-0">
                                                评分: {m.score}
                                              </span>
                                              <Button
                                                size="xs"
                                                variant="outline"
                                                className="h-7 text-[10px] border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                                                onClick={() => {
                                                  setEnterpriseAddress(tAddr);
                                                  if (m.matchedStandards.length > 0) {
                                                    setEnterpriseType(m.matchedStandards[0]);
                                                  }
                                                  setSelectedTeacherName(t['姓名'] || t.name);
                                                  setActiveAnalysisMode(3);
                                                }}
                                              >
                                                📍 精准测距
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {mode1ActiveTab === 'full_part_combo' && (
                        <div className="space-y-4">
                          {parsedRecords.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="text-xs">暂无导入的项目需求，请先返回主页上传文件，或一键导入测试项目。</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Selection of analysis region */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 block">
                                  🗺️ 第一步：选择分析与匹配的项目所在省份/区域：
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                  {availableProvinces.map(prov => (
                                    <button
                                      key={prov}
                                      onClick={() => setSelectedAnalysisRegion(prov)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                        selectedAnalysisRegion === prov
                                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      )}
                                    >
                                      📍 {prov} ({parsedRecords.filter(r => {
                                        const pProv = r.province || parseProvinceCity(r.opsAddress || r.regAddress || '').province;
                                        return pProv === prov;
                                      }).length}个项目)
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Selected Region Demands Overview */}
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="font-bold flex items-center gap-1.5 text-[13px] text-blue-900">
                                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span>【专兼职强补足测算】区域项目覆盖度分析（{selectedAnalysisRegion}）：</span>
                                  </div>
                                  <p className="text-[11px] opacity-90 leading-relaxed">
                                    算法已为您智能筛选 <b>专职 + 兼职（非专家）组合</b>，通过两者体系/专业代码强强补足，测算对本地项目的最大覆盖。结果显示顺序和技术专家标签相同，优先展示能覆盖本地项目的组合。
                                  </p>
                                </div>
                              </div>

                              {/* Recommended list */}
                              <div className="space-y-3">
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  🗺️ 第二步：专兼职补足匹配测算推荐如下：
                                </span>

                                {fullPartCombos.length === 0 ? (
                                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                                    未找到任何可补足匹配的专职与兼职组合。
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {fullPartCombos.map((combo, idx) => {
                                      const { ft, pt, matchedStandards, matchedCodes, coveragePct, score, isLocal } = combo;

                                      return (
                                        <div 
                                          key={idx} 
                                          className={cn(
                                            "bg-white border hover:border-blue-300 rounded-xl p-4 shadow-2xs transition-all relative overflow-hidden group flex flex-col justify-between min-h-[220px]",
                                            isLocal 
                                              ? "border-blue-200 bg-gradient-to-br from-white to-blue-50/10" 
                                              : "border-slate-200"
                                          )}
                                        >
                                          {/* Header Tag */}
                                          <div className="absolute top-0 right-0 flex items-center">
                                            {isLocal && (
                                              <span className="bg-blue-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-bl">
                                                本地组合
                                              </span>
                                            )}
                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.5">
                                              推荐组合 #{idx + 1}
                                            </span>
                                          </div>

                                          <div className="space-y-3">
                                            {/* Dual partners description */}
                                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-dashed border-slate-100 mr-20">
                                              <div className="space-y-0.5">
                                                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block">专职审核员</span>
                                                <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                                                  <span>👤 {ft.teacher['姓名'] || ft.teacher.name}</span>
                                                  <span className="text-[9.5px] text-slate-400 font-normal">({ft.province})</span>
                                                </div>
                                              </div>
                                              <div className="text-slate-300 font-light text-sm shrink-0">＋</div>
                                              <div className="space-y-0.5 text-right">
                                                <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">兼职(非专家)</span>
                                                <div className="font-bold text-slate-800 text-xs flex items-center gap-1 justify-end">
                                                  <span>👤 {pt.teacher['姓名'] || pt.teacher.name}</span>
                                                  <span className="text-[9.5px] text-slate-400 font-normal">({pt.province})</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Details matching */}
                                            <div className="space-y-1.5 text-xs">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0">联合体系:</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {matchedStandards.length > 0 ? (
                                                    matchedStandards.map(std => (
                                                      <span key={std} className="bg-emerald-50 text-emerald-700 text-[9.5px] border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                                        ✓ {std}
                                                      </span>
                                                    ))
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px]">无匹配</span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-start gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">联合代码:</span>
                                                <div className="flex flex-wrap gap-1 max-h-[44px] overflow-y-auto custom-scrollbar">
                                                  {matchedCodes.length > 0 ? (
                                                    matchedCodes.map((mc, ci) => (
                                                      <span 
                                                        key={ci} 
                                                        className={cn(
                                                          "text-[9.5px] px-1.5 py-0.2 rounded font-bold border",
                                                          mc.isPartial 
                                                            ? "bg-amber-50/50 text-amber-700 border-amber-200" 
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                        )}
                                                      >
                                                        ✓ {mc.code}{mc.isPartial && ' (部分)'}
                                                      </span>
                                                    ))
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px]">无代码覆盖</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                                                <span>双人联合代码覆盖度</span>
                                                <span className="font-mono text-blue-600 font-extrabold">{coveragePct}%</span>
                                              </div>
                                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                  className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    coveragePct >= 80 ? "bg-emerald-500" :
                                                    coveragePct >= 50 ? "bg-blue-500" :
                                                    "bg-amber-500"
                                                  )}
                                                  style={{ width: `${Math.min(coveragePct, 100)}%` }}
                                                />
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                              <span className="text-[10px] text-slate-400 font-bold font-mono">
                                                联合评分: {score}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {mode1ActiveTab === 'full_expert_combo' && (
                        <div className="space-y-4">
                          {parsedRecords.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                              <p className="text-xs">暂无导入的项目需求，请先返回主页上传文件，或一键导入测试项目。</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Selection of analysis region */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 block">
                                  🗺️ 第一步：选择分析与匹配的项目所在省份/区域：
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                  {availableProvinces.map(prov => (
                                    <button
                                      key={prov}
                                      onClick={() => setSelectedAnalysisRegion(prov)}
                                      className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                        selectedAnalysisRegion === prov
                                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      )}
                                    >
                                      📍 {prov} ({parsedRecords.filter(r => {
                                        const pProv = r.province || parseProvinceCity(r.opsAddress || r.regAddress || '').province;
                                        return pProv === prov;
                                      }).length}个项目)
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Selected Region Demands Overview */}
                              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="font-bold flex items-center gap-1.5 text-[13px] text-amber-950">
                                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>【技术专家就地匹配】专职+就近专家保障分析（{selectedAnalysisRegion}）：</span>
                                  </div>
                                  <p className="text-[11px] opacity-90 leading-relaxed">
                                    专家与项目所在地必须相同（<b>本省/{selectedAnalysisRegion}专家</b>），搭配 <b>就近/同省专职审核员</b>（无特定代码要求，保障派人随行）。
                                  </p>
                                </div>
                              </div>

                              {/* Recommended list */}
                              <div className="space-y-3">
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  🗺️ 第二步：专职 + 技术专家(本省) 推荐组合如下：
                                </span>

                                {fullExpertCombos.length === 0 ? (
                                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                                    在此省份未找到符合条件的技术专家。
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {fullExpertCombos.map((combo, idx) => {
                                      const { ft, expert, matchedStandards, matchedCodes, coveragePct, score, proximityLevel } = combo;

                                      return (
                                        <div 
                                          key={idx} 
                                          className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-4 shadow-2xs transition-all relative overflow-hidden group flex flex-col justify-between min-h-[220px]"
                                        >
                                          {/* Header Tag */}
                                          <div className="absolute top-0 right-0 flex items-center">
                                            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-bl">
                                              专家本省
                                            </span>
                                            <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.5">
                                              推荐组合 #{idx + 1}
                                            </span>
                                          </div>

                                          <div className="space-y-3">
                                            {/* Dual partners description */}
                                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-dashed border-slate-100 mr-20">
                                              <div className="space-y-0.5">
                                                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block">专职审核员 (就近)</span>
                                                <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                                                  <span>👤 {ft.teacher['姓名'] || ft.teacher.name}</span>
                                                  <span className="text-[9.5px] text-slate-400 font-normal">({ft.province} · {ft.city})</span>
                                                </div>
                                                <span className={cn(
                                                  "text-[9px] font-bold px-1 rounded shadow-3xs",
                                                  proximityLevel === '同城极近' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                                  proximityLevel === '同省就近' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                                  "bg-slate-100 text-slate-600 border border-slate-200"
                                                )}>
                                                  {proximityLevel}
                                                </span>
                                              </div>
                                              <div className="text-slate-300 font-light text-sm shrink-0">＋</div>
                                              <div className="space-y-0.5 text-right">
                                                <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider block">技术专家 (本省限定)</span>
                                                <div className="font-bold text-slate-800 text-xs flex items-center gap-1 justify-end">
                                                  <span>★ 👤 {expert.teacher['姓名'] || expert.teacher.name}</span>
                                                  <span className="text-[9.5px] text-slate-400 font-normal">({expert.province})</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Details matching */}
                                            <div className="space-y-1.5 text-xs">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0">联合体系:</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {matchedStandards.length > 0 ? (
                                                    matchedStandards.map(std => (
                                                      <span key={std} className="bg-emerald-50 text-emerald-700 text-[9.5px] border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                                        ✓ {std}
                                                      </span>
                                                    ))
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px]">无匹配</span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="flex items-start gap-2">
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0 mt-0.5">专家支持代码:</span>
                                                <div className="flex flex-wrap gap-1 max-h-[44px] overflow-y-auto custom-scrollbar">
                                                  {matchedCodes.length > 0 ? (
                                                    matchedCodes.map((mc, ci) => (
                                                      <span 
                                                        key={ci} 
                                                        className={cn(
                                                          "text-[9.5px] px-1.5 py-0.2 rounded font-bold border",
                                                          mc.isPartial 
                                                            ? "bg-amber-50/50 text-amber-700 border-amber-200" 
                                                            : "bg-blue-50 text-blue-700 border-blue-200"
                                                        )}
                                                      >
                                                        ✓ {mc.code}{mc.isPartial && ' (部分)'}
                                                      </span>
                                                    ))
                                                  ) : (
                                                    <span className="text-slate-400 text-[10px]">无代码覆盖</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                                                <span>专家专业代码覆盖度</span>
                                                <span className="font-mono text-blue-600 font-extrabold">{expert.coveragePct}%</span>
                                              </div>
                                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                  className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    expert.coveragePct >= 80 ? "bg-emerald-500" :
                                                    expert.coveragePct >= 50 ? "bg-blue-500" :
                                                    "bg-amber-500"
                                                  )}
                                                  style={{ width: `${Math.min(expert.coveragePct, 100)}%` }}
                                                />
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                              <span className="text-[10px] text-slate-400 font-bold font-mono">
                                                综合评分: {score}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Group by Same Type Code Requirement */}
                  {activeAnalysisMode === 2 && (
                    <div className="space-y-4">
                      {/* Explanatory notes */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-[13px]">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>同类型代码需求智能聚类已完成！</span>
                        </div>
                        <p className="opacity-90 leading-relaxed text-[11px]">
                          系统已根据项目专业代码的 <b>相似度 (前缀匹配)</b> 对项目进行分类分组，并按照 <b>待派人 → 待评审 → 监督</b> 的顺序在各分组内进行了重排。
                        </p>
                      </div>

                      {/* Search box within codes */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="过滤代码、分类名称、企业名称或体系标准..."
                          value={codeFilter}
                          onChange={(e) => setCodeFilter(e.target.value)}
                          className="flex-1 text-xs outline-none bg-transparent"
                        />
                        {codeFilter && (
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => setCodeFilter('')}
                            className="h-5 text-slate-400 hover:text-slate-600 text-[10px] px-1"
                          >
                            清空
                          </Button>
                        )}
                      </div>

                      {parsedRecords.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-xs">暂无导入的企业项目数据，请返回主页上传文件或一键载入测试数据。</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredProjectCodeGroups.map((g, i) => {
                            const waitingDispatch = g.records.filter(r => r.projectStatus?.includes('待派人') || r.projectStatus?.includes('待派')).length;
                            const waitingReview = g.records.filter(r => r.projectStatus?.includes('待评审') || r.projectStatus?.includes('评审') || r.projectStatus?.includes('待审核') || r.projectStatus?.includes('审核')).length;
                            const supervision = g.records.filter(r => r.projectStatus?.includes('监督')).length;

                            return (
                              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 hover:border-blue-200 transition-all">
                                {/* Group Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-white font-mono font-black text-[11px] px-2.5 py-1 rounded-lg shadow-xs",
                                      g.system === 'QMS' ? "bg-blue-600" :
                                      g.system === 'EMS' ? "bg-emerald-600" :
                                      g.system === 'OHSMS' ? "bg-purple-600" :
                                      "bg-indigo-600"
                                    )}>
                                      {g.code}
                                    </span>
                                    <span className="font-bold text-slate-800 text-xs">
                                      {g.label ? `${g.label} 相关项目` : '相似专业代码项目组'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      共 <b className="text-blue-600 font-mono text-xs">{g.records.length}</b> 项
                                    </span>
                                    <span className="text-[10px] text-slate-300">|</span>
                                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                                      待派人 {waitingDispatch}
                                    </span>
                                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                      待评审 {waitingReview}
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-bold bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                                      监督 {supervision}
                                    </span>
                                  </div>
                                </div>

                                {/* Projects List within this code group */}
                                <div className="grid grid-cols-1 gap-2 pl-1">
                                  {g.records.map((rec, rIdx) => (
                                    <div 
                                      key={rec.id} 
                                      className="bg-slate-50/70 hover:bg-slate-50 border border-slate-100 hover:border-blue-200 rounded-lg p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all relative overflow-hidden group"
                                    >
                                      {/* Rank badge */}
                                      <div className="absolute top-0 right-0 bg-blue-50/80 group-hover:bg-blue-100/80 text-[9px] font-mono font-extrabold text-blue-600 px-1.5 py-0.5 rounded-bl">
                                        组内排序 #{rIdx + 1}
                                      </div>

                                      <div className="flex-1 space-y-1.5">
                                        <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                                          <span className="text-xs font-extrabold text-slate-800">
                                            {rec.orgName}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium">
                                            ({rec.province}) {rec.opsAddress || rec.regAddress}
                                          </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500 font-bold">体系标准:</span>
                                            {renderStandards(rec.standard)}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500 font-bold">专业代码:</span>
                                            {renderProfCodes(rec.profCode)}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-500 font-bold">总人日:</span>
                                            <span className="font-mono text-[10px] text-slate-700 font-extrabold">{rec.totalMandays} 人日</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="shrink-0 flex items-center gap-3">
                                        <div className="text-right">
                                          <div className="text-[10px] text-slate-400 font-medium">合同编号</div>
                                          <div className="font-mono text-[10.5px] font-bold text-slate-700">
                                            {rec.contractNo ? rec.contractNo.split(' ')[0] : '-'}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-[10px] text-slate-400 font-medium mb-0.5">项目状态</div>
                                          <span className={cn(
                                            "px-1.5 py-0.2 rounded text-[9.5px] font-bold border inline-block",
                                            rec.projectStatus?.includes('待派人') || rec.projectStatus?.includes('待派') ? "bg-amber-50 text-amber-700 border-amber-100" :
                                            rec.projectStatus?.includes('待审核') || rec.projectStatus?.includes('审核') || rec.projectStatus?.includes('评审') ? "bg-blue-50 text-blue-700 border-blue-100" :
                                            rec.projectStatus?.includes('监督') ? "bg-purple-50 text-purple-700 border-purple-100" :
                                            rec.projectStatus?.includes('完成') || rec.projectStatus?.includes('已') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                            "bg-slate-50 text-slate-600 border-slate-200"
                                          )}>
                                            {rec.projectStatus || '待派人'}
                                          </span>
                                        </div>
                                        <Button 
                                          size="xs" 
                                          variant="outline" 
                                          className="h-7 text-[10px] border-slate-200 text-slate-600 hover:bg-slate-100"
                                          onClick={() => {
                                            setEnterpriseAddress(rec.opsAddress || rec.regAddress || '');
                                            if (rec.standard) setEnterpriseType(rec.standard.split(/[,\s/+]+/)[0] || 'QMS');
                                            setSelectedProject(rec);
                                            setActiveAnalysisMode(3);
                                          }}
                                        >
                                          📍 匹配老师
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded"
                                          onClick={() => handleDeleteRecord(rec.id)}
                                          title="删除该项目"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 3: Query Teachers Near Enterprise */}
                  {activeAnalysisMode === 3 && (
                    <div className="space-y-4">
                      {(matchedEnterprise || selectedProject) && (
                        <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100 rounded-xl p-3.5 space-y-2 relative overflow-hidden shadow-2xs animate-fade-in">
                          <div className="absolute top-0 right-0 bg-emerald-600/10 text-emerald-700 text-[9px] font-mono font-extrabold px-2.5 py-0.5 rounded-bl flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600 animate-pulse" /> 智能匹配企业成功
                          </div>
                          <div className="flex items-center gap-2 pr-28">
                            <span className="font-bold text-slate-800 text-xs">
                              正在为企业【{matchedEnterprise ? matchedEnterprise.orgName : selectedProject!.orgName}】匹配就近且资质、体系匹配的审核老师：
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded"
                              onClick={() => {
                                const id = matchedEnterprise ? matchedEnterprise.id : selectedProject!.id;
                                handleDeleteRecord(id);
                              }}
                              title="删除该项目"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                            <div>
                              <span className="text-slate-400 font-medium">体系标准:</span>{" "}
                              <span className="font-semibold text-slate-800">
                                {matchedEnterprise ? matchedEnterprise.standard : selectedProject!.standard}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">专业代码:</span>{" "}
                              <span className="font-semibold font-mono text-slate-800">
                                {matchedEnterprise ? (matchedEnterprise.profCode || '无') : (selectedProject!.profCode || '无')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">总人日:</span>{" "}
                              <span className="font-semibold font-mono text-slate-800">
                                {matchedEnterprise ? matchedEnterprise.totalMandays : selectedProject!.totalMandays} 人日
                              </span>
                            </div>
                            <div className="md:col-span-3">
                              <span className="text-slate-400 font-medium">企业匹配地址:</span>{" "}
                              <span className="font-semibold text-emerald-700">
                                {matchedEnterprise 
                                  ? `${matchedEnterprise.opsAddress || matchedEnterprise.regAddress} (智能提取经营/注册地址)`
                                  : enterpriseAddress}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          企业名称或地址搜索（输入企业名称可自动匹配经营地址与代码）
                        </h4>
                        
                        <div className="flex flex-col md:flex-row gap-3">
                          <input 
                            type="text" 
                            placeholder="输入企业名称(如：双力重工)或某个详细地址..."
                            value={enterpriseAddress}
                            onChange={(e) => setEnterpriseAddress(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <Button 
                            className="bg-blue-600 text-white font-bold h-9 text-xs"
                            onClick={() => {
                              // Reset or refresh near search
                            }}
                          >
                            分析就近老师
                          </Button>
                        </div>
                        
                        {matchedEnterprise && (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50/60 px-3 py-2 rounded-md flex items-center gap-2 border border-emerald-100 shadow-3xs">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              系统已自动关联库内企业 <b>【{matchedEnterprise.orgName}】</b>，自动采用其经营/注册地址（<b>{matchedEnterprise.opsAddress || matchedEnterprise.regAddress || '未填'}</b>）进行测算，并<b>优先推荐体系和代码相符</b>的就近老师！
                            </span>
                          </div>
                        )}

                        {!matchedEnterprise && uploadedFiles.length > 0 && (
                          <div className="text-[11px] text-green-700 bg-green-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-green-100">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>成功从上传的文件 <b>{uploadedFiles[0].name}</b> 中智能定位并提取企业通讯地址：<b>{enterpriseAddress}</b></span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-slate-500 flex items-center justify-between px-1 flex-wrap gap-2">
                          <span className="flex items-center gap-1">
                            🔍 匹配推荐审核老师清单：
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-extrabold">
                              体系与专业代码全匹配优先
                            </span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">优先推荐资质且代码匹配的老师，按距离由近及远排序</span>
                        </div>
                        {nearestTeachers.map((item, i) => {
                          const t = item.teacher;
                          const jobType = String(t['专兼职'] || t.jobType || t.job_type || t.JobType || '').trim();
                          const isFullTime = jobType.includes('专职') || jobType.includes('专审') || jobType.includes('专兼');
                          const displayJobType = jobType || '兼职';
                          const qualification = String(t['注册资格'] || t['资质级别'] || t.qualification || t.Qualification || '').trim();
                          const isExpert = qualification.includes('专家') || qualification.includes('技术专家') || qualification.includes('评估员');
                          const isPartTimeExpert = !isFullTime && isExpert;

                          return (
                            <div key={i} className={cn(
                              "bg-white border rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs transition-all",
                              isPartTimeExpert ? "border-amber-200 bg-amber-50/5" : "border-slate-200"
                            )}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs font-mono">
                                  {i + 1}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs">{item.teacher['姓名']}</span>
                                    <span className={cn(
                                      "px-1.5 py-0.2 rounded text-[9px] font-bold font-mono border",
                                      item.score === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      item.score === 70 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                      "bg-slate-50 text-slate-500 border-slate-200"
                                    )}>
                                      {item.proximityDesc}
                                    </span>

                                    {/* Full-time / Part-time clear badges */}
                                    <span className={cn(
                                      "text-[9px] font-bold px-1 py-0.2 rounded border shadow-3xs font-sans shrink-0",
                                      isFullTime 
                                        ? "bg-blue-50/60 text-blue-700 border-blue-200/50" 
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                    )}>
                                      {displayJobType}
                                    </span>

                                    {/* Technical Expert label for part-time experts */}
                                    {isPartTimeExpert && (
                                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-extrabold px-1 rounded shadow-3xs shrink-0 flex items-center gap-0.5">
                                        技术专家
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5 max-w-[280px] truncate" title={item.teacher['通讯地址']}>
                                    地址: {item.teacher['通讯地址'] || '未填'}
                                  </div>

                                  {/* Score breakdown tags */}
                                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-[450px]">
                                    <span className="text-[8.5px] bg-slate-50 text-slate-500 px-1.5 py-0.2 rounded font-sans border border-slate-100">
                                      距离分: {item.proximityScore}
                                    </span>
                                    <span className={cn(
                                      "text-[8.5px] px-1.5 py-0.2 rounded font-sans border",
                                      item.systemScore > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                    )}>
                                      体系分: {item.systemScore}
                                    </span>
                                    <span className={cn(
                                      "text-[8.5px] px-1.5 py-0.2 rounded font-sans border",
                                      item.codeScore > 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                    )}>
                                      代码分: {item.codeScore}
                                    </span>

                                    {item.matchedExactCodes.map((code, idx) => (
                                      <span key={idx} className="text-[8.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-sans border border-indigo-100 font-bold">
                                        ✓ 代码全配: {code}
                                      </span>
                                    ))}

                                    {item.matchedPrefixCodes.map((code, idx) => (
                                      <span key={idx} className="text-[8.5px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-sans border border-amber-100">
                                        ~ 相似代码: {code}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[10px] font-mono font-bold text-slate-600">
                                  匹配度: <span className="text-blue-600 font-black">{item.score}分</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  省份: {item.province} | 城市: {item.city}
                                </div>
                              </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  {/* Mode 4: Query Nearby Same-type Projects Near Enterprise */}
                  {activeAnalysisMode === 4 && (
                    <div className="space-y-4">
                      {/* Search Input and Selector */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          企业项目检索与智能对齐分析
                        </h4>
                        
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          输入企业名称，系统将自动从历史或已导入的<b>企业文件库</b>中提取该企业的认证体系标准及专业代码，并智能匹配全国其他具有<b>同类型体系</b>的项目，计算地理距离与专业代码所属范围的<b>重合度</b>排序。
                        </p>

                        <div className="space-y-2.5">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="text" 
                                placeholder="输入您想分析的企业名称 (如：双力重工、浩华精密)..."
                                value={nearbyProjEnterpriseQuery}
                                onChange={(e) => setNearbyProjEnterpriseQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            {nearbyProjEnterpriseQuery && (
                              <button 
                                onClick={() => setNearbyProjEnterpriseQuery('')}
                                className="px-2 text-xs text-slate-400 hover:text-slate-600 font-bold hover:underline"
                              >
                                清空
                              </button>
                            )}
                          </div>

                          {/* Quick selection tags */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-0.5">
                            <span>点击快速测试:</span>
                            {[
                              { label: '双力重工', value: '山东双力重工股份有限公司' },
                              { label: '浩华精密', value: '苏州浩华精密电子科技有限公司' },
                              { label: '科创源数字', value: '深圳科创源数字能源技术服务有限公司' },
                              { label: '佳源塑胶', value: '宁波佳源塑胶制品有限公司' }
                            ].map((tag) => (
                              <button
                                key={tag.value}
                                onClick={() => setNearbyProjEnterpriseQuery(tag.value)}
                                className={cn(
                                  "px-2 py-0.5 rounded border transition-all",
                                  nearbyProjEnterpriseQuery === tag.value 
                                    ? "bg-blue-50 text-blue-700 border-blue-200 font-bold" 
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                {tag.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Matched target enterprise card */}
                      {targetEnterpriseForNearbyProj ? (
                        <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-2xs animate-fade-in">
                          <div className="absolute top-0 right-0 bg-indigo-600/10 text-indigo-700 text-[9px] font-mono font-extrabold px-3 py-0.5 rounded-bl">
                            测算目标基准企业
                          </div>
                          <div className="flex items-center gap-2 pr-28">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-800 text-xs">
                              【{targetEnterpriseForNearbyProj.orgName}】代码与需求档案：
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded"
                              onClick={() => handleDeleteRecord(targetEnterpriseForNearbyProj.id)}
                              title="删除该项目"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/30">
                              <span className="text-slate-400 font-medium block mb-0.5">申请认证体系</span>
                              <span className="font-bold text-indigo-700">{targetEnterpriseForNearbyProj.standard || '未填'}</span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/30 md:col-span-1">
                              <span className="text-slate-400 font-medium block mb-0.5">专业代码</span>
                              <span className="font-bold font-mono text-indigo-800 truncate block" title={targetEnterpriseForNearbyProj.profCode}>
                                {targetEnterpriseForNearbyProj.profCode || '无'}
                              </span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/30">
                              <span className="text-slate-400 font-medium block mb-0.5">所属地域</span>
                              <span className="font-bold text-slate-800">
                                {targetEnterpriseForNearbyProj.province || '未知'} 省
                              </span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-lg border border-indigo-100/30">
                              <span className="text-slate-400 font-medium block mb-0.5">经营/通讯地址</span>
                              <span className="font-bold text-slate-800 truncate block" title={targetEnterpriseForNearbyProj.opsAddress || targetEnterpriseForNearbyProj.regAddress}>
                                {targetEnterpriseForNearbyProj.opsAddress || targetEnterpriseForNearbyProj.regAddress || '未填'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 text-center text-xs text-amber-700 font-medium">
                          ⚠️ 暂无完美匹配的库内申请企业。请输入或者在上方点击预置企业名称，开启智能同类型排程合并分析。
                        </div>
                      )}

                      {/* Matching same-type projects list */}
                      {targetEnterpriseForNearbyProj && (
                        <div className="space-y-2.5">
                          <div className="text-xs font-bold text-slate-500 flex items-center justify-between px-1 flex-wrap gap-2">
                            <span className="flex items-center gap-1.5">
                              🏢 库内同类型认证体系项目列表：
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-extrabold animate-pulse">
                                按专业代码重合度降序 / 距离升序
                              </span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              共检索到 {simulatedNearbyProjects.length} 个同类型申请企业
                            </span>
                          </div>

                          {simulatedNearbyProjects.length === 0 ? (
                            <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-xs text-slate-400 font-medium">
                              没有在库内找到具有相同认证体系(如 {targetEnterpriseForNearbyProj?.standard}) 的其他企业项目。
                            </div>
                          ) : (
                            simulatedNearbyProjects.map((proj, idx) => {
                              const pct = proj.overlapPercentage;
                              const overlapBadgeStyle = 
                                pct >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                pct >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-slate-50 text-slate-500 border-slate-200";

                              return (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-300 transition-all shadow-2xs relative overflow-hidden">
                                  {/* Rank Badge */}
                                  <div className="absolute top-0 left-0 bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.2 rounded-br font-mono font-bold">
                                    #{idx + 1}
                                  </div>
                                  
                                  <div className="space-y-1.5 pl-2">
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                      <span className="font-extrabold text-slate-800 text-xs">{proj.name}</span>
                                      
                                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-100 flex items-center gap-1">
                                        <Award className="w-3 h-3 text-blue-500" />
                                        {proj.system}
                                      </span>

                                      {proj.record?.projectStatus && (
                                        <span className={cn(
                                          "px-1.5 py-0.2 rounded text-[9px] font-bold border",
                                          proj.record.projectStatus.includes('待派人') || proj.record.projectStatus.includes('待派') ? "bg-amber-50 text-amber-700 border-amber-100" :
                                          proj.record.projectStatus.includes('待审核') || proj.record.projectStatus.includes('审核') ? "bg-blue-50 text-blue-700 border-blue-100" :
                                          proj.record.projectStatus.includes('完成') || proj.record.projectStatus.includes('已') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                          "bg-slate-50 text-slate-600 border-slate-200"
                                        )}>
                                          项目状态: {proj.record.projectStatus}
                                        </span>
                                      )}

                                      {proj.hasRequiredCodes && (
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded border", overlapBadgeStyle)}>
                                          代码重合度: {pct}%
                                        </span>
                                      )}

                                      <span className={cn(
                                        "text-[9px] font-bold px-1 py-0.2 rounded border",
                                        proj.distInfo.proximityLevel === '同城极近' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        proj.distInfo.proximityLevel === '同省邻近' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                        "bg-slate-50 text-slate-500 border-slate-200"
                                      )}>
                                        {proj.distInfo.proximityLevel}
                                      </span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 font-medium">
                                      <span className="text-slate-400">项目代码:</span> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[9.5px]">{proj.code}</code>
                                      <span className="mx-2 text-slate-300">|</span>
                                      <span className="text-slate-400">参考地址:</span> <span className="text-slate-700">{proj.address}</span>
                                    </div>

                                    {/* Code Overlap Details */}
                                    {proj.matchedCodes && proj.matchedCodes.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 pt-1">
                                        <span className="text-[9px] text-slate-400 self-center font-medium">重合明细:</span>
                                        {proj.matchedCodes.map((codeStr: string, cIdx: number) => (
                                          <span key={cIdx} className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[8.5px] px-1.5 rounded-sm font-sans">
                                            {codeStr}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[9px] text-slate-400 font-medium pt-1">
                                        ⚠️ 专业代码不重合（未匹配到相同二级或大类代码范围）
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right flex md:flex-col items-center md:items-end justify-between shrink-0 gap-1.5 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                                    <div>
                                      <div className="text-xs font-mono font-bold text-emerald-600 flex items-center justify-end gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                        距基准企业: {proj.distance}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        估算工作量: <span className="font-mono text-slate-600 font-bold">{proj.auditDays}人日</span>
                                      </div>
                                    </div>

                                    {/* Pack recommendations */}
                                    {pct >= 40 && (proj.distInfo.proximityLevel === '同城极近' || proj.distInfo.proximityLevel === '同省邻近') && (
                                      <div className="bg-amber-50 text-amber-800 text-[9px] px-2 py-0.5 rounded border border-amber-100 shadow-3xs font-medium flex items-center gap-1 mt-0.5">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                        建议联合派员/合并行程
                                      </div>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="h-6 w-6 p-0 mt-1 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded self-end"
                                      onClick={() => handleDeleteRecord(proj.id)}
                                      title="删除该项目"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 5: Query Auditable Projects Near Teacher */}
                  {activeAnalysisMode === 5 && (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-600" />
                          选择审核员进行项目匹配分析
                        </h4>
                        
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="输入或筛选审核老师姓名/资质/省份 (如: 蒋锐新、QMS)..."
                                value={teacherSearchQuery}
                                onChange={(e) => {
                                  setTeacherSearchQuery(e.target.value);
                                  setIsTeacherDropdownOpen(true);
                                  if (!e.target.value) {
                                    setSelectedTeacherName('');
                                  }
                                }}
                                onFocus={() => setIsTeacherDropdownOpen(true)}
                                onBlur={() => {
                                  setTimeout(() => setIsTeacherDropdownOpen(false), 250);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
                                {teacherSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTeacherSearchQuery('');
                                      setSelectedTeacherName('');
                                    }}
                                    className="hover:text-slate-600 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <ChevronDown className="w-3.5 h-3.5 pointer-events-none" />
                              </div>
                            </div>

                            {/* Dropdown list */}
                            {isTeacherDropdownOpen && (
                              <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 animate-fade-in divide-y divide-slate-100">
                                {filteredTeachers.length === 0 ? (
                                  <div className="p-3 text-center text-xs text-slate-400 font-medium">
                                    没有找到匹配的审核老师
                                  </div>
                                ) : (
                                  filteredTeachers.slice(0, 100).map((t, i) => {
                                    const name = t['姓名'];
                                    const quals = getQualifications(t['专业类别'] || t['注册资质'] || t['注册资格'] || '').join('/') || '兼职';
                                    const area = t['通讯地址'] || t['省份'] || '未知区域';
                                    const isSelected = name === selectedTeacherName;

                                    return (
                                      <div
                                        key={i}
                                        onClick={() => {
                                          setSelectedTeacherName(name);
                                          setTeacherSearchQuery(name);
                                          setIsTeacherDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "p-2.5 text-xs cursor-pointer flex flex-col gap-0.5 transition-colors text-left",
                                          isSelected 
                                            ? "bg-blue-50 hover:bg-blue-100" 
                                            : "hover:bg-slate-50"
                                        )}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className={cn("font-bold", isSelected ? "text-blue-700" : "text-slate-800")}>
                                            {name}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {area}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate" title={t['专业类别'] || ''}>
                                          资质: <span className="text-slate-700 font-sans">{quals}</span>
                                          {t['专业类别'] && (
                                            <span className="text-slate-400 ml-1.5 font-mono">({t['专业类别']})</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                                {filteredTeachers.length > 100 && (
                                  <div className="p-1.5 text-center text-[9px] bg-slate-50 text-slate-400 font-mono">
                                    -- 仅显示前 100 条匹配结果，请细化输入进行筛选 --
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <Button 
                            className="bg-blue-600 text-white font-bold h-9 text-xs"
                            disabled={!selectedTeacherName}
                            onClick={() => {}}
                          >
                            运行匹配引擎
                          </Button>
                        </div>

                        {selectedTeacher && (
                          <div className="bg-blue-50/50 p-3 rounded-lg text-xs border border-blue-100 space-y-1.5">
                            <div className="font-bold text-blue-900 flex items-center justify-between">
                              <span>审核员：{selectedTeacher['姓名']}</span>
                              <span className="font-mono text-[10px] bg-blue-100 px-1.5 rounded">{selectedTeacher['专兼职'] || '专职'}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 break-all font-mono">
                              <b>专业资质:</b> {selectedTeacher['专业类别'] || '无'}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              <b>所在地区:</b> {selectedTeacher['通讯地址'] || '未填'}
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedTeacher ? (
                        <div className="space-y-2.5">
                          <div className="text-xs font-bold text-slate-500 flex items-center justify-between px-1">
                            <span>📋 适合该老师执业的可审核项目：</span>
                            <span className="font-mono text-[10px]">综合考量省份就近与代码资质对齐</span>
                          </div>

                          {teacherAvailableProjects.length === 0 ? (
                            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                              ⚠️ 暂未匹配到符合资质覆盖或在附近的审核项目。若文件库为空，请先在“文档上传区”上传最新的项目排程表。
                            </div>
                          ) : (
                            teacherAvailableProjects.map((proj, idx) => {
                              const pct = proj.overlapPercentage;
                              const overlapBadgeStyle = 
                                pct >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                pct >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-slate-50 text-slate-500 border-slate-200";

                              return (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-300 transition-all shadow-2xs relative overflow-hidden">
                                  {/* Rank Badge */}
                                  <div className="absolute top-0 left-0 bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.2 rounded-br font-mono font-bold">
                                    #{idx + 1}
                                  </div>

                                  <div className="space-y-1.5 pl-2">
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                      <span className="font-extrabold text-slate-800 text-xs">{proj.name}</span>
                                      
                                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-100 flex items-center gap-1">
                                        <Award className="w-3 h-3 text-blue-500" />
                                        {proj.system}
                                      </span>

                                      {proj.record?.projectStatus && (
                                        <span className={cn(
                                          "px-1.5 py-0.2 rounded text-[9px] font-bold border",
                                          proj.record.projectStatus.includes('待派人') || proj.record.projectStatus.includes('待派') ? "bg-amber-50 text-amber-700 border-amber-100" :
                                          proj.record.projectStatus.includes('待审核') || proj.record.projectStatus.includes('审核') ? "bg-blue-50 text-blue-700 border-blue-100" :
                                          proj.record.projectStatus.includes('完成') || proj.record.projectStatus.includes('已') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                          "bg-slate-50 text-slate-600 border-slate-200"
                                        )}>
                                          项目状态: {proj.record.projectStatus}
                                        </span>
                                      )}

                                      {proj.hasRequiredCodes && (
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded border", overlapBadgeStyle)}>
                                          代码覆盖率: {pct}%
                                        </span>
                                      )}

                                      <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                                        proj.distInfo.proximityLevel === '同城极近' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        proj.distInfo.proximityLevel === '同省邻近' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                        "bg-slate-50 text-slate-500 border-slate-200"
                                      )}>
                                        {proj.distInfo.proximityLevel}
                                      </span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 font-medium">
                                      <span className="text-slate-400">项目专业代码:</span> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[9.5px]">{proj.code}</code>
                                      <span className="mx-2 text-slate-300">|</span>
                                      <span className="text-slate-400">参考地址:</span> <span className="text-slate-700">{proj.address}</span>
                                    </div>

                                    {/* Code Overlap Details */}
                                    {proj.matchedCodes && proj.matchedCodes.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 pt-1">
                                        <span className="text-[9px] text-slate-400 self-center font-medium">代码覆盖明细:</span>
                                        {proj.matchedCodes.map((codeStr: string, cIdx: number) => (
                                          <span key={cIdx} className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[8.5px] px-1.5 rounded-sm font-sans">
                                            {codeStr}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[9px] text-slate-400 font-medium pt-1">
                                        ⚠️ 专业代码不重合（未匹配到相同二级或大类代码范围）
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right flex md:flex-col items-center md:items-end justify-between shrink-0 gap-1.5 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                                    <div>
                                      <div className="text-xs font-mono font-bold text-emerald-600 flex items-center justify-end gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                                        估算距离: {proj.distance}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        建议审核天数: <span className="font-mono text-slate-600 font-bold">{proj.auditDays}天</span>
                                      </div>
                                    </div>

                                    {/* Proximity / Code match recommendation */}
                                    {pct >= 40 && (proj.distInfo.proximityLevel === '同城极近' || proj.distInfo.proximityLevel === '同省邻近') && (
                                      <div className="bg-amber-50 text-amber-800 text-[9px] px-2 py-0.5 rounded border border-amber-100 shadow-3xs font-medium flex items-center gap-1 mt-0.5">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                                        省市极近 & 资质完美覆盖
                                      </div>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      className="h-6 w-6 p-0 mt-1 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded self-end"
                                      onClick={() => handleDeleteRecord(proj.id)}
                                      title="删除该项目"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-100/50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
                          请在上方下拉菜单中选择一位注册审核员，开始模拟匹配最近的合适项目。
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>

          {/* 集中式代码识别与共享对账文档 Modal */}
          {showReconciliationModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-500 rounded-lg text-white">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        集中式代码识别与共享对账文档
                        <span className="text-[10px] bg-slate-800 text-blue-400 font-mono border border-blue-500/30 rounded px-1.5 py-0.5">
                          📁 /src/data/auto_matched_codes.json
                        </span>
                      </h3>
                      <p className="text-[10.5px] text-slate-400 font-medium">统一代码解析服务・去大模型冗余Token消耗・跨业务模块可读</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowReconciliationModal(false)}
                    className="text-slate-400 hover:text-white transition-colors text-lg font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
                  {/* Left Column: Visual List */}
                  <div className="lg:col-span-7 p-4 flex flex-col min-h-0 border-r border-slate-100 bg-slate-50/50">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span>对账单实体条目 (仅展示自动识别或缺失专业代码的项目)</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                        共 {parsedRecords.filter(r => r.isAutoMatched || !r.profCode).length} 个记录
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-3xs custom-scrollbar">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 text-slate-600 font-bold">
                          <tr>
                            <th className="p-2.5 w-10 text-center">#</th>
                            <th className="p-2.5 w-32">企业全称</th>
                            <th className="p-2.5">识别状态与匹配代码</th>
                            <th className="p-2.5 w-24 text-center">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {parsedRecords
                            .filter(r => r.isAutoMatched || !r.profCode)
                            .map((r, i) => (
                              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{i + 1}</td>
                                <td className="p-2.5 font-bold text-slate-800">
                                  <div className="truncate max-w-[140px]" title={r.orgName}>{r.orgName}</div>
                                  <div className="text-[9.5px] text-slate-400 truncate max-w-[140px]" title={r.appScope}>
                                    范围: {r.appScope}
                                  </div>
                                </td>
                                <td className="p-2.5 space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {r.profCode ? (
                                      renderProfCodes(r.profCode)
                                    ) : (
                                      <span className="text-red-500 font-bold">⚠️ 暂无代码</span>
                                    )}
                                    {r.isAutoMatched && !confirmedMatchIds.includes(r.id) && (
                                      <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 px-1 rounded font-bold">🤖 自动匹配</span>
                                    )}
                                    {r.isAutoMatched && confirmedMatchIds.includes(r.id) && (
                                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded font-bold">✓ 已核实</span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-slate-400 italic">
                                    依据: {r.matchReason || "尚未启动自动识别"}
                                  </div>
                                </td>
                                <td className="p-2.5 text-center flex justify-center items-center gap-2">
                                  {r.isAutoMatched && !confirmedMatchIds.includes(r.id) ? (
                                    <button
                                      onClick={() => handleConfirmAutoMatch(r.id)}
                                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                                    >
                                      核实确认
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-[10px] font-mono">OK</span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    className="h-5 w-5 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded"
                                    onClick={() => handleDeleteRecord(r.id)}
                                    title="删除该项目"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Code JSON Representation */}
                  <div className="lg:col-span-5 p-4 flex flex-col min-h-0 bg-slate-900 text-slate-100">
                    <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                      <span>实时生成的 JSON 配置文件 (共享文档)</span>
                      <button
                        onClick={() => {
                          const safeAlert = (msg: string) => {
                            try { alert(msg); } catch (e) { console.log(msg); }
                          };
                          const copyToClipboard = (text: string) => {
                            try {
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(text).then(() => {
                                  safeAlert("对账配置文件已成功复制到剪贴板！");
                                }).catch(() => {
                                  fallback(text);
                                });
                              } else {
                                fallback(text);
                              }
                            } catch (e) {
                              fallback(text);
                            }
                          };
                          const fallback = (text: string) => {
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
                                safeAlert("对账配置文件已成功复制到剪贴板！");
                              } else {
                                safeAlert("复制失败，请手动选择复制。");
                              }
                            } catch (err) {
                              safeAlert("复制失败，请手动选择复制。");
                            }
                          };
                          copyToClipboard(virtualReconciliationJSON);
                        }}
                        className="text-[10.5px] text-blue-400 hover:text-blue-300 font-bold hover:underline shrink-0"
                      >
                        复制 JSON
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] leading-relaxed text-slate-300 custom-scrollbar select-all">
                      <pre>{virtualReconciliationJSON}</pre>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 text-[11.5px]">
                  <div className="text-slate-500 font-medium">
                    💰 运行本对账机制预计已为您节省 <b>{(parsedRecords.filter(r => r.isAutoMatched).length * 1500).toLocaleString()}</b> API Tokens 消耗费用！
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-slate-800 hover:bg-slate-700 text-white font-bold h-8 text-xs"
                      onClick={() => setShowReconciliationModal(false)}
                    >
                      关闭对账窗口
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Delete Confirmation Modal */}
          {deleteRecordId && recordBeingDeleted && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" id="delete-confirmation-modal">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-2 w-full">
                      <h3 className="text-base font-bold text-slate-900">确认从工作台中删除此项目？</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        您确定要从当前工作台中彻底删除以下企业排程项目记录吗？删除后该记录将不可恢复：
                      </p>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium text-slate-800 text-xs">
                        <div className="font-bold mb-1 text-slate-900">{recordBeingDeleted.orgName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">合同编号: {recordBeingDeleted.contractNo || '暂无'}</div>
                        <div className="text-[10.5px] text-indigo-600 mt-1 font-bold">申请标准: {recordBeingDeleted.standard}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    className="h-9 px-4 rounded-lg font-bold text-xs text-slate-600 bg-white"
                    onClick={() => setDeleteRecordId(null)}
                    id="btn-cancel-delete"
                  >
                    取消保持
                  </Button>
                  <Button
                    className="h-9 px-5 rounded-lg font-bold text-xs text-white bg-red-600 hover:bg-red-700 shadow-sm"
                    onClick={confirmDeleteRecord}
                    id="btn-confirm-delete"
                  >
                    确认删除
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
