import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Settings,
  Bot,
  User,
  Send,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { cn } from "../lib/utils";
import { searchIndex, categoriesTree } from "../data/categories";
import Fuse from "fuse.js";
import { callAI, getAISettings } from "../services/aiService";
import Markdown from "react-markdown";
import customMappingsRaw from "../data/custom_mappings.json";

// ============================================================================
// @PROTECTED - CORE CLASSIFICATION STRATEGY (AI MATCHING MODULE)
// 
// ATTENTION AI AGENTS & DEVELOPERS:
// The fuzzy search, adjective scoping, and custom mapping logic implemented 
// here has been rigorously calibrated against hundreds of real-world test cases.
// DO NOT refactor, modify, or remove this logic when implementing new features 
// (such as project review modules, UI updates, etc.) unless explicitly instructed 
// by the user to "update the core classification strategy".
// ============================================================================
const customMappings: Record<string, string[]> = customMappingsRaw;

// A flat lookup map for quick, structured lookup of full category items (including description, includes, excludes)
const categoriesTreeNodesMap = new Map<string, any>();
const buildCategoriesTreeNodesMap = (nodes: any[]) => {
  nodes.forEach(node => {
    const code = node.smallId || node.mediumId || node.majorId || "";
    if (code) {
      categoriesTreeNodesMap.set(code, node);
    }
  });
};
buildCategoriesTreeNodesMap(searchIndex || []);

const formatCategoryForAI = (code: string, name: string, textUnitFallback: string): string => {
  const node = categoriesTreeNodesMap.get(code);
  if (!node) {
    // Fallback if not found in categoriesTree
    return `分类代码: ${code}\n官方分类名称: ${name}\n详细说明: ${textUnitFallback.substring(0, 300)}`;
  }

  let formatted = `分类代码: ${code}\n官方分类名称: ${node.name || name}\n`;
  
  // Find ancestors to provide context
  const majorCode = node.majorId || "";
  const mediumCode = node.mediumId || "";
  const majorNode = categoriesTreeNodesMap.get(majorCode);
  const mediumNode = mediumCode ? categoriesTreeNodesMap.get(mediumCode) : null;

  const parentContext = [
    majorNode ? `大类 ${majorCode} [${majorNode.name}]` : "",
    mediumNode ? `中类 ${mediumCode} [${mediumNode.name}]` : ""
  ].filter(Boolean).join(" -> ");

  if (parentContext) {
    formatted += `行业门类/层级关系: ${parentContext}\n`;
  }

  if (node.description) {
    formatted += `业务说明: ${node.description}\n`;
  }

  if (node.includes && node.includes.length > 0) {
    formatted += `【包含的具体业务范围/关键词/产品 (AI重点参考)】:\n`;
    node.includes.forEach((inc: string) => {
      formatted += ` - ${inc}\n`;
    });
  }

  if (node.excludes && node.excludes.length > 0) {
    formatted += `【不包含的具体业务范围/排斥项/见其他分类 (AI重点排查，严禁混淆)】:\n`;
    node.excludes.forEach((exc: string) => {
      formatted += ` - ${exc}\n`;
    });
  }

  return formatted + "\n---";
};

const preprocessMessageContent = (content: string): string => {
  if (!content) return content;

  const masks: string[] = [];
  
  // 1. Mask existing links: [text](href) to avoid double-processing
  let masked = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
    masks.push(match);
    return `__LINK_MASK_${masks.length - 1}__`;
  });

  // 2. Match 6-digit codes: XX.XX.XX (optionally with trailing asterisks/stars, or slashes like /1)
  // Format: \b(\d{2}\.\d{2}\.\d{2}(?:\/\d+)?\*?)\b
  masked = masked.replace(/\b(\d{2}\.\d{2}\.\d{2}(?:\/\d+)?\*?)\b/g, (match, code) => {
    const cleanCode = code.replace(/\*+$/, '').split('/')[0];
    return `[${code}](nav::${cleanCode})`;
  });

  // 4. Restore the masked links in reverse order
  for (let i = masks.length - 1; i >= 0; i--) {
    masked = masked.replace(`__LINK_MASK_${i}__`, masks[i]);
  }

  return masked;
};

const preprocessSearchQuery = (str: string): string => {
  if (!str) return "";
  let s = str.trim();
  
  // 1. Remove parentheses and brackets contents
  s = s.replace(/[（(][^）)]*[）)]/g, "");
  s = s.replace(/[【\[][^】\]]*[】\]]/g, "");
  
  // 2. Remove common business qualifiers and prefixes
  const prefixRegexes = [
    /^许可范围内(的)?/,
    /^资质证书范围内的?/,
    /^依法须经批准的项目?/,
    /^限(仅限)?分支机构经营的?/,
    /^(各类|各种|专业|非|普通|国家级?|高级?|新型?|智能型?|绿色|环保型?|定制化?|特种|主要经营)/
  ];
  for (const regex of prefixRegexes) {
    s = s.replace(regex, "");
  }
  
  // 3. Remove voltage, physical specs, models, etc. (e.g. 110kV, 35kV及以下)
  s = s.replace(/\b\d+(?:kV|kv|V|A|W|kW|kw|Hz|MHz|G|g|dB|mm|cm|m|v|a|w|V|A|W|伏|瓦|安|赫兹)(?:及?以下|及?以上)?/gi, "");
  
  // 4. Clean Chinese specific trailing noises from the core nouns (e.g., "及以下", "及以上", "等")
  s = s.replace(/(?:及?以下|及?以上|等)/g, "");
  
  return s.replace(/\s+/g, " ").trim();
};

interface AIPanelProps {
  onClose: () => void;
  onNavigate?: (code: string) => void;
}

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  isError?: boolean;
  thinking?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface AISettings {
  provider: "gemini" | "openai";
  modelName: string;
  apiKey: string;
  proxyUrl: string;
  useInternalProxy: boolean;
  isDebug: boolean;
}

interface CacheEntry {
  query: string;
  response: string;
  timestamp: number;
}

const CACHE_KEY = "certMatch_ai_cache_v2";
const SETTINGS_KEY = "certMatch_ai_settings_v2";
const CONFIG_HISTORY_KEY = "certMatch_ai_history_v2";

interface SearchMatch {
  item: any;
  score: number;
  reason: string;
  isExpert?: boolean;
}

export default function AIPanel({ onClose, onNavigate }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "您好！我是AI智能匹配助手。您可以直接输入行业关键词、描述或是体系代码，我将为您高速精准匹配《管理体系认证业务范围分类内容说明》中的标准分类。",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [currentStrategy, setCurrentStrategy] = useState<"A" | "B" | "C">(() => {
    try {
      const saved = localStorage.getItem("certMatch_ai_strategy");
      if (saved === "A" || saved === "B" || saved === "C") return saved;
    } catch {}
    return "A";
  });

  const [activeStrategyInfo, setActiveStrategyInfo] = useState<"A" | "B" | "C" | null>(null);

  const handleStrategyChange = (strategy: "A" | "B" | "C") => {
    setCurrentStrategy(strategy);
    try {
      localStorage.setItem("certMatch_ai_strategy", strategy);
    } catch {}
  };

  const [settings, setSettings] = useState<AISettings>(() => {
    const s = getAISettings();
    return {
      provider: s.provider,
      modelName: s.modelName,
      apiKey: s.apiKey,
      proxyUrl: s.proxyUrl,
      useInternalProxy: s.useInternalProxy,
      isDebug: s.isDebug,
    };
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<Fuse<any> | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const s = getAISettings();
      setSettings((prev) => {
        if (
          prev.provider === s.provider &&
          prev.modelName === s.modelName &&
          prev.apiKey === s.apiKey &&
          prev.proxyUrl === s.proxyUrl &&
          prev.useInternalProxy === s.useInternalProxy &&
          prev.isDebug === s.isDebug
        ) {
          return prev;
        }
        return {
          provider: s.provider,
          modelName: s.modelName,
          apiKey: s.apiKey,
          proxyUrl: s.proxyUrl,
          useInternalProxy: s.useInternalProxy,
          isDebug: s.isDebug,
        };
      });
    };
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages or typing status change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    // Initialize Fuse.js
    const searchData = searchIndex;
    fuseRef.current = new Fuse(searchData, {
      keys: [
        { name: "majorId", weight: 2 },
        { name: "mediumId", weight: 2 },
        { name: "smallId", weight: 2 },
        { name: "name", weight: 3 },
        { name: "text_unit", weight: 1 },
      ],
      includeScore: true,
      threshold: 0.5, // Increase threshold to allow better fuzzy matching for Chinese multi-word queries
      ignoreLocation: true,
      useExtendedSearch: true,
    });
  }, []);

  const saveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const getCachedResponse = (query: string): string | null => {
    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      if (!cacheData) return null;
      let cache: CacheEntry[] = JSON.parse(cacheData);
      const match = cache.find(
        (c) => c.query.toLowerCase() === query.toLowerCase(),
      );
      return match ? match.response : null;
    } catch {
      return null;
    }
  };

  const setCachedResponse = (query: string, response: string) => {
    try {
      const cacheData = localStorage.getItem(CACHE_KEY);
      let cache: CacheEntry[] = cacheData ? JSON.parse(cacheData) : [];
      // Remove existing if any to refresh timestamp
      cache = cache.filter(
        (c) => c.query.toLowerCase() !== query.toLowerCase(),
      );
      cache.unshift({ query, response, timestamp: Date.now() });
      if (cache.length > 100) {
        cache = cache.slice(0, 100);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error("Failed to save to cache", e);
    }
  };

  const formatFullCode = (code: string) => {
    const parts = code.split(".");
    if (parts.length === 1) return `${code}.00.00`;
    if (parts.length === 2) return `${code}.00`;
    return code;
  };

  const getTopLocalMatches = (query: string): SearchMatch[] => {
    if (!fuseRef.current || !query.trim()) return [];

    const items = Array.from(categoriesTreeNodesMap.values());
    const cleanQuery = query.trim();
    const preprocessedQuery = preprocessSearchQuery(cleanQuery);
    
    const matches: SearchMatch[] = [];
    const seenCodes = new Set<string>();

    const addMatch = (item: any, score: number, reason: string, isExpert?: boolean) => {
      const rawCode = item.smallId || item.mediumId || item.majorId || "";
      const code = formatFullCode(rawCode);
      if (!code || seenCodes.has(code)) return;
      seenCodes.add(code);
      matches.push({ item, score, reason, isExpert });
    };

    // 1. Exact Match for Code
    const exactCodeItem = items.find(
      (item) =>
        item.majorId === cleanQuery ||
        item.mediumId === cleanQuery ||
        item.smallId === cleanQuery ||
        (preprocessedQuery && (
          item.majorId === preprocessedQuery ||
          item.mediumId === preprocessedQuery ||
          item.smallId === preprocessedQuery
        )),
    );
    if (exactCodeItem) {
      addMatch(exactCodeItem, 100, "精确体系代码匹配");
    }

    // 2. Exact Match in Name
    const exactNameMatch = items.find(
      (item) => 
        item.name === cleanQuery || 
        (preprocessedQuery && item.name === preprocessedQuery)
    );
    if (exactNameMatch) {
      addMatch(exactNameMatch, 95, "精准名称匹配");
    }

    // 3. Expert Mappings (Medical, IT, etc.)
    const mergedCustomMappings = customMappings;
    Object.keys(mergedCustomMappings).forEach((keyword) => {
      if (cleanQuery.includes(keyword) || (preprocessedQuery && preprocessedQuery.includes(keyword))) {
        mergedCustomMappings[keyword].forEach((code) => {
          const matchedItem = items.find((i) => i.smallId === code || i.mediumId === code);
          if (matchedItem) {
            const isVeryClose = cleanQuery === keyword || 
              cleanQuery.replace(/的|厂|公司|加工|服务|处理|活动|生产|制造/g, "") === keyword.replace(/的|厂|公司|加工|服务|处理|活动|生产|制造/g, "");
            
            const isGenericShortKey = keyword.length <= 2 && /^(管理|工程|软件|安全|技术|信息|企业|服务|法律|金属|加工|制造|生产|设备|产品|系统|日常|一般|销售|批发|零售|研发|开发|设计|咨询|租赁)$/.test(keyword);
            
            let score;
            if (isVeryClose) {
              score = 98;
            } else if (isGenericShortKey) {
              score = 55;
            } else {
              score = 92 + (keyword.length * 0.1);
            }

            const isExpertMatch = isVeryClose || !isGenericShortKey;
            addMatch(matchedItem, score, `专家语义映射：检测到"${keyword}"`, isExpertMatch);
          }
        });
      }
    });

    // 4. Intent Detection
    const isSalesOnly = (cleanQuery.includes("销售") || cleanQuery.includes("零售") || cleanQuery.includes("批发")) && !cleanQuery.includes("生产") && !cleanQuery.includes("制造") && !cleanQuery.includes("研发");
    const isProdAndSales = (cleanQuery.includes("生产") || cleanQuery.includes("制造") || cleanQuery.includes("研发")) && (cleanQuery.includes("销售") || cleanQuery.includes("零售"));
    const isConstruction = cleanQuery.includes("施工") || cleanQuery.includes("安装") || cleanQuery.includes("建设") || cleanQuery.includes("架设");

    // 5. Fuzzy Search with Intent Calibration
    const fuzzyResults = fuseRef.current.search(preprocessedQuery || cleanQuery, { limit: 12 });
    fuzzyResults.forEach((res) => {
      let reason = "模糊关键词推测";
      let score = 85 - (res.score || 0) * 100;
      const code = res.item.smallId || res.item.mediumId || res.item.majorId || "";
      
      if (isSalesOnly && code.startsWith("29.")) {
          score += 20;
          reason += " (销售意图精确对齐大类 29)";
      } else if (isSalesOnly && !code.startsWith("29.")) {
          score -= 35; // Heavier penalty for false positive sales
          reason += " (销售意图误中非销售类, 降权)";
      }

      if (isProdAndSales && !code.startsWith("29.") && !code.startsWith("28.") && parseInt(code.substring(0,2)) <= 24) {
           score += 15;
           reason += " (生产销售复合意图精确对齐制造类)";
      } else if (isProdAndSales && code.startsWith("29.")) {
           score -= 20;
           reason += " (生产销售复合意图误中销售大类, 降权)";
      }

      if (isConstruction && code.startsWith("28.")) {
          score += 20;
          reason += " (建筑安装意图精确对齐大类 28)";
      }
      
      addMatch(res.item, score, reason);
    });

    // 6. Final Score Normalization
    matches.forEach((m) => {
      if (m.isExpert) {
        m.score += 100; // Boost expert matches to top
      }
    });

    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  const getInclusivePortion = (text: string) => {
    const exclusionStart = text.search(
      /([,，;；]\s*(一|—)?.*见\d+)|([,，;；]\s*—)/,
    );
    if (exclusionStart !== -1) return text.substring(0, exclusionStart);
    return text;
  };

  function ThinkingBox({ thinking }: { thinking: string }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="border border-slate-200/60 bg-slate-50/50 rounded-xl p-2.5 max-w-[340px] mt-1 text-[12px] text-slate-500">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 font-bold text-slate-600 hover:text-brand-blue transition-colors text-[11px] uppercase tracking-wider"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          💡 AI 思考过程 {isOpen ? "▲" : "▼"}
        </button>
        {isOpen && (
          <div className="mt-2 pt-2 border-t border-slate-200/50 leading-relaxed whitespace-pre-wrap font-sans text-slate-500/90 text-[11px]">
            {thinking}
          </div>
        )}
      </div>
    );
  }

  const processSegment = async (segment: string) => {
    let content = "";
    let usage: any = null;
    let thinking: string | undefined = undefined;

    if (currentStrategy === "A") {
      const localMatches = getTopLocalMatches(segment);
      const hasHighConfidence = localMatches.length > 0 && localMatches[0].score >= 95;

      if (hasHighConfidence) {
        content = `✅ **【本地极速匹配】已定位精准分类：**\n\n`;
        localMatches.forEach((m, i) => {
          const code = m.item.smallId || m.item.mediumId || m.item.majorId || "";
          content += `${i + 1}. **[${formatFullCode(code)}](nav::${code})** - ${m.item.name} *(命中分数: ${m.score.toFixed(0)}, 依据: ${m.reason})*\n`;
        });
        content += `\n---\n\n💡 如果业务描述较复杂，建议 [🚀 调用 AI 引擎进行全局优化筛选](ai-match::${encodeURIComponent(segment)})`;
      } else {
        content = `🔍 本地库未发现高置信度匹配，正在启动大模型执行【全局对比筛选】...\n\n`;
        try {
          const aiRes = await fetchWithBackoff(segment, settings, messages);
          content += aiRes.text;
          usage = aiRes.usage;
          thinking = aiRes.thinking;
        } catch (e: any) {
          content += `❌ 全局筛选失败: ${e.message || "未知错误"}\n\n[🚀 点击重试全局优化筛选](ai-match::${encodeURIComponent(segment)})`;
        }
      }
    } else if (currentStrategy === "B") {
      try {
        const sysPrompt = "你是一个认证行业的专业语义分解专家。请先在 <thinking></thinking> 标签内思考该业务描述在传统行业分类中的定位及关键词特征，然后在思考外输出精炼、结构化的 Markdown 列表，包含：【核心实体】、【核心行为】、【属性特征】。";
        const userPrompt = `请深度分析以下业务范围描述的语义特征：\n"${segment}"`;

        let aiRes: any;
        if (settings.useInternalProxy) {
          aiRes = await callAI([
            { role: "user", content: userPrompt }
          ], {
            model: settings.modelName,
            systemInstruction: sysPrompt,
            module: "search",
            temperature: 0.1
          });
        } else {
          aiRes = await callAI([
            { role: "user", content: userPrompt }
          ], {
            model: settings.modelName,
            systemInstruction: sysPrompt,
            temperature: 0.1
          });
        }

        const rawText = aiRes.text || "";
        const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
        thinking = thinkingMatch ? thinkingMatch[1].trim() : undefined;
        const cleanDecomp = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();

        usage = aiRes.usage;

        const localMatches = getTopLocalMatches(segment);

        content = `### 🧠 大模型语义分解结果：\n${cleanDecomp}\n\n`;
        if (localMatches.length > 0) {
          content += `🎯 **基于对账规则对撞命中以下官方分类：**\n\n`;
          localMatches.forEach((m, i) => {
            const code = m.item.smallId || m.item.mediumId || m.item.majorId || "";
            content += `${i + 1}. **[${formatFullCode(code)}](nav::${code})** - ${m.item.name} *(命中分数: ${m.score.toFixed(0)}, 依据: ${m.reason})*\n`;
          });
        } else {
          content += `⚠️ 抱歉，本地库在第二步的规则对账中没有发现匹配度足够的分类，建议更换更基础的产品名词重试。`;
        }
      } catch (e: any) {
        content = `❌ 语义分解步骤失败: ${e.message || "未知错误"}`;
      }
    } else {
      // Mode C: Scheme 1 (Directly RAG feed all possible items to AI, output reasoning and match)
      try {
        const aiRes = await fetchWithBackoff(segment, settings, messages);
        content += aiRes.text;
        usage = aiRes.usage;
        thinking = aiRes.thinking;
      } catch (e: any) {
        content = `❌ 全景直配失败: ${e.message || "未知错误"}\n\n[🚀 点击重试全景直配](ai-match::${encodeURIComponent(segment)})`;
      }
    }

    return { content, usage, thinking };
  };

  const handleAIMatch = async (query: string) => {
    if (isTyping) return;

    // Check if we have cached response first
    const cached = getCachedResponse(query);
    if (cached) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: cached,
        },
      ]);
      return;
    }

    if (!settings.apiKey && !settings.useInternalProxy) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: "❌ 无法调用大模型：API Key 未配置",
          isError: true,
        },
      ]);
      return;
    }

    setIsTyping(true);
    try {
      const result = await processSegment(query);
      if (result.content && !result.content.startsWith("❌")) {
        setCachedResponse(query, result.content);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: result.content,
          usage: result.usage,
          thinking: result.thinking,
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: `❌ AI 匹配失败: ${error.message || "未知错误"}`,
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const fetchWithBackoff = async (
    query: string,
    currentSettings: AISettings,
    history: Message[],
    forceAIMatch = false
  ): Promise<{ text: string; usage?: any; thinking?: string }> => {
    let retries = 0;
    const maxRetries = 3;
    const timeoutDuration = 30000;
    const retryContextAppend: string[] = [];

    while (retries < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      const contextCodes = new Set<string>();

      try {
        let dynamicContext = "";
        const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

        if (fuseRef.current) {
          const suffixMatch = query.match(
            /(的?(?:制造|销售|零售|批发|安装|维修|生产|加工|研发|设计|咨询|租赁|服务|开发)(?:[及和与、](?:制造|销售|零售|批发|安装|维修|生产|加工|研发|设计|咨询|租赁|服务|开发))*)$/,
          );
          const coreQuery = suffixMatch
            ? query.replace(suffixMatch[0], "").trim()
            : query;

          const isMfgQuery = /制造|生产|加工|组装|研发|开发|处理|涂覆|涂装|喷漆|焊接|铆焊|抛光|去毛刺/.test(query);
          const isTradeQuery = /(批发|零售|贸易|分销|销售|经营|代理|买卖|售卖)/.test(query);
          let isInstallQuery = /安装|施工|铺设|架设|建设|工程|建筑|装饰|装修/.test(query);
          const isServiceQuery = /服务|餐饮|住宿|管理|咨询|租赁|研究|培训|策划|运营/.test(query);

          const isEngineeringServiceQuery = /(咨询|设计|监理|造价|项目管理|管理|代理|勘察|勘测|测绘|规划)/.test(query);
          if (isEngineeringServiceQuery && /(工程|建筑)/.test(query)) {
            isInstallQuery = false;
          }

          const localTop = getTopLocalMatches(query);
          let contextStrings: string[] = [];
          
          // 1. Add top local matches
          localTop.forEach(match => {
             const code = match.item.smallId || match.item.mediumId || match.item.majorId || "";
             if (!contextCodes.has(code)) {
               contextCodes.add(code);
               const formatted = formatCategoryForAI(code, match.item.name || "", match.item.text_unit || "");
               contextStrings.push(formatted);
             }
          });

          // 2. Perform fuzzy search on core query
          const results = fuseRef.current.search(coreQuery, { limit: 30 });
          results.forEach((res) => {
             const code = res.item.smallId || res.item.mediumId || res.item.majorId || "";
             // Filter out noisy fuzzy results if we already have some items
             if (res.score !== undefined && res.score > 0.65 && contextStrings.length >= 5) {
               return;
             }
             if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, res.item.name || "", res.item.text_unit || "");
                contextStrings.push(formatted);
             }
          });

          // 3. Synonym Expansion to broaden local search coverage
          const synonymsMap: Record<string, string[]> = {
            "光伏": ["太阳能", "电池", "半导体", "发电设备"],
            "支架": ["金属结构", "钢结构", "五金", "建材"],
            "芯片": ["集成电路", "半导体", "电子元器件"],
            "物联网": ["软件开发", "信息技术", "计算机咨询"],
            "人工智能": ["信息技术", "科技推广", "软件开发"],
            "电商": ["零售", "批发", "贸易"],
            "直播": ["零售", "文化艺术", "信息服务"],
            "新能源": ["太阳能", "电池", "发电设备"],
            "医疗器械": ["医疗仪器", "制药设备"],
            "环保": ["生态保护", "环境治理"],
            "垃圾分类": ["环境卫生", "废物资源"],
            "模具": ["型箱", "铸模", "工具"],
            "铆焊": ["机加工", "金属结构", "焊接", "钢结构", "机械加工"],
            "焊接": ["机加工", "金属结构", "焊接", "钢结构", "金属结构物"],
            "喷漆": ["金属的处理和涂覆", "涂漆", "涂料", "表面处理"],
            "涂装": ["金属的处理和涂覆", "涂漆", "喷漆", "表面处理"],
            "表面处理": ["金属的处理 and 涂覆", "电镀", "阳极氧化", "抛光"],
            "金属零部件": ["机加工", "金属制品", "金属加工", "五金", "机械"],
            "零部件": ["机加工", "金属制品", "金属加工", "五金", "机械"],
            "金属制品": ["机加工", "金属制品", "金属加工", "五金"],
            "机加工": ["金属的处理和涂覆", "金属结构", "机械加工", "金属加工"]
          };

          Object.keys(synonymsMap).forEach(key => {
            if (coreQuery.includes(key)) {
              synonymsMap[key].forEach(syn => {
                const synResults = fuseRef.current!.search(syn, { limit: 8 });
                synResults.forEach(res => {
                  const code = res.item.smallId || res.item.mediumId || res.item.majorId || "";
                  if (!contextCodes.has(code) && res.score !== undefined && res.score < 0.6) {
                    contextCodes.add(code);
                    const formatted = formatCategoryForAI(code, res.item.name || "", res.item.text_unit || "");
                    contextStrings.push(formatted);
                  }
                });
              });
            }
          });

          // 4. Structural Intent-based Injection
          // Proactively inject major Wholesale and Retail Trade categories if the query is a Sales/Trade query
          if (isTradeQuery) {
            const tradeCategories = searchIndex.filter(item => 
              item.majorId === "29" && 
              (
                item.smallId === "29.11.03" || // 木材、建筑材料及卫生设备的批发 (建材及光伏支架等销售匹配地)
                item.smallId === "29.11.04" || // 五金制品、管道设备和供暖设备及物资的批发
                item.smallId === "29.10.07" || // 其他机械 and 设备的批发 (水处理等各种专业设备、通用机械批发)
                item.smallId === "29.12.00" || // 非专营批发贸易 (综合类销售批发)
                item.smallId === "29.21.02" || // 通过互联网的零售 (网销、网商店面)
                item.smallId === "29.11.01"    // 农林牧渔原料的批发
              )
            );
            tradeCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Food Trade categories if the query is a Food Sales/Trade query
          const isFoodTradeQuery = isTradeQuery && /(食品|预包装|散装|饮|酒|烟|茶|奶|乳|肉|菜|谷|粮|油|糖|蛋|果|蔬|鱼|海鲜|零食|烘焙|咖啡|可可)/.test(query);
          if (isFoodTradeQuery) {
            const foodTradeCategories = searchIndex.filter(item => 
              item.majorId === "29" && 
              (
                item.mediumId === "29.07" || 
                item.mediumId === "29.14" || 
                item.smallId === "29.13.01" ||
                item.smallId === "29.05.07"
              )
            );
            foodTradeCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Software/IT categories if the query is Service/IT/Development related
          if (isServiceQuery || /软件|系统|信息|开发|设计/.test(coreQuery)) {
            const serviceCategories = searchIndex.filter(item =>
              (item.majorId === "33" || item.majorId === "34") &&
              (
                item.smallId === "33.02.01" || // 软件开发
                item.smallId === "33.02.02" || // 计算机咨询活动 (包含系统集成)
                item.smallId === "33.02.04" || // 信息安全服务
                item.smallId === "34.03.01"    // 生物技术研发
              )
            );
            serviceCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Engineering and Consulting categories if the query is an Engineering Service query
          if (isEngineeringServiceQuery) {
            const engineeringCategories = searchIndex.filter(item =>
              item.majorId === "34" &&
              (
                item.smallId === "34.01.01" || // 建筑设计活动
                item.smallId === "34.01.02" || // 工程活动及相关技术咨询
                item.smallId === "34.06.00"    // 其他未另分类 of 的专业、科学和技术活动 (工程咨询等)
              )
            );
            engineeringCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Food Manufacturing categories if the query is a Food Manufacturing query
          const isFoodMfgQuery = isMfgQuery && /(食品|预包装|散装|饮|酒|烟|茶|奶|乳|肉|菜|谷|粮|油|糖|蛋|果|蔬|鱼|海鲜|零食|烘焙|咖啡|可可)/.test(query);
          if (isFoodMfgQuery) {
            const foodMfgCategories = searchIndex.filter(item => 
              (item.majorId === "03" || item.majorId === "04" || item.majorId === "05" || item.majorId === "06")
            );
            foodMfgCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Manufacturing/Mechanical categories if the query is a Manufacturing/Equipment/Parts query
          const isMechanicalQuery = isMfgQuery && /(机械|设备|零件|零部件|五金|制造|加工|模具|紧固件|弹簧|轴承|齿轮|金属|汽车|通用|结构|焊接|铆焊|门窗|喷漆|涂装|表面处理|电镀|抛光|涂覆|处理)/.test(query);
          if (isMechanicalQuery) {
            const mechanicalCategories = searchIndex.filter(item => 
              (item.majorId === "17" || item.majorId === "18" || item.majorId === "19") &&
              (
                item.smallId === "17.10.02" || // 机加工 (焊接、钻削、车削、研磨等)
                item.smallId === "17.10.01" || // 金属的处理和涂覆 (喷砂、抛光、去毛刺、涂漆、喷漆等)
                item.smallId === "17.06.01" || // 金属结构物及结构件的制造 (钢结构、框架等)
                item.smallId === "17.06.02" || // 金属门窗的制造
                item.smallId === "17.12.04" || // 紧固件和螺杆机械产品的制造
                item.smallId === "17.11.03" || // 模具制造 / 可互换工具的制造 / 紧固件、弹簧的制造
                item.smallId === "18.04.01" || // 金属成型机械的制造
                item.smallId === "18.04.02" || // 其他机床的制造
                item.smallId === "18.02.04" || // 动力驱动手工工具的制造
                item.smallId === "18.05.01" || // 冶金机械的制造
                item.smallId === "18.05.07" || // 其他未另分类的专用机械的制造
                item.smallId === "17.13.00"    // 金属加工制品的维修
              )
            );
            mechanicalCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Electrical/Equipment Installation categories if the query is an Installation query
          if (isInstallQuery) {
            const installCategories = searchIndex.filter(item =>
              item.majorId === "28" &&
              (
                item.smallId === "28.07.01" || // 电气安装 (包含电力太阳能收集器等)
                item.smallId === "28.07.02" || // 管道、供暖和空调系统的安装 (非电太阳能集热器)
                item.smallId === "28.07.03"    // 其他建筑安装
              )
            );
            installCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject Technical Testing and Analysis (34.02.00) if the query contains testing/calibration keywords
          const isTestingQuery = /(检测|校准|测试|分析|试验|检验|监测|测定|计量|测量|鉴定)/.test(query);
          if (isTestingQuery) {
            const testingCategories = searchIndex.filter(item => 
              item.majorId === "34" && 
              (
                item.smallId === "34.02.00" || // 技术测试和分析
                item.smallId === "34.04.00"    // 专业设计服务
              )
            );
            testingCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }

          // Proactively inject major Kitchenware / Cooking / Stove categories if relevant
          const isKitchenQuery = /(厨房|厨具|餐具|炊具|灶具|用具|炉|烤箱|炒锅)/.test(query);
          if (isKitchenQuery) {
            const kitchenCodes: string[] = [];
            
            // 1. Metal kitchenware (不锈钢厨房用具) -> 17.12.05
            if (/(不锈钢|金属|五金|钢|铁|铝|铜)/.test(query)) {
              kitchenCodes.push("17.12.05");
            }
            // 2. Plastic kitchenware -> 14.02.04
            if (/塑料/.test(query)) {
              kitchenCodes.push("14.02.04");
            }
            // 3. Wooden kitchenware -> 06.02.05
            if (/木/.test(query)) {
              kitchenCodes.push("06.02.05");
            }
            // 4. Ceramic kitchenware -> 15.04.01
            if (/陶瓷/.test(query)) {
              kitchenCodes.push("15.04.01");
            }
            // 5. Commercial cooking equipment -> 18.05.03
            if (/(商用|工业用|餐馆|酒店|旅馆|大功率)/.test(query)) {
              kitchenCodes.push("18.05.03");
            }
            // 6. Household gas stoves / non-electric -> 19.13.02
            if (/(家用|家庭用|民用)/.test(query) && /(燃气|天然气|非电|煤气|液化气)/.test(query)) {
              kitchenCodes.push("19.13.02");
            }
            // 7. Household electric appliances -> 19.13.01
            if (/(家用|家庭用|民用)/.test(query) && /(电磁炉|微波炉|电烤箱|电饭煲|电)/.test(query)) {
              kitchenCodes.push("19.13.01");
            }
            
            // Fallback: if no specific adjective, inject general relevant options so the AI has context to choose from
            if (kitchenCodes.length === 0) {
              kitchenCodes.push("17.12.05", "18.05.03", "19.13.01", "19.13.02", "23.01.02");
            }

            const kitchenCategories = searchIndex.filter(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              return kitchenCodes.includes(code);
            });

            kitchenCategories.forEach(item => {
              const code = item.smallId || item.mediumId || item.majorId || "";
              if (!contextCodes.has(code)) {
                contextCodes.add(code);
                const formatted = formatCategoryForAI(code, item.name || "", item.text_unit || "");
                contextStrings.push(formatted);
              }
            });
          }
          
          if (contextStrings.length > 0) {
            dynamicContext = contextStrings.slice(0, 40).join("\n");
          }
        }

        const systemInstruction = `你是一个智能行业分类匹配专家。你的任务是根据用户的业务描述，在下方的【本地数据库真实条目参考】中选出一个最合适的 6 位行业分类代码。

【绝对强制约束】：
1. 你【必须且只能】从下方的【本地数据库真实条目参考】列表中挑选出一个 6 位小类分类代码（格式为 XX.XX.XX，例如 29.07.09）。
2. 严禁捏造任何不在列表中的代码！最终推荐的代码必须 100% 存在于下方的参考列表中。
3. 只要下方参考列表中有【逻辑上可能相关】的行业，你就必须选出一个最佳项。对于简短的业务词汇（如“喷漆”、“机加工”），即使由于缺乏定语导致看似不完全匹配（例如用户搜“喷漆”，列表里只有“金属的处理和涂覆”），你也必须大胆匹配最相关的分类，【绝对不要】因为没有提供充分的前置定语（如没指明是金属）就拒绝匹配。
4. 【只有】当参考列表完全为空，或者所有选项与输入连一丝一毫的关联都没有时，你才能输出：“在给定的参考库中未找到合适匹配，请尝试微调或更换您的搜索词。” 只要有稍微相关的选项，你就必须给出一个结果！

【专家强制映射（最高优先级）】：
以下是行业专家指定的强关联词汇。如果用户输入包含以下核心词，并且下方参考列表中出现了对应的代码，请【无视其他规则，直接输出该代码】：
- “零部件加工”、“零件加工”、“铆焊”、“焊接加工”、“车铣刨磨” ➡️ 锁定 “17.10.02 (机加工)”
- “喷漆”、“喷涂”、“静电喷涂”、“阳极氧化”、“电镀”、“表面处理” ➡️ 锁定 “17.10.01 (金属的处理和涂覆)”
- “光伏支架”、“支架销售”、“五金制品销售” ➡️ 锁定 “29.11.04”
- “工程项目管理”、“工程监理”、“工程造价”、“工程咨询” ➡️ 锁定 “34.01.02”
- “小程序开发”、“APP开发”、“软件定制” ➡️ 锁定 “33.02.01”
- “保洁”、“清洁”、“室内保洁” ➡️ 锁定 “35.16.01 (建筑物的一般清洁)”，除非明确包含“外墙”或“工业”。
- “外墙清洗”、“工业清洗” ➡️ 锁定 “35.16.02 (其他建筑及工业清洗活动)”

【本地数据库真实条目参考】：
${dynamicContext || "（无）"}

【一般匹配指导原则】：
1. “生产/制造” 与 “销售/贸易” 必须严格区分：包含生产或同时包含“生产+销售”的，选制造业（03-24大类）；仅有销售的，选批发零售业（29大类）。
2. “建筑安装” 与 “设备制造” 必须区分：包含施工、安装、架设的，选建筑安装业（28大类）。
3. 匹配结果请直接输出代码和名称，并附上一句简短的匹配理由。`;

        let finalUserPrompt = `需匹配的业务描述: ${query}\n\n【系统提醒】: 请先在 <thinking></thinking> 中思考。`;

        if (retryContextAppend.length > 0) {
          finalUserPrompt += `\n\n` + retryContextAppend.join(`\n\n`);
        }

        const formattedHistory = history
          .filter((m) => m.id !== "welcome")
          .slice(-6)
          .map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content,
          }));

        let aiMessages = [
          ...formattedHistory,
          { role: "user", content: finalUserPrompt },
        ] as any[];

        const processRawText = (text: string) => {
          return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
        };

        let resultText = "";
        if (currentSettings.useInternalProxy) {
          const response = await callAI(aiMessages, {
            model: currentSettings.modelName,
            systemInstruction: systemInstruction,
            module: 'search',
          });
          resultText = response.text;
          if (response.usage) {
            totalUsage.promptTokens += response.usage.promptTokens;
            totalUsage.completionTokens += response.usage.completionTokens;
            totalUsage.totalTokens += response.usage.totalTokens;
          }
        } else if (currentSettings.provider === "openai") {
           // Basic OpenAI fallback
           const baseUrl = currentSettings.proxyUrl || "https://api.openai.com/v1";
           const response = await fetch(`${baseUrl}/chat/completions`, {
             method: "POST",
             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentSettings.apiKey}` },
             body: JSON.stringify({ model: currentSettings.modelName, messages: aiMessages })
           });
           let data; try { data = await response.json(); } catch(e) { throw new Error("JSON parse err"); }
           resultText = data.choices[0].message.content;
           if (data.usage) {
             totalUsage.promptTokens += data.usage.prompt_tokens;
             totalUsage.completionTokens += data.usage.completion_tokens;
             totalUsage.totalTokens += data.usage.total_tokens;
           }
        } else {
          const response = await callAI(aiMessages, {
            model: currentSettings.modelName,
            systemInstruction: systemInstruction,
            temperature: 0,
          });
          resultText = response.text;
          if (response.usage) {
            totalUsage.promptTokens += response.usage.promptTokens;
            totalUsage.completionTokens += response.usage.completionTokens;
            totalUsage.totalTokens += response.usage.totalTokens;
          }
        }

        if (resultText) {
          const thinkingMatch = resultText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
          const thinking = thinkingMatch ? thinkingMatch[1].trim() : undefined;
          const rawProcessed = processRawText(resultText);
          
          // 增加分类代码在库中的合法性校验层
          if (contextCodes.size > 0) {
            const codeMatches = rawProcessed.match(/\b\d{2}\.\d{2}\.\d{2}\b/g);
            if (codeMatches) {
              for (const code of codeMatches) {
                if (!contextCodes.has(code)) {
                  // 发现幻觉生成的越界代码，抛出错误以触发重试
                  throw new Error(`推荐的分类代码 ${code} 不在当前的本地数据库参考中。`);
                }
              }
            }
          }
          
          return { text: rawProcessed, usage: totalUsage, thinking };
        }
        throw new Error("AI 返回内容为空");
      } catch (error: any) {
        retries++;
        if (retries >= maxRetries) throw error;
        
        // 自动注入错题本反馈，引导大模型在重试时纠错
        retryContextAppend.push(
          `【错误反馈提示】：在上一轮回答中出现如下错误：“${error.message}”。请你必须吸取教训，在本次重试中，【只能且必须】从给定的真实本地参考列表里匹配已有的 6 位分类代码和名称！绝对不可臆造、捏造或推荐任何其他参考列表外的分类代码（比如不要凭空臆造18.04.03）！`
        );
        
        await new Promise(r => setTimeout(r, 2000));
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw new Error("Max retries exceeded");
  };

  const handleBulkAIMatch = async (segmentsStr: string) => {
    if (isTyping) return;
    const segments = segmentsStr.split("||");
    setIsTyping(true);

    let bulkContent = `🚀 **开始批量处理 ${segments.length} 个业务短语：**\n\n`;
    const msgId = Date.now().toString();
    let accumulatedUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: "ai", content: bulkContent },
    ]);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      bulkContent += `**[${i + 1}/${segments.length}] 正在匹配: ${seg}...**\n`;
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: bulkContent, usage: accumulatedUsage.totalTokens > 0 ? accumulatedUsage : undefined } : m)),
      );

      try {
        const result = await processSegment(seg);
        bulkContent = bulkContent.replace(
          `**[${i + 1}/${segments.length}] 正在匹配: ${seg}...**\n`,
          `### [${i + 1}] ${seg}\n${result.content}\n\n`,
        );
        if (result.usage) {
          accumulatedUsage.promptTokens += result.usage.promptTokens;
          accumulatedUsage.completionTokens += result.usage.completionTokens;
          accumulatedUsage.totalTokens += result.usage.totalTokens;
        }
      } catch (e: any) {
        bulkContent = bulkContent.replace(
          `**[${i + 1}/${segments.length}] 正在匹配: ${seg}...**\n`,
          `### [${i + 1}] ${seg}\n❌ 匹配失败: ${e.message.split("\n")[0]}\n\n`,
        );
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: bulkContent, usage: accumulatedUsage.totalTokens > 0 ? accumulatedUsage : undefined } : m)),
      );
      if (i < segments.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    bulkContent += `\n✅ **批量匹配完成。**`;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: bulkContent } : m)),
    );
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    const userMsgContent = inputValue.trim();
    // 自动去除输入首尾的中文/英文引号，避免影响带有 $ 锚点的正则匹配
    const rawInput = userMsgContent.replace(/^["'“‘”’]+|["'“‘”’]+$/g, "").trim();
    setInputValue("");

    const newMessages = [
      ...messages,
      { id: Date.now().toString(), role: "user" as const, content: userMsgContent },
    ];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // 优化分词逻辑：第一层，先按分号、逗号或换行符拆分成独立的大业务短语（Phrases）
      const splitByMajorPunctuation = (input: string): string[] => {
        const result: string[] = [];
        let current = "";
        let depth = 0;
        for (let i = 0; i < input.length; i++) {
          const char = input[i];
          if (char === '(' || char === '（' || char === '[' || char === '【') {
            depth++;
            current += char;
          } else if (char === ')' || char === '）' || char === ']' || char === '】') {
            if (depth > 0) depth--;
            current += char;
          } else if (depth === 0 && (char === ';' || char === '；' || char === '\n' || char === ',' || char === '，')) {
            if (current.trim()) result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        if (current.trim()) result.push(current.trim());
        return result;
      };

      const majorPhrases = splitByMajorPunctuation(rawInput).filter(p => p.length > 0);
      const segments: string[] = [];

      for (const phrase of majorPhrases) {
        // 识别当前短语的动作后缀，加入校准、检测、监测、测试、检验等认证与检测词汇
        const actionMatch = phrase.match(
          /(的?(?:制造|销售|零售|批发|安装|维修|生产|加工|研发|设计|咨询|租赁|服务|开发|校准|检测|监测|测试|检验)(?:[及和与、](?:制造|销售|零售|批发|安装|维修|生产|加工|研发|设计|咨询|租赁|服务|开发|校准|检测|监测|测试|检验))*)$/,
        );
        const suffix = actionMatch ? actionMatch[0] : "";
        const baseInput = suffix ? phrase.slice(0, phrase.length - suffix.length) : phrase;

        // 保护“式、”“型、”“类、”这种定语连词
        let safeBaseInput = baseInput.replace(/([式型类])、/g, '$1__COMMA__');

        // 按顿号、和、与、及拆分
        const splitByDun = (input: string): string[] => {
          const result: string[] = [];
          let current = "";
          let depth = 0;
          for (let i = 0; i < input.length; i++) {
            const char = input[i];
            if (char === '(' || char === '（' || char === '[' || char === '【') {
              depth++;
              current += char;
            } else if (char === ')' || char === '）' || char === ']' || char === '】') {
              if (depth > 0) depth--;
              current += char;
            } else if (depth === 0 && (char === '、' || char === '和' || char === '与' || char === '及')) {
              if (current.trim()) result.push(current.trim().replace(/__COMMA__/g, '、'));
              current = "";
            } else {
              current += char;
            }
          }
          if (current.trim()) result.push(current.trim().replace(/__COMMA__/g, '、'));
          return result;
        };

        const subItems = splitByDun(safeBaseInput).filter(s => s.length > 0);
        if (subItems.length > 1) {
          // 如果包含顿号分隔的多个子产品，则将后缀分别附加到每个产品上
          subItems.forEach(sub => {
            segments.push(suffix ? `${sub}${suffix}` : sub);
          });
        } else {
          // 没有顿号，保持原样（作为一整个短语处理）
          segments.push(phrase);
        }
      }

      if (segments.length <= 1) {
        const result = await processSegment(rawInput);
        setMessages([
          ...newMessages,
          {
            id: Date.now().toString(),
            role: "ai",
            content: result.content,
            usage: result.usage,
            thinking: result.thinking
          },
        ]);
      } else {
        // 对于多段输入，采用并发限制或分批处理，避免瞬间冲击 Quota
        let combinedContent = `✅ **检测到多个业务短语，已为您分别提供选项：**\n\n---\n\n`;
        const aiRemainingItems: string[] = [];
        
        // 先尝试本地匹配
        for (let idx = 0; idx < segments.length; idx++) {
          const seg = segments[idx];
          const localMatches = getTopLocalMatches(seg);
          
          combinedContent += `### [${idx + 1}] 业务描述: ${seg}\n`;
          
          if (localMatches.length > 0) {
             let segContent = `✅ **【本地极速匹配】为您找到建议：**\n\n`;
             localMatches.forEach((m, i) => {
               const code = m.item.smallId || m.item.mediumId || m.item.majorId || "";
               segContent += `${i + 1}. **[${formatFullCode(code)}](nav::${code})** - ${m.item.name} (${m.reason})\n`;
             });
             segContent += `\n[🚀 大模型深度匹配](ai-match::${encodeURIComponent(seg)})\n\n`;
             combinedContent += segContent;
          } else {
             combinedContent += `🤔 本地库未发现高度匹配项。预计需调用大模型...\n\n`;
             aiRemainingItems.push(seg);
          }
          if (idx < segments.length - 1) combinedContent += `---\n\n`;
        }

        const msgId = Date.now().toString();
        setMessages([...newMessages, { id: msgId, role: "ai", content: combinedContent }]);

        // 如果只有少量项需要 AI，则自动执行；如果太多，则提示用户点击
        if (aiRemainingItems.length > 0) {
          let accumulatedUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
          if (aiRemainingItems.length <= 2) {
            // 自动补全
            for (const seg of aiRemainingItems) {
               try {
                 const aiResult = await processSegment(seg);
                 combinedContent = combinedContent.replace(`### [${segments.indexOf(seg) + 1}] 业务描述: ${seg}\n🤔 本地库未发现高度匹配项。预计需调用大模型...\n\n`, `### [${segments.indexOf(seg) + 1}] 业务描述: ${seg}\n🚀 **大模型匹配结果：**\n\n${aiResult.content}\n\n`);
                 
                 if (aiResult.usage) {
                   accumulatedUsage.promptTokens += aiResult.usage.promptTokens;
                   accumulatedUsage.completionTokens += aiResult.usage.completionTokens;
                   accumulatedUsage.totalTokens += aiResult.usage.totalTokens;
                 }

                 setMessages([...newMessages, { id: msgId, role: "ai", content: combinedContent, usage: accumulatedUsage.totalTokens > 0 ? accumulatedUsage : undefined }]);
               } catch (e: any) {
                 combinedContent = combinedContent.replace(`预计需调用大模型...`, `❌ AI 请求失败: ${e.message.split('\n')[0]}`);
                 setMessages([...newMessages, { id: msgId, role: "ai", content: combinedContent, usage: accumulatedUsage.totalTokens > 0 ? accumulatedUsage : undefined }]);
               }
            }
          } else {
            combinedContent += `\n💡 **提示：** 共有 ${aiRemainingItems.length} 项未发现本地匹配。为节省 AI 额度，未自动触发大模型。您可以点击上方链接逐个触发，或 [🚀 一键批量匹配剩余项](bulk-ai-match::${encodeURIComponent(aiRemainingItems.join('||'))})`;
            setMessages([...newMessages, { id: msgId, role: "ai", content: combinedContent }]);
          }
        }
      }
    } catch (error: any) {
      setMessages([
        ...newMessages,
        {
          id: Date.now().toString(),
          role: "ai",
          content: `❌ 系统运行异常: ${error.message || "未知错误"}`,
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const markdownComponents = useMemo(() => ({
    p: ({ node, ...props }: any) => (
      <p
        className="mb-4 last:mb-0 leading-relaxed"
        {...props}
      />
    ),
    ul: ({ node, ...props }: any) => (
      <ul
        className="mb-4 list-disc pl-5 space-y-2 last:mb-0"
        {...props}
      />
    ),
    ol: ({ node, ...props }: any) => (
      <ol
        className="mb-4 list-decimal pl-5 space-y-2 last:mb-0"
        {...props}
      />
    ),
    li: ({ node, ...props }: any) => (
      <li className="leading-relaxed" {...props} />
    ),
    h1: ({ node, ...props }: any) => (
      <h1
        className="text-base font-black mt-5 mb-3 text-slate-800"
        {...props}
      />
    ),
    h2: ({ node, ...props }: any) => (
      <h2
        className="text-[15px] font-black mt-5 mb-3 text-slate-800"
        {...props}
      />
    ),
    h3: ({ node, ...props }: any) => (
      <h3
        className="text-sm font-bold mt-4 mb-2 text-slate-800"
        {...props}
      />
    ),
    strong: ({ node, ...props }: any) => (
      <strong
        className="font-bold text-brand-blue"
        {...props}
      />
    ),
    code: ({ node, className, ...props }: any) => {
      const isBlock = /language-/.test(
        className || "",
      );
      return isBlock ? (
        <code
          className="block bg-slate-100 p-2 rounded my-2 text-xs font-mono whitespace-pre-wrap overflow-x-auto"
          {...props}
        />
      ) : (
        <code
          className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono break-all"
          {...props}
        />
      );
    },
    a: ({ node, ...props }: any) => {
      const href = props.href || "";
      const isNav =
        href.startsWith("nav::") ||
        href.startsWith("#nav-") ||
        /^[\d.]+$/.test(href.replace(/#/g, ""));

      if (isNav) {
        const codeMatch = href.match(/[\d.]+/);
        const code = codeMatch ? codeMatch[0] : "";
        return (
          <a
            href={`#nav-${code}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onNavigate && code)
                onNavigate(code);
            }}
            className="text-brand-blue font-bold tracking-tight hover:underline cursor-pointer inline-flex items-center group relative whitespace-nowrap"
            title="点击跳转至该分类"
          >
            <span className="bg-brand-blue/10 px-1 rounded-sm border border-brand-blue/20">
              {props.children}
            </span>
          </a>
        );
      }

      if (href.startsWith("bulk-ai-match::")) {
        const segments = decodeURIComponent(href.replace(
          "bulk-ai-match::",
          "",
        ));
        return (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleBulkAIMatch(segments);
            }}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-brand-blue/90 transition-all shadow-md mt-2 mb-4"
            type="button"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {props.children}
          </button>
        );
      }

      if (href.startsWith("ai-match::")) {
        const query = decodeURIComponent(href.replace("ai-match::", ""));
        return (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAIMatch(query);
            }}
            className="inline-flex items-center px-3 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs hover:bg-brand-blue hover:text-white transition-all border border-brand-blue/20 shadow-sm mt-1"
            type="button"
          >
            {props.children}
          </button>
        );
      }
      return (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!href.startsWith("http")) {
              e.preventDefault();
              e.stopPropagation();
              const codeMatch = href.match(/[\d.]+/);
              if (codeMatch && onNavigate)
                onNavigate(codeMatch[0]);
            }
          }}
        />
      );
    },
  }), [onNavigate, handleBulkAIMatch, handleAIMatch]);

  return (
    <>
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 450, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ overflow: "hidden" }}
        className="h-full bg-slate-50 border-l border-slate-200 z-40 flex flex-col font-sans shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.05)] relative"
      >
        <div className="w-[450px] h-full flex flex-col relative">
          {/* Header */}
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-800 tracking-tight">
                AI 智能匹配引擎
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 px-2 rounded-lg"
                onClick={() => { 
                  if(window.confirm('确定清空所有对话记录吗？')) {
                    setMessages([
                      {
                        id: "welcome",
                        role: "ai",
                        content: "您好！我是AI智能匹配助手。您可以直接输入行业关键词、描述或是体系代码，我将为您高速精准匹配《管理体系认证业务范围分类内容说明》中的标准分类。",
                      },
                    ]);
                  }
                }}
              >
                清空对话
              </Button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                onClick={onClose}
                title="关闭"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Chat Area */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 p-4 bg-slate-50/50 overflow-y-auto scrollbar-thin scroll-smooth selection:bg-indigo-100 selection:text-indigo-900"
          >
            <div className="flex flex-col gap-4 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex gap-3 max-w-[90%]",
                      msg.role === "user"
                        ? "self-end flex-row-reverse"
                        : "self-start",
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        msg.role === "user"
                          ? "bg-slate-800 text-white"
                          : msg.isError
                            ? "bg-red-100 text-red-600"
                            : "bg-gradient-to-br from-brand-blue to-blue-600 text-white",
                      )}
                    >
                      {msg.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : msg.isError ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 w-full">
                      <div
                        className={cn(
                          "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm border",
                          msg.role === "user"
                            ? "bg-white text-slate-800 border-slate-200 rounded-tr-sm whitespace-pre-wrap"
                            : msg.isError
                              ? "bg-red-50 text-red-800 border-red-100 rounded-tl-sm whitespace-pre-wrap"
                              : "bg-white text-slate-700 border-brand-blue/10 rounded-tl-sm max-w-[340px]",
                        )}
                      >
                      {msg.role === "ai" && !msg.isError ? (
                        <div className="markdown-body">
                          <Markdown
                            urlTransform={(url) => url}
                            components={markdownComponents}
                          >
                            {preprocessMessageContent(msg.content)}
                          </Markdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                      </div>
                      {msg.thinking && (
                        <ThinkingBox thinking={msg.thinking} />
                      )}
                      {msg.usage && (
                        <div className={cn(
                          "flex items-center gap-1.5 px-1.5 text-[10px] text-slate-400 font-mono",
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        )}>
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>AI消耗: {msg.usage.totalTokens} (输入:{msg.usage.promptTokens} / 结果:{msg.usage.completionTokens})</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-[85%] self-start"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-sm bg-white border border-brand-blue/10 shadow-sm flex flex-col gap-2">
                    <div className="flex gap-1.5 pt-1">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-blue/60"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: 0,
                        }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-blue/60"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: 0.2,
                        }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-blue/60"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: 0.4,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-brand-blue/60 font-bold tracking-widest uppercase mt-1">
                      检索与匹配中...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-px w-full shrink-0" />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200 z-10 shrink-0">
            {/* Strategy Select Bar */}
            <div className="flex items-center justify-between mb-2 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 tracking-wider">匹配策略</span>
                <span className="h-1.5 w-[1px] bg-slate-200" />
                <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">AUTO</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleStrategyChange("A")}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 relative",
                    currentStrategy === "A"
                      ? "bg-white text-brand-blue shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                  title="双引擎对撞模式：先本地95分高置信度硬碰撞，若无则转AI检索过滤。"
                >
                  {currentStrategy === "A" && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"></span>
                    </span>
                  )}
                  <Sparkles className={cn("w-3 h-3 transition-colors", currentStrategy === "A" ? "text-brand-blue" : "text-slate-400")} />
                  双引擎 (A)
                </button>
                <button
                  type="button"
                  onClick={() => handleStrategyChange("B")}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 relative",
                    currentStrategy === "B"
                      ? "bg-white text-brand-blue shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                  title="语义分解模式：AI纯语义降噪解析，降噪字段返回本地100%严谨 rules 碰撞。"
                >
                  {currentStrategy === "B" && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"></span>
                    </span>
                  )}
                  <Cpu className={cn("w-3 h-3 transition-colors", currentStrategy === "B" ? "text-brand-blue" : "text-slate-400")} />
                  语义分解 (B)
                </button>
                <button
                  type="button"
                  onClick={() => handleStrategyChange("C")}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 relative",
                    currentStrategy === "C"
                      ? "bg-white text-brand-blue shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/40"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                  )}
                  title="大表全送模式：本地收集全部相似库大表，塞满上下文全喂给 AI 推理并输出依据。"
                >
                  {currentStrategy === "C" && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"></span>
                    </span>
                  )}
                  <Layers className={cn("w-3 h-3 transition-colors", currentStrategy === "C" ? "text-brand-blue" : "text-slate-400")} />
                  大表全送 (C)
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setActiveStrategyInfo(currentStrategy)}
                className="text-slate-400 hover:text-brand-blue hover:bg-slate-100 rounded-full p-1 transition-all"
                title="查看当前策略特点与Token消耗说明"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-sm focus-within:border-brand-blue/50 focus-within:ring-4 focus-within:ring-brand-blue/10 transition-all">
              <textarea
                className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 resize-none py-2.5 px-3 text-sm focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 font-medium scrollbar-thin disabled:opacity-50"
                placeholder={
                  isTyping
                    ? "AI 引擎匹配分析中..."
                    : currentStrategy === "A"
                      ? "双引擎模式：输入业务描述(本地秒级对撞/AI二次兜底)..."
                      : currentStrategy === "B"
                        ? "语义分解模式：输入业务描述(大模型分解+本地规则对撞)..."
                        : "大表全送模式：直接打包全量相似库大表投喂 AI 分析..."
                }
                value={inputValue}
                rows={1}
                disabled={isTyping}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                size="icon"
                className={cn(
                  "w-10 h-10 rounded-xl shrink-0 transition-all shadow-md",
                  inputValue.trim() && !isTyping
                    ? "bg-brand-blue hover:bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed",
                )}
                disabled={!inputValue.trim() || isTyping}
                onClick={handleSend}
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center px-1 mt-2">
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand-blue animate-pulse" />
                当前策略: <strong>方案{currentStrategy}</strong> (点击右上角 ❓ 可查看详情)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Shift + Enter 换行
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Strategy Info Dialog */}
      <Dialog open={activeStrategyInfo !== null} onOpenChange={(open) => !open && setActiveStrategyInfo(null)}>
        <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto font-sans p-6 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              {activeStrategyInfo === "A" && (
                <>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>匹配策略A：经典对撞-双引擎模式</span>
                </>
              )}
              {activeStrategyInfo === "B" && (
                <>
                  <Cpu className="w-5 h-5 text-brand-blue" />
                  <span>匹配策略B：语义分析-本地规则对撞</span>
                </>
              )}
              {activeStrategyInfo === "C" && (
                <>
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <span>匹配策略C：大表全景-AI深度直配</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1">
              由 AI 智能匹配引擎提供的不同业务场景匹配算法
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs leading-relaxed text-slate-600">
            {activeStrategyInfo === "A" && (
              <>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-amber-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    策略特点
                  </div>
                  <p className="text-slate-700">
                    <strong>极速极省。</strong>优先使用本地经过数百项真实案例校准的硬核数据库和专家映射词对撞。若发现95分以上高置信度结果，则直接本地秒级返回；若本地无强匹配结果，系统将自动汇编最相关子库，代入 AI 执行二次深度过滤筛选。
                  </p>
                </div>

                <div className="space-y-3 px-1">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">运作流程：</h4>
                    <p className="text-slate-500">输入业务词 ➔ 本地高精度硬核规则对撞 ➔ (成功? 直接输出 ➔ 结束) ➔ (不确定? 汇总相似子库并启动大模型 ➔ 正则拦截校验 ➔ 呈现结果)</p>
                  </div>
                  
                  <Separator />

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <h4 className="font-bold text-slate-800">预计 Token 消耗：</h4>
                      <p className="text-amber-600 font-mono font-bold mt-0.5">0 ~ 2,500 Tokens / 次</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">平均耗时：</h4>
                      <p className="text-slate-500 mt-0.5">本地 5-30ms / AI 约 2s</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">适用场景：</h4>
                    <p className="text-slate-500">日常绝大多数常规查询、大批量导入对账。对运行性能、匹配响应速度和 AI 额度预算敏感的用户。</p>
                  </div>
                </div>
              </>
            )}

            {activeStrategyInfo === "B" && (
              <>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-brand-blue flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                    策略特点
                  </div>
                  <p className="text-slate-700">
                    <strong>拒绝代码幻觉。</strong>将大模型强大的自然语言理解能力，聚焦于“提炼、降噪和属性解析”。AI 首先将掺杂了复杂定语的业务词拆解为结构化纯净词（如提取出核心实体、制造或销售动作等特色参数），随后将降噪后的参数返回本地，依靠本地严密权威的体系大类索引和专有匹配法则进行碰撞。
                  </p>
                </div>

                <div className="space-y-3 px-1">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">运作流程：</h4>
                    <p className="text-slate-500">输入复杂业务词 ➔ 传给 AI 提取实体/行为/定语 ➔ 剥离多余公文废话 ➔ 返回本地 ➔ 严格套用本地官方分类库模糊检索 ➔ 绝无凭空编造 ➔ 呈现最终对账结果</p>
                  </div>
                  
                  <Separator />

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <h4 className="font-bold text-slate-800">预计 Token 消耗：</h4>
                      <p className="text-brand-blue font-mono font-bold mt-0.5">200 ~ 500 Tokens / 次</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">平均耗时：</h4>
                      <p className="text-slate-500 mt-0.5">大模型单步语义拆解 1.2s</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">适用场景：</h4>
                    <p className="text-slate-500">包含繁冗修饰性长难句（如“按照国家工程要求自行购买的...”），对分类代码规范性有极端要求，必须 100% 拒绝任何 AI 臆造行业大类与假代码的严谨申报岗位。</p>
                  </div>
                </div>
              </>
            )}

            {activeStrategyInfo === "C" && (
              <>
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-indigo-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    策略特点
                  </div>
                  <p className="text-slate-700">
                    <strong>全表交叉多维直配。</strong>将输入在本地库中检索得到的最相关的数十个行业参考数据块（详细到各大类、中类说明及不包含项），连同用户输入一次性全部打包，当作“真理上下文”塞入大模型 Prompt 中。AI 此时像一位经验老道的专家一样，在地毯式翻阅中执行全景对比和逻辑推理，直接做出匹配决定，并在末端由硬核正则拦截并过滤。
                  </p>
                </div>

                <div className="space-y-3 px-1">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">运作流程：</h4>
                    <p className="text-slate-500">输入业务词 ➔ 本地组合相关分类数据块 ➔ 拼接成大表大上下文 ➔ 全量投喂 AI ➔ AI 全景逻辑推理，直接做出匹配判定并编写思考依据 ➔ 呈现深度分析与分类结果</p>
                  </div>
                  
                  <Separator />

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <h4 className="font-bold text-slate-800">预计 Token 消耗：</h4>
                      <p className="text-indigo-600 font-mono font-bold mt-0.5">2,000 ~ 5,500 Tokens / 次</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">平均耗时：</h4>
                      <p className="text-slate-500 mt-0.5">AI 大上下文对比 3s - 5s</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">适用场景：</h4>
                    <p className="text-slate-500">极高复杂度的混合交叉业务。如同一条描述内涵盖多个不同工艺类别，希望获得大模型详实的拟人对比分析与排除依据的学生或资深咨询顾问。</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="mt-6 border-t border-slate-100 pt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-9 rounded-xl"
              onClick={() => setActiveStrategyInfo(null)}
            >
              了解，关闭说明
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-full text-xs font-semibold h-9 rounded-xl bg-brand-blue hover:bg-blue-600 text-white"
              onClick={() => {
                handleStrategyChange(activeStrategyInfo!);
                setActiveStrategyInfo(null);
              }}
            >
              启用此匹配策略
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
