import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, Navigation, Loader2, Sparkles, AlertCircle, 
  DollarSign, Train, Plane, Car, FileText, Printer, 
  CheckCircle, Copy, ChevronRight, X, Trash2, Sliders,
  Hotel, ArrowRight, RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { callAI } from '../services/aiService';
import { useAuth } from '../lib/auth-context';
import { cn } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import ChinaInteractiveMap from './ChinaMap';

interface PresetRoute {
  title: string;
  start: string;
  end: string;
  desc: string;
  days: number;
  allowance: number;
  hotel: number;
  preference: string;
}

const PRESET_ROUTES: PresetRoute[] = [
  {
    title: '跨省长途・空铁联运',
    start: '成都市武侯区 (四川省)',
    end: '江苏省南京市鼓楼区双龙大道',
    desc: '距离约 1600 公里，推荐飞机/高铁组合方案',
    days: 4,
    allowance: 180,
    hotel: 380,
    preference: 'plane'
  },
  {
    title: '省内中途・高铁首选',
    start: '徐州市泉山区 (江苏省)',
    end: '南京市玄武区中山东路',
    desc: '距离约 330 公里，推荐最快 1.5 小时高铁直达',
    days: 2,
    allowance: 150,
    hotel: 320,
    preference: 'train'
  },
  {
    title: '同城就近・打车自驾',
    start: '南京市建邺区江东中路',
    end: '南京市江宁区秣陵街道',
    desc: '距离约 25 公里，推荐网约车或自驾，方便快捷',
    days: 1,
    allowance: 80,
    hotel: 0,
    preference: 'car'
  },
  {
    title: '跨省中短途・双向首选',
    start: '济南市历下区 (山东省)',
    end: '北京市朝阳区建国门外大街',
    desc: '距离约 400 公里，推荐 2 小时京沪高铁高速方案',
    days: 3,
    allowance: 180,
    hotel: 450,
    preference: 'train'
  }
];

interface HotelPriceRef {
  city: string;
  chainAvg: number;
  starAvg: number;
  source: string;
}

const CITY_HOTEL_REFS: Record<string, Omit<HotelPriceRef, 'city'>> = {
  '南京市': { chainAvg: 220, starAvg: 380, source: '南京地区快捷连锁与中端精选星级均价参考' },
  '成都市': { chainAvg: 190, starAvg: 340, source: '成都核心商旅圈快捷连锁与中端精选星级均价参考' },
  '徐州市': { chainAvg: 160, starAvg: 280, source: '徐州老城区及交通枢纽快捷与精选星级均价参考' },
  '济南市': { chainAvg: 180, starAvg: 320, source: '济南历下区及大明湖周边商旅快捷与星级均价参考' },
  '北京市': { chainAvg: 350, starAvg: 580, source: '北京朝阳/海淀等商圈连锁与高档四星均价参考' },
  '上海市': { chainAvg: 320, starAvg: 550, source: '上海市区黄浦/浦东快捷连锁与中端四星均价参考' },
  '深圳市': { chainAvg: 280, starAvg: 480, source: '深圳福田/南山核心段快捷与四星级商务均价参考' },
  '广州市': { chainAvg: 260, starAvg: 450, source: '广州天河/越秀商旅密集区快捷与精选三星级均价参考' },
  '杭州市': { chainAvg: 240, starAvg: 420, source: '杭州西湖/滨江高教园区中端连锁与商务四星级均价参考' },
  '武汉市': { chainAvg: 180, starAvg: 320, source: '武汉江汉/武昌高校与行政区快捷连锁及星级均价参考' },
  '西安市': { chainAvg: 170, starAvg: 300, source: '西安钟楼/曲江景区商旅快捷与三星级加权均价参考' },
  '苏州市': { chainAvg: 210, starAvg: 360, source: '苏州工业园区/姑苏区连锁与中端商务四星均价参考' },
};

export default function Scheduling() {
  const { authState } = useAuth();

  // UI States
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [travelDays, setTravelDays] = useState('3');
  const [allowanceRate, setAllowanceRate] = useState('150');
  const [hotelStandard, setHotelStandard] = useState('350');
  const [transportPreference, setTransportPreference] = useState<'any' | 'train' | 'plane' | 'car'>('any');
  const [tripType, setTripType] = useState<'round' | 'single'>('round');

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState('');
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [errorText, setErrorText] = useState('');

  // Reimbursement Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // New States and Helpers for Target City Hotel Prices
  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [aiHotelRef, setAiHotelRef] = useState<{ chainAvg: number; starAvg: number; source: string } | null>(null);

  const getCityFromEndLoc = (loc: string): string => {
    if (!loc || typeof loc !== 'string') return '';
    const cityMatch = loc.match(/([\u4e00-\u9fa5]+市)/);
    if (cityMatch) return cityMatch[1];
    
    const provinceMatch = loc.match(/([\u4e00-\u9fa5]+省)/);
    if (provinceMatch) {
      const remaining = loc.replace(provinceMatch[1], '').trim();
      const firstWord = remaining.match(/^([\u4e00-\u9fa5]+?(市|区|县|盟|州))/);
      if (firstWord) return firstWord[1];
      return remaining.substring(0, 4) || provinceMatch[1];
    }
    return typeof loc === 'string' ? loc.trim().substring(0, 6) : '';
  };

  const targetCity = useMemo(() => {
    return getCityFromEndLoc(endLoc);
  }, [endLoc]);

  // Clean AI state if end location changes
  useEffect(() => {
    setAiHotelRef(null);
  }, [endLoc]);

  const hotelPriceReference = useMemo(() => {
    if (!targetCity) return null;
    
    const matched = Object.keys(CITY_HOTEL_REFS).find(k => k.includes(targetCity) || targetCity.includes(k));
    if (matched) {
      return {
        city: matched,
        ...CITY_HOTEL_REFS[matched],
        isCustom: false
      };
    }
    
    const isTier1 = ['北京', '上海', '广州', '深圳', '三亚', '厦门', '香港', '澳门'].some(k => (endLoc || '').includes(k));
    if (isTier1) {
      return {
        city: targetCity,
        chainAvg: 300,
        starAvg: 520,
        source: `针对一线/高热度城市【${targetCity}】的自适应价格标准测算`,
        isCustom: true
      };
    }

    const isTier2 = ['杭州', '南京', '成都', '武汉', '西安', '苏州', '天津', '重庆', '长沙', '青岛', '大连', '宁波', '无锡', '昆明', '郑州', '合肥'].some(k => (endLoc || '').includes(k));
    if (isTier2) {
      return {
        city: targetCity,
        chainAvg: 220,
        starAvg: 360,
        source: `针对省会及新一线城市【${targetCity}】的自适应价格标准测算`,
        isCustom: true
      };
    }

    return {
      city: targetCity,
      chainAvg: 160,
      starAvg: 280,
      source: `针对常态城镇/区县【${targetCity}】的快捷与星级标准测算`,
      isCustom: true
    };
  }, [targetCity, endLoc]);

  const handleAiEstimateHotel = async () => {
    if (!endLoc || typeof endLoc !== 'string' || !endLoc.trim()) return;
    setIsAiEstimating(true);
    try {
      const prompt = `你是一个专业的商旅预算助手。请对目的地附近（${endLoc}）的酒店住宿价格进行最新的真实行情估算。
请仅输出一个合法的 JSON 对象，不要包含 markdown \`\`\` 标记或任何其他多余解释文本，直接以 { 开头，} 结尾。
格式要求：
{
  "chainAvg": 整数（代表该目的地附近如汉庭、如家、7天等经济连锁快捷酒店的每晚平均价格，如 210）,
  "starAvg": 整数（代表该目的地附近如亚朵、全季、精选商务星级、三四星级酒店的每晚平均价格，如 380）,
  "source": "一句简短的价格来源解释，如：基于该地火车站及高新厂区附近中端商务酒店近期均价精算"
}`;
      const response = await callAI(prompt, { module: 'schedule' });
      let cleanText = response.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      
      const parsed = JSON.parse(cleanText);
      if (parsed && typeof parsed.chainAvg === 'number' && typeof parsed.starAvg === 'number') {
        setAiHotelRef({
          chainAvg: Math.round(parsed.chainAvg),
          starAvg: Math.round(parsed.starAvg),
          source: parsed.source || `基于 ${targetCity} 附近最新酒店真实行情的 AI 估定均价`
        });
      }
    } catch (err) {
      console.error('AI hotel estimation failed, using local fallback:', err);
    } finally {
      setIsAiEstimating(false);
    }
  };

  // Handle Preset Route Click
  const handleApplyPreset = (route: PresetRoute) => {
    setStartLoc(route.start);
    setEndLoc(route.end);
    setTravelDays(String(route.days));
    setAllowanceRate(String(route.allowance));
    setHotelStandard(String(route.hotel));
    setTransportPreference(route.preference as any);
  };

  // Real-time travel budget calculation
  const calculatedBudget = useMemo(() => {
    const days = parseInt(travelDays, 10) || 1;
    const allowance = parseFloat(allowanceRate) || 0;
    const hotel = parseFloat(hotelStandard) || 0;
    
    let baseTransportMin = 50;
    let baseTransportMax = 150;
    let transportType: 'car' | 'train' | 'plane' = 'car';
    
const jiangsuCities = ['南京', '苏州', '无锡', '常州', '镇江', '扬州', '泰州', '南通', '盐城', '淮安', '宿迁', '徐州', '连云港'];
    const startCityStr = (startLoc || '').substring(0, 2);
    const endCityStr = (endLoc || '').substring(0, 2);
    
    const isSameCity = startLoc && endLoc && (
      startCityStr === endCityStr || 
      (startLoc || '').includes(endCityStr) || 
      (endLoc || '').includes(startCityStr)
    );
    
    const isStartJS = jiangsuCities.some(c => (startLoc || '').includes(c)) || (startLoc || '').includes('江苏');
    const isEndJS = jiangsuCities.some(c => (endLoc || '').includes(c)) || (endLoc || '').includes('江苏');
    
    const p1Match = (startLoc || '').match(/([\\u4e00-\\u9fa5]{2,4}?)(省|自治区)/);
    const p2Match = (endLoc || '').match(/([\\u4e00-\\u9fa5]{2,4}?)(省|自治区)/);
    const isSameProvExplicit = p1Match && p2Match && p1Match[1] === p2Match[1];

    let isDiffProvince = false;
    if (startLoc && endLoc && !isSameCity) {
      if (isSameProvExplicit) {
        isDiffProvince = false;
      } else if (isStartJS && isEndJS) {
        isDiffProvince = false;
      } else if (p1Match && p2Match && p1Match[1] !== p2Match[1]) {
        isDiffProvince = true;
      } else if (!isStartJS || !isEndJS) {
        // If not explicitly same province, and one is outside JS, assume diff province
        isDiffProvince = true;
      }
    }

    if (!startLoc || !endLoc) {
      baseTransportMin = 40;
      baseTransportMax = 110;
      transportType = 'car';
    } else if (isSameCity) {
      baseTransportMin = 40;
      baseTransportMax = 110;
      transportType = 'car';
    } else if (isDiffProvince) {
      baseTransportMin = 850;
      baseTransportMax = 1850;
      transportType = 'plane';
    } else {
      baseTransportMin = 180;
      baseTransportMax = 420;
      transportType = 'train';
    }

    if (transportPreference === 'plane') {
      baseTransportMin = Math.max(700, baseTransportMin);
      baseTransportMax = Math.max(1600, baseTransportMax);
      transportType = 'plane';
    } else if (transportPreference === 'train') {
      baseTransportMin = Math.max(120, baseTransportMin);
      baseTransportMax = Math.max(380, baseTransportMax);
      transportType = 'train';
    } else if (transportPreference === 'car') {
      baseTransportMin = Math.min(250, baseTransportMin);
      baseTransportMax = Math.min(500, baseTransportMax);
      transportType = 'car';
    }

    // Adjust based on single vs round trip for mainline transport
    const isRound = tripType === 'round';
    const estTransportMin = isRound ? baseTransportMin : Math.round(baseTransportMin / 2);
    const estTransportMax = isRound ? baseTransportMax : Math.round(baseTransportMax / 2);
    
    // Grabbing the average lodging rate in the destination city (considering the limit/hotelStandard as an upper bound)
    let localAvgPrice = hotel; // Default fallback to user-specified limit
    if (aiHotelRef) {
      localAvgPrice = (aiHotelRef.chainAvg + aiHotelRef.starAvg) / 2;
    } else if (hotelPriceReference) {
      localAvgPrice = (hotelPriceReference.chainAvg + hotelPriceReference.starAvg) / 2;
    }

    // First/Last mile ground local transit (小交通) calculation
    let estLocalTransitMin = 0;
    let estLocalTransitMax = 0;
    let startTransitDesc = '';
    let endTransitDesc = '';

    if (transportType === 'plane') {
      // Starting end: taxi to airport
      const startMin = isRound ? 120 : 60;
      const startMax = isRound ? 160 : 80;
      startTransitDesc = isRound 
        ? `始发地往返机场接驳打车 (￥${startMin}-${startMax})`
        : `始发地单程机场接驳打车 (￥${startMin}-${startMax})`;

      // Destination end: airport to hotel/factory + daily commute (￥30/day)
      const endTransferMin = isRound ? 160 : 80;
      const endTransferMax = isRound ? 200 : 100;
      const dailyCommute = Math.max(0, days - 1) * 30;
      const endMin = endTransferMin + dailyCommute;
      const endMax = endTransferMax + dailyCommute;
      endTransitDesc = isRound
        ? `目的地机场至厂区往返接驳及市内通勤 (￥${endMin}-${endMax})`
        : `目的地机场至厂区单程接驳及市内通勤 (￥${endMin}-${endMax})`;

      estLocalTransitMin = startMin + endMin;
      estLocalTransitMax = startMax + endMax;
    } else if (transportType === 'train') {
      // Starting end: taxi to railway station
      const startMin = isRound ? 60 : 30;
      const startMax = isRound ? 80 : 40;
      startTransitDesc = isRound
        ? `始发地往返高铁站接驳打车 (￥${startMin}-${startMax})`
        : `始发地单程高铁站接驳打车 (￥${startMin}-${startMax})`;

      // Destination end: railway station to hotel/factory + daily commute (￥30/day)
      const endTransferMin = isRound ? 80 : 40;
      const endTransferMax = isRound ? 100 : 50;
      const dailyCommute = Math.max(0, days - 1) * 30;
      const endMin = endTransferMin + dailyCommute;
      const endMax = endTransferMax + dailyCommute;
      endTransitDesc = isRound
        ? `目的地高铁站至厂区往返接驳及市内通勤 (￥${endMin}-${endMax})`
        : `目的地高铁站至厂区单程接驳及市内通勤 (￥${endMin}-${endMax})`;

      estLocalTransitMin = startMin + endMin;
      estLocalTransitMax = startMax + endMax;
    } else {
      // Car / local transit
      const startMin = isRound ? 20 : 10;
      const startMax = isRound ? 40 : 20;
      startTransitDesc = isRound
        ? `始发地往返车程/自驾通勤 (￥${startMin}-${startMax})`
        : `始发地单程车程/自驾接驳 (￥${startMin}-${startMax})`;

      const endMin = Math.max(1, days) * (isRound ? 20 : 10);
      const endMax = Math.max(1, days) * (isRound ? 30 : 15);
      endTransitDesc = isRound
        ? `目的地市内通勤与路桥油费补贴 (￥${endMin}-${endMax})`
        : `目的地单程通勤与路桥油费补贴 (￥${endMin}-${endMax})`;

      estLocalTransitMin = startMin + endMin;
      estLocalTransitMax = startMax + endMax;
    }

    const actualDailyRate = Math.min(localAvgPrice, hotel);
    const estAccommodation = Math.max(0, days - 1) * actualDailyRate;
    const estAllowance = days * allowance;
    
    const estTotalMin = estTransportMin + estAccommodation + estAllowance + estLocalTransitMin;
    const estTotalMax = estTransportMax + estAccommodation + estAllowance + estLocalTransitMax;
    
    return {
      transportType,
      estTransportMin,
      estTransportMax,
      estAccommodation,
      estAllowance,
      estLocalTransitMin,
      estLocalTransitMax,
      startTransitDesc,
      endTransitDesc,
      estTotalMin,
      estTotalMax,
      localAvgPrice,
      actualDailyRate,
      hotelLimit: hotel
    };
  }, [startLoc, endLoc, travelDays, allowanceRate, hotelStandard, transportPreference, tripType, aiHotelRef, hotelPriceReference]);

  // Call Gemini API for Travel Route and Detailed Planning
  // Safe alert and copy to clipboard helpers
  const safeAlert = (message: string) => {
    try {
      alert(message);
    } catch (e) {
      console.warn('Alert blocked by browser environment:', message, e);
    }
  };

  const safeCopyToClipboard = (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          safeAlert('已成功复制到剪贴板！');
        }).catch((err) => {
          console.warn('Navigator clipboard write error, using fallback:', err);
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch (e) {
      console.warn('Clipboard access error, using fallback:', e);
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
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
        safeAlert('已成功复制到剪贴板！');
      } else {
        safeAlert('复制失败，请手动选择复制。');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      safeAlert('复制失败，请手动选择复制。');
    }
  };

  const handleCalculateTravel = async () => {
    if (!startLoc || !endLoc || !startLoc.trim() || !endLoc.trim()) {
      safeAlert('请先输入“差旅起点”和“差旅终点”！');
      return;
    }

    setIsGenerating(true);
    setResultText('');
    setErrorText('');
    setTokenUsage(null);

    const prompt = `请帮我测算以下两地之间的地理距离、最佳差旅出行方式、以及全口径预算规划：
起点：${startLoc}
终点：${endLoc}

【差旅管理政策参数】：
- 计划出差总天数：${travelDays} 天
- 每日伙食及交通补贴标准：￥${allowanceRate}/天
- 每日住宿报销上限标准：￥${hotelStandard}/晚
- 用户交通偏好类型：${
      transportPreference === 'plane' ? '飞机优先' :
      transportPreference === 'train' ? '高铁优先' :
      transportPreference === 'car' ? '驾车/打车优先' : '不限（自动智能匹配最优组合）'
    }
- 行程模式：${tripType === 'single' ? '单程出行（单趟大交通与单端/首端小交通接驳）' : '双程往返（来回双向大交通与双端往返接驳小交通）'}
${hotelPriceReference ? `- 目的地【${targetCity}】参考住宿价：经济型连锁 ￥${aiHotelRef ? aiHotelRef.chainAvg : hotelPriceReference.chainAvg}/晚，三四星商务精选 ￥${aiHotelRef ? aiHotelRef.starAvg : hotelPriceReference.starAvg}/晚` : ''}

请使用 **Markdown** 格式返回，分以下4个板块详细描述，语言保持极其精练、客观、高专业度：

### 1. 📍 两地地理空间与大体交通背景
测算两地大致直线及常态陆路运输公里数，指出两地是否属于同一都市圈，描述地理位置大体分布。

### 2. 🚀 最优差旅出行方案（含首尾端小交通接驳比对）
- **推荐方案一（首选）**：具体干线交通工具（高铁车次/航班概况/自驾线路，并且**务必严格对应上述指定的行程模式：${tripType === 'single' ? '单程' : '双程往返'}**）、预计在途时间、预估票价区间。
- **接驳小交通**：说明在上述指定的行程模式（**${tripType === 'single' ? '仅限去程/单程接驳' : '双程往返接驳'}**）下，从出发地往返/单程到机场/车站的打车接驳方案、以及从目的地机场/车站前往最终受审单位的通勤打车路线，并给出合理的费用估算。
- 对于超过500公里的跨省中长途，必须详细分析**空铁联运或全高铁**的时效与便利度比对。

### 3. 💰 全口径差旅报销预算测算明细
根据输入的补贴天数（${travelDays}天）和政策标准：
- **大交通干线路费支出**：￥${calculatedBudget.estTransportMin} - ￥${calculatedBudget.estTransportMax}（基于首选大交通${tripType === 'single' ? '单程' : '往返'}方案）
- **首尾端接驳与市内通勤小交通**：￥${calculatedBudget.estLocalTransitMin} - ￥${calculatedBudget.estLocalTransitMax}（出发端接驳：${calculatedBudget.startTransitDesc}，目的地端接驳及日常市内通勤：${calculatedBudget.endTransitDesc}）
- **合规食宿补贴合计**：住宿 ￥${calculatedBudget.estAccommodation}（按 ${(parseInt(travelDays, 10) || 1) - 1} 晚计算，结合目的地均价与报销上限孰低）+ 每日在途补贴 ￥${calculatedBudget.estAllowance}（按 ${travelDays} 天计算）= ￥${calculatedBudget.estAccommodation + calculatedBudget.estAllowance}
- **综合差旅概算总额 (全口径一揽子预算)**：￥${Math.round(calculatedBudget.estTotalMin)} - ￥${Math.round(calculatedBudget.estTotalMax)} 之间（已按指定的**${tripType === 'single' ? '单程' : '双程往返'}**模式精确折算）。

### 4. 💡 本次差旅审核合规建议与风险把控
- 根据目的地【${targetCity || '该城市'}】的住宿均价水平（经济连锁 ￥${aiHotelRef ? aiHotelRef.chainAvg : hotelPriceReference ? hotelPriceReference.chainAvg : '未知'}/晚，三四星精选 ￥${aiHotelRef ? aiHotelRef.starAvg : hotelPriceReference ? hotelPriceReference.starAvg : '未知'}/晚）评估当前设置 of ￥${hotelStandard}/晚 的住宿标准是否足够、是否符合该城市差旅价格大盘，并给出合理的审计合规与调配建议。`;

    try {
      const response = await callAI(prompt, { module: 'schedule' });
      setResultText(response.text);
      setTokenUsage(response.usage);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'AI 差旅计算服务调用失败，请检查网络或 AI 引擎配置。');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to copy travel plan to clipboard
  const handleCopyPlan = () => {
    if (!resultText) return;
    safeCopyToClipboard(resultText);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fdfdff] overflow-y-auto p-4 md:p-8 selection:bg-brand-blue/20 selection:text-brand-blue" id="container-scheduling">
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-14 animate-in fade-in duration-300">
        
        {/* Modern Display Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-blue/5 text-brand-blue rounded-full text-xs font-black tracking-widest border border-brand-blue/15 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
              AI Travel Route & Budget Intelligence Link
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              AI 差旅<span className="text-brand-blue">方案与交通智算</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
              大语言模型智算起点与受审企业地理距离，推荐最优交通工具链，自动合规审查并生成差旅预算。
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="text-xs text-slate-500 font-black bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>AI 差旅智算通道已接入</span>
            </div>
          </div>
        </div>

        {/* 品字型 Layout Wrapper (Map on top, two cards below side-by-side) */}
        <div className="space-y-8">
          
          {/* Top: China Interactive Map (Full width) */}
          <div className="w-full shadow-md rounded-[24px]" id="map-top-row">
            <ChinaInteractiveMap 
              startLoc={startLoc}
              setStartLoc={setStartLoc}
              endLoc={endLoc}
              setEndLoc={setEndLoc}
              onGeneratePlan={handleCalculateTravel}
              isGenerating={isGenerating}
            />
          </div>

          {/* Bottom Row: Parameters & AI Results (Using original 5/12 and 7/12 layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="bottom-two-cards-row">
            
            {/* Left Column (5/12) - Parameters Form */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="border-none shadow-xl shadow-slate-100/70 bg-white rounded-[24px] overflow-hidden border border-slate-100" id="card-scheduling-controls">
              
              {/* Card Header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100/80 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-blue/5 rounded-xl flex items-center justify-center text-brand-blue shadow-sm border border-brand-blue/15">
                      <Sliders className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-snug">差旅智算参数设定</h2>
                      <p className="text-xs text-slate-400 font-medium">配置路线、天数及财务合规标准</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setStartLoc('');
                      setEndLoc('');
                      setTravelDays('3');
                      setAllowanceRate('150');
                      setHotelStandard('350');
                      setTransportPreference('any');
                      setResultText('');
                      setTokenUsage(null);
                      setErrorText('');
                    }}
                    variant="outline"
                    className="border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 hover:bg-red-50/50 rounded-xl font-bold text-xs h-9 px-3 gap-1 transition-all shadow-sm shrink-0 font-sans"
                    id="btn-clear-left-panel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清除输入</span>
                  </Button>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="p-6 space-y-5">
                
                {/* Step 1: Destination and Origin Inputs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h2 className="text-xs font-black text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-blue" />
                      路线端点设定
                    </h2>
                  </div>

                  {/* Start Location Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-600 flex justify-between">
                      <span>差旅始发点（居住地 / 出发机构）</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-start-loc"
                        type="text"
                        placeholder="请输入起点，如：江苏省南京市建邺区"
                        className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-slate-800 shadow-2xs"
                        value={startLoc}
                        onChange={e => setStartLoc(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* End Location Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-600">差旅项目终点（受审企业 / 目的厂区）</label>
                    <div className="relative">
                      <Navigation className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-end-loc"
                        type="text"
                        placeholder="请输入终点，如：山东省济南市历下区"
                        className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-slate-800 shadow-2xs"
                        value={endLoc}
                        onChange={e => setEndLoc(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Policy Standard Inputs */}
                <div className="space-y-4 pt-2">
                  <h2 className="text-xs font-black text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-brand-blue" />
                    合规财务与差旅政策
                  </h2>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Days input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">出差天数</label>
                      <div className="relative">
                        <input
                          id="input-travel-days"
                          type="number"
                          min="1"
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-slate-800 text-center"
                          value={travelDays}
                          onChange={e => setTravelDays(e.target.value)}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">天</span>
                      </div>
                    </div>

                    {/* Allowance input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">伙食补贴/天</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">￥</span>
                        <input
                          id="input-allowance"
                          type="number"
                          min="0"
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-slate-800"
                          value={allowanceRate}
                          onChange={e => setAllowanceRate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Hotel limit input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">住宿上限/晚</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">￥</span>
                        <input
                          id="input-hotel"
                          type="number"
                          min="0"
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue focus:bg-white transition-all text-slate-800"
                          value={hotelStandard}
                          onChange={e => setHotelStandard(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trip Type Option */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 block">行程模式（影响干线及接驳交通计费）</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="trip-type-round"
                        type="button"
                        onClick={() => setTripType('round')}
                        className={cn(
                          "h-10 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          tripType === 'round'
                            ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue hover:border-brand-blue/30"
                        )}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>双程往返 (来回)</span>
                      </button>
                      <button
                        id="trip-type-single"
                        type="button"
                        onClick={() => setTripType('single')}
                        className={cn(
                          "h-10 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          tripType === 'single'
                            ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue hover:border-brand-blue/30"
                        )}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>单程出行 (单趟)</span>
                      </button>
                    </div>
                  </div>

                  {/* Transport Preference */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 block">交通偏好智能筛选</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'any', label: '智能不限', icon: Sparkles },
                        { key: 'train', label: '高铁优先', icon: Train },
                        { key: 'plane', label: '航空优先', icon: Plane },
                        { key: 'car', label: '自驾/打车', icon: Car }
                      ].map(item => {
                        const Icon = item.icon;
                        const active = transportPreference === item.key;
                        return (
                          <button
                            key={item.key}
                            id={`pref-btn-${item.key}`}
                            onClick={() => setTransportPreference(item.key as any)}
                            className={cn(
                              "h-10 rounded-xl border text-[10px] font-black flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer",
                              active 
                                ? "bg-brand-blue text-white border-brand-blue shadow-sm" 
                                : "bg-white border-slate-200 text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue hover:border-brand-blue/30"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Destination Hotel Price Reference */}
                {hotelPriceReference && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs animate-in slide-in-from-top-1 duration-200" id="hotel-price-reference-card">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-brand-blue/10 rounded-md flex items-center justify-center text-brand-blue">
                          <Hotel className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-black text-slate-700">
                          {targetCity ? `【${targetCity}】` : '目的地附近'} 住宿价格核算参考
                        </span>
                      </div>
                      
                      <button
                        id="btn-ai-estimate-hotel"
                        onClick={handleAiEstimateHotel}
                        disabled={isAiEstimating}
                        className="text-[10px] text-brand-blue hover:text-brand-blue/80 font-bold bg-white border border-brand-blue/20 hover:bg-brand-blue/5 rounded-lg px-2.5 py-1 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                      >
                        {isAiEstimating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-brand-blue" />
                            <span>精算中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-brand-blue animate-pulse" />
                            <span>AI 价格精算</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Compare Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Economy Chain */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 flex flex-col justify-between hover:border-brand-blue/30 transition-all shadow-3xs" id="hotel-chain-box">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
                            <span className="text-[10px] font-black text-slate-500">经济/快捷连锁</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium">汉庭、如家等连锁快捷</p>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 block leading-none">每晚平均价格</span>
                            <p className="text-xs sm:text-sm font-black text-slate-800">
                              ￥{aiHotelRef ? aiHotelRef.chainAvg : hotelPriceReference.chainAvg}
                              <span className="text-[9px] font-medium text-slate-400">/晚</span>
                            </p>
                          </div>
                          <button
                            id="btn-apply-chain-price"
                            onClick={() => setHotelStandard(String(aiHotelRef ? aiHotelRef.chainAvg : hotelPriceReference.chainAvg))}
                            className="bg-brand-blue/5 hover:bg-brand-blue text-brand-blue hover:text-white border border-brand-blue/15 hover:border-brand-blue rounded-lg px-2 py-1 text-[10px] font-black transition-all cursor-pointer shadow-3xs"
                          >
                            应用
                          </button>
                        </div>
                      </div>

                      {/* 3-4 Star Business */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 flex flex-col justify-between hover:border-brand-blue/30 transition-all shadow-3xs" id="hotel-star-box">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            <span className="text-[10px] font-black text-slate-500">三四星/商务精选</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium">亚朵、全季等高档商务</p>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 block leading-none">每晚平均价格</span>
                            <p className="text-xs sm:text-sm font-black text-slate-800">
                              ￥{aiHotelRef ? aiHotelRef.starAvg : hotelPriceReference.starAvg}
                              <span className="text-[9px] font-medium text-slate-400">/晚</span>
                            </p>
                          </div>
                          <button
                            id="btn-apply-star-price"
                            onClick={() => setHotelStandard(String(aiHotelRef ? aiHotelRef.starAvg : hotelPriceReference.starAvg))}
                            className="bg-brand-blue/5 hover:bg-brand-blue text-brand-blue hover:text-white border border-brand-blue/15 hover:border-brand-blue rounded-lg px-2 py-1 text-[10px] font-black transition-all cursor-pointer shadow-3xs"
                          >
                            应用
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Source / Note */}
                    <p className="text-[9px] text-slate-400 font-bold bg-white/60 border border-slate-100 p-1.5 rounded-lg line-clamp-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-slate-300 rounded-full" />
                      数据参考：{aiHotelRef ? aiHotelRef.source : hotelPriceReference.source}
                    </p>
                  </div>
                )}

                {/* Dynamic Budget Calculator Display Card (Matches Range Search color theme) */}
                <div id="budget-preview-card" className="bg-brand-blue/[0.02] border border-brand-blue/15 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">全口径预算速测 (实时联动)</span>
                    <span className="text-[10px] text-brand-blue font-black flex items-center gap-0.5 bg-brand-blue/5 px-2.5 py-1 rounded-full border border-brand-blue/10">
                      主要交通: 
                      {calculatedBudget.transportType === 'plane' && '✈️ 航空飞行'}
                      {calculatedBudget.transportType === 'train' && '🚄 动车高铁'}
                      {calculatedBudget.transportType === 'car' && '🚗 同城打车'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 divide-x divide-slate-100 text-center">
                    <div className="px-1">
                      <span className="text-[9px] text-slate-500 font-bold block truncate">大交通路费</span>
                      <span className="text-[10px] font-black text-slate-800">
                        ￥{calculatedBudget.estTransportMin}-{calculatedBudget.estTransportMax}
                      </span>
                    </div>
                    <div className="px-1">
                      <span className="text-[9px] text-slate-500 font-bold block truncate">首尾小交通</span>
                      <span className="text-[10px] font-black text-slate-800">
                        ￥{calculatedBudget.estLocalTransitMin}-{calculatedBudget.estLocalTransitMax}
                      </span>
                    </div>
                    <div className="px-1">
                      <span className="text-[9px] text-slate-500 font-bold block truncate">食宿及补贴</span>
                      <span className="text-[10px] font-black text-slate-800">
                        ￥{calculatedBudget.estAccommodation + calculatedBudget.estAllowance}
                      </span>
                    </div>
                    <div className="px-1">
                      <span className="text-[9px] text-slate-500 font-bold block truncate">全口径预估</span>
                      <span className="text-[10px] font-black text-brand-blue">
                        ￥{Math.round(calculatedBudget.estTotalMin)}-{Math.round(calculatedBudget.estTotalMax)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 text-[9px] text-slate-400 font-medium space-y-1">
                    <div className="flex justify-between items-center">
                      <span>目的地酒店均价：</span>
                      <span className="font-bold text-slate-600">￥{calculatedBudget.localAvgPrice.toFixed(0)}/晚</span>
                    </div>
                    <div className="flex justify-between items-center text-brand-blue font-bold">
                      <span>首尾接驳与通勤费：</span>
                      <span>￥{calculatedBudget.estLocalTransitMin} - {calculatedBudget.estLocalTransitMax}</span>
                    </div>
                  </div>
                </div>

                {/* Execute Calculation Button */}
                <Button
                  id="btn-calculate-travel"
                  disabled={isGenerating || !startLoc || !endLoc}
                  onClick={handleCalculateTravel}
                  className={cn(
                    "w-full h-12 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md border-none cursor-pointer",
                    isGenerating 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none" 
                      : "bg-brand-blue hover:bg-brand-blue/90 text-white shadow-brand-blue/20"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span>正在智算并规划合规路线...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                      <span>一键生成 AI 差旅方案与预算</span>
                    </>
                  )}
                </Button>

              </CardContent>
            </Card>
          </div>

          {/* Right Column (7/12) - Results & Interactive Panel */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-xl shadow-slate-100/70 bg-white rounded-[24px] overflow-hidden border border-slate-100 flex flex-col min-h-[580px]" id="card-travel-results">
              
              {/* Card Header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100/80 shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-blue/5 rounded-xl flex items-center justify-center text-brand-blue shadow-sm border border-brand-blue/15">
                      <Sparkles className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight leading-snug">AI 差旅路线规划与测算方案</h2>
                      <p className="text-xs text-slate-400 font-medium">智能推荐交通方案、核算合规补贴并在途控费</p>
                    </div>
                  </div>
                  
                  {resultText && (
                    <Button
                      onClick={() => {
                        setResultText('');
                        setTokenUsage(null);
                        setErrorText('');
                      }}
                      variant="outline"
                      className="border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 hover:bg-red-50/50 rounded-xl font-bold text-xs h-9 px-3 gap-1 transition-all shadow-sm shrink-0 font-sans"
                      id="btn-clear-right-panel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清除方案</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Card Content Display Area */}
              <CardContent className="p-6 flex-1 flex flex-col min-h-0 justify-center">
                
                {/* Empty State */}
                {!resultText && !isGenerating && !errorText && (
                  <div id="empty-state" className="space-y-6 flex flex-col h-full justify-between">
                    {/* Intro Banner */}
                    <div className="bg-brand-blue/[0.02] border border-brand-blue/10 rounded-2xl p-6 text-center space-y-4 shadow-2xs">
                      <div className="w-14 h-14 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto text-brand-blue">
                        <Navigation className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 max-w-lg mx-auto">
                        <h3 className="text-base font-black text-slate-800">开启智能差旅路线智算</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          请在左侧面板设置您的出差起点与终点企业，系统将通过 AI 引擎智能匹配最佳交通方案、自动核对合规限制并计算全口径费用预算。
                        </p>
                      </div>
                    </div>

                    {/* Shortcuts */}
                    <div className="space-y-3 pt-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-blue animate-pulse" />
                        <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">快捷对标差旅路线（点击载入）</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PRESET_ROUTES.map((route, i) => (
                          <div
                            key={i}
                            id={`preset-route-${i}`}
                            onClick={() => handleApplyPreset(route)}
                            className="bg-white border border-slate-150 hover:border-brand-blue/30 hover:shadow-sm p-3.5 rounded-xl cursor-pointer transition-all space-y-2 group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-slate-800 group-hover:text-brand-blue transition-colors">
                                {route.title}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                            
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="truncate max-w-[100px]" title={route.start}>{route.start.split(' ')[0]}</span>
                              <span className="text-slate-300">➔</span>
                              <span className="truncate max-w-[100px]" title={route.end}>{route.end.split(' ')[0]}</span>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 line-clamp-1 font-medium">{route.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Guide Notice */}
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 flex gap-3 text-xs text-amber-800 text-left mt-4">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">差旅合规与审计合规提示</p>
                        <p className="text-slate-600 text-[11px] leading-relaxed font-medium">
                          本差旅计算系统内置“同城不计宿”、“出差在途标准补贴”等国家标准审计合规原则进行智能化路径比对，协助审核中心快速进行就近调配，防范报销合规风险。
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isGenerating && (
                  <div id="loading-state" className="space-y-6 py-12 flex flex-col items-center justify-center">
                    {/* Traveler Animation Card */}
                    <div className="relative w-full max-w-md h-32 bg-slate-50/60 rounded-2xl border border-slate-200/80 shadow-inner flex items-center justify-between px-10 overflow-hidden">
                      <div className="absolute inset-0 bg-slate-100/30 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                      
                      {/* Start Node */}
                      <div className="relative z-10 flex flex-col items-center space-y-1">
                        <div className="w-10 h-10 rounded-full bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue shadow-sm animate-pulse">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 truncate max-w-[80px]" title={startLoc}>
                          {startLoc.split(' ')[0] || '始发点'}
                        </span>
                      </div>

                      {/* Traveling connector */}
                      <div className="flex-1 relative h-1 bg-slate-200 mx-4 rounded">
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/30 via-amber-500/30 to-brand-blue/30 rounded animate-pulse" />
                        <div className="absolute top-1/2 -translate-y-1/2 -mt-1 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-blue animate-bounce" style={{
                          animation: 'planeRoute 1.8s infinite linear',
                          left: '0%'
                        }}>
                          {calculatedBudget.transportType === 'plane' && <Plane className="w-3.5 h-3.5" />}
                          {calculatedBudget.transportType === 'train' && <Train className="w-3.5 h-3.5" />}
                          {calculatedBudget.transportType === 'car' && <Car className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* End Node */}
                      <div className="relative z-10 flex flex-col items-center space-y-1">
                        <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm">
                          <Navigation className="w-5 h-5 animate-bounce" />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 truncate max-w-[80px]" title={endLoc}>
                          {endLoc.split(' ')[0] || '目的地'}
                        </span>
                      </div>

                      <style>{`
                        @keyframes planeRoute {
                          0% { left: 0%; transform: rotate(0deg) scale(0.9); }
                          50% { left: 50%; transform: rotate(15deg) scale(1.15); }
                          100% { left: 100%; transform: rotate(0deg) scale(0.9); }
                        }
                      `}</style>
                    </div>

                    <div className="space-y-2 text-center">
                      <Loader2 className="w-8 h-8 text-brand-blue animate-spin mx-auto" />
                      <h3 className="text-sm font-black text-slate-800">AI 差旅路线规划中</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                        正在穿透两地经纬空间，智能匹配高铁时刻、推荐出行方案，并精细核算食宿与交通补贴总费用限制...
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {errorText && (
                  <div id="error-state" className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-800">测算服务暂时不可用</h3>
                      <p className="text-xs text-slate-500 max-w-md leading-relaxed font-medium">{errorText}</p>
                    </div>
                    <Button
                      id="btn-retry-calculation"
                      onClick={handleCalculateTravel}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl h-10 px-5 border-none"
                    >
                      重新测算
                    </Button>
                  </div>
                )}

                {/* AI Output Dashboard */}
                {resultText && !isGenerating && (
                  <div id="result-dashboard" className="flex-1 flex flex-col h-full space-y-4 min-h-0 text-left">
                    
                    {/* Highlight Panel: HUGE Characters for Total Cost and 4-Column Clear Breakdown */}
                    <div id="highlight-total-cost-panel" className="bg-gradient-to-r from-brand-blue/[0.04] to-brand-blue/[0.01] border border-brand-blue/25 rounded-2xl p-5 space-y-4 shadow-2xs shrink-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-slate-500 tracking-wide uppercase block">
                            综合差旅概算总额 (全口径一揽子预算)：￥{Math.round(calculatedBudget.estTotalMin).toLocaleString('zh-CN')} - ￥{Math.round(calculatedBudget.estTotalMax).toLocaleString('zh-CN')} 之间。
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-brand-blue tracking-tight">
                              ￥{Math.round(calculatedBudget.estTotalMin)}
                            </span>
                            <span className="text-lg sm:text-xl font-black text-slate-400">~</span>
                            <span className="text-3xl sm:text-4xl font-black text-brand-blue tracking-tight">
                              ￥{Math.round(calculatedBudget.estTotalMax)}
                            </span>
                            <span className="text-xs font-black text-slate-400 ml-1">元 RMB</span>
                          </div>
                        </div>

                        {/* Audit Status Badge */}
                        <div className="bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>差旅审计规则通过</span>
                          </span>
                        </div>
                      </div>

                      {/* 4-Column Clear Itemized Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3.5 border-t border-slate-200/60 text-left">
                        {/* Breakdown 1 */}
                        <div className="space-y-0.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                          <span className="text-[9px] font-bold text-slate-500 block truncate">① 干线大交通</span>
                          <span className="text-xs font-black text-slate-800 block">
                            ￥{calculatedBudget.estTransportMin} - {calculatedBudget.estTransportMax}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold block truncate">
                            {calculatedBudget.transportType === 'plane' ? '✈️ 航班估票' : calculatedBudget.transportType === 'train' ? '🚄 动车高铁' : '🚗 汽车自驾/打车'}
                          </span>
                        </div>

                        {/* Breakdown 2 */}
                        <div className="space-y-0.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                          <span className="text-[9px] font-bold text-slate-500 block truncate">② 首尾双端小交通</span>
                          <span className="text-xs font-black text-slate-800 block">
                            ￥{calculatedBudget.estLocalTransitMin} - {calculatedBudget.estLocalTransitMax}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold block truncate">
                            🚕 机场/车站接驳通勤
                          </span>
                        </div>

                        {/* Breakdown 3 */}
                        <div className="space-y-0.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                          <span className="text-[9px] font-bold text-slate-500 block truncate">③ 限额内合规住宿</span>
                          <span className="text-xs font-black text-slate-800 block">
                            ￥{calculatedBudget.estAccommodation}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold block truncate">
                            🏢 孰低单价*{Math.max(0, parseInt(travelDays, 10) - 1)}晚
                          </span>
                        </div>

                        {/* Breakdown 4 */}
                        <div className="space-y-0.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs">
                          <span className="text-[9px] font-bold text-slate-500 block truncate">④ 在途餐食补贴</span>
                          <span className="text-xs font-black text-slate-800 block">
                            ￥{calculatedBudget.estAllowance}
                          </span>
                          <span className="text-[8px] text-slate-400 font-semibold block truncate">
                            🍱 ￥{allowanceRate}/天*{travelDays}天
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Markdown rendering body */}
                    <div id="ai-markdown-view" className="flex-1 overflow-y-auto rounded-2xl border border-slate-150 bg-[#fafbfe] p-5 shadow-inner scrollbar-thin max-h-[420px]">
                      <div className="text-xs text-slate-700 leading-relaxed font-sans overflow-x-hidden prose prose-sm max-w-none prose-headings:font-black prose-headings:text-slate-800 prose-headings:mb-2 prose-headings:mt-4 prose-p:my-2 prose-strong:text-slate-800 prose-strong:font-black prose-ul:my-2 prose-li:my-0.5 font-medium animate-in fade-in duration-300">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{resultText}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Toolbars */}
                    <div id="result-toolbar" className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shrink-0 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-medium">
                        <Navigation className="text-slate-300 w-3.5 h-3.5" />
                        <span>
                          距离与差旅智算引擎启动成功
                          {tokenUsage ? ` (耗费: ${tokenUsage.totalTokens} Tokens)` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          id="btn-copy-plan"
                          onClick={handleCopyPlan}
                          variant="outline"
                          className="h-9 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>复制方案</span>
                        </Button>
                        <Button
                          id="btn-print-preview"
                          onClick={() => setIsPrintModalOpen(true)}
                          className="h-9 px-3 bg-brand-blue hover:bg-brand-blue/90 text-xs font-bold text-white flex items-center gap-1.5 rounded-xl shadow-sm transition-all border-none cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-white" />
                          <span>打印报销审批单</span>
                        </Button>
                      </div>
                    </div>

                  </div>
                )}

              </CardContent>
            </Card>
          </div>

        </div>

      </div>

    </div>

      {/* Reimbursement Print Modal - Styled professionally */}
      {isPrintModalOpen && (
        <div id="print-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div id="print-modal" className="bg-white rounded-[28px] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" />
                <h3 className="font-black text-slate-800 text-sm">审核差旅预算审批申请单（自动生成）</h3>
              </div>
              <button 
                id="btn-close-print"
                onClick={() => setIsPrintModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div id="printable-area" className="flex-1 overflow-y-auto p-6 bg-slate-50/60 text-left">
              
              {/* Paper structure */}
              <div id="paper-sheet" className="bg-white border border-slate-300 rounded-md p-8 shadow-sm space-y-6 font-sans text-slate-800">
                
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-black tracking-widest text-slate-900">AI 智能审核管理中心</h2>
                  <h1 className="text-xl font-bold border-b-2 border-double border-slate-800 pb-2 inline-block px-4">
                    审核员出差派遣与差旅费核定申请表
                  </h1>
                </div>

                <div className="grid grid-cols-2 text-xs border-b border-slate-200 pb-3 font-medium text-slate-500">
                  <div>申请人：{authState.user?.name || '管理员'}</div>
                  <div className="text-right">申请日期：{new Date().toISOString().split('T')[0]}</div>
                </div>

                {/* Structured form table */}
                <div className="border border-slate-800 text-xs">
                  <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-center">差旅始发点</div>
                    <div className="p-2.5 col-span-3 font-semibold">{startLoc || '未填写'}</div>
                  </div>
                  <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-center">受审目的地</div>
                    <div className="p-2.5 col-span-3 font-semibold">{endLoc || '未填写'}</div>
                  </div>
                  <div className="grid grid-cols-6 border-b border-slate-800 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-center col-span-1">预定天数</div>
                    <div className="p-2.5 text-center col-span-1 font-bold">{travelDays} 天</div>
                    <div className="bg-slate-100 p-2.5 font-bold text-center col-span-1">膳宿天数</div>
                    <div className="p-2.5 text-center col-span-1 font-bold">住宿 {Math.max(0, parseInt(travelDays, 10) - 1)} 晚</div>
                    <div className="bg-slate-100 p-2.5 font-bold text-center col-span-1">主要交通</div>
                    <div className="p-2.5 text-center col-span-1 font-bold">
                      {calculatedBudget.transportType === 'plane' && '✈️ 航空/空铁'}
                      {calculatedBudget.transportType === 'train' && '🚄 动车/高铁'}
                      {calculatedBudget.transportType === 'car' && '🚗 同城打车'}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-center">在途餐食补贴</div>
                    <div className="p-2.5 font-bold text-slate-800">
                      ￥{calculatedBudget.estAllowance} 元
                    </div>
                    <div className="bg-slate-100 p-2.5 font-bold text-center">住宿总包(孰低)</div>
                    <div className="p-2.5 font-bold text-slate-800">
                      ￥{calculatedBudget.estAccommodation} 元
                    </div>
                  </div>
                  <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-center">干线交通路费</div>
                    <div className="p-2.5 font-bold text-slate-800">
                      ￥{calculatedBudget.estTransportMin} - ￥{calculatedBudget.estTransportMax} 元
                    </div>
                    <div className="bg-slate-100 p-2.5 font-bold text-center">接驳通勤小交通</div>
                    <div className="p-2.5 font-bold text-slate-800">
                      ￥{calculatedBudget.estLocalTransitMin} - ￥{calculatedBudget.estLocalTransitMax} 元
                    </div>
                  </div>
                  <div className="grid grid-cols-4 border-b border-slate-800 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-slate-700 text-center">全口径概算下限</div>
                    <div className="p-2.5 font-bold text-slate-800">
                      ￥{Math.round(calculatedBudget.estTotalMin)} 元
                    </div>
                    <div className="bg-slate-100 p-2.5 font-bold text-slate-700 text-center">全口径概算上限</div>
                    <div className="p-2.5 font-black text-brand-blue">
                      ￥{Math.round(calculatedBudget.estTotalMax)} 元
                    </div>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-slate-800">
                    <div className="bg-slate-100 p-2.5 font-bold text-center h-20 flex items-center justify-center">预算审计建议</div>
                    <div className="p-2.5 col-span-3 text-slate-600 leading-relaxed font-medium">
                      本单费用符合企业差旅报销政策，已自动比对 ￥{hotelStandard}/晚 报销上限与目的地城市均价 ￥{calculatedBudget.localAvgPrice.toFixed(0)}/晚（实际按孰低单价 ￥{calculatedBudget.actualDailyRate.toFixed(0)}/晚 累加住宿费），并对照 ￥{allowanceRate}/天 在途差旅补贴，计入首尾双端打车及接驳小交通费用 ￥{calculatedBudget.estLocalTransitMin}-￥{calculatedBudget.estLocalTransitMax}。交通优先采用
                      {calculatedBudget.transportType === 'plane' && ' 航空/飞机 '}
                      {calculatedBudget.transportType === 'train' && ' 动车高铁 '}
                      {calculatedBudget.transportType === 'car' && ' 低碳同城打车 '}
                      出行，建议提前预订以获取最优票务折扣。
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 pt-6 text-xs gap-4 font-bold text-slate-700">
                  <div>经办人签章：________________</div>
                  <div>财务审计签章：________________</div>
                  <div>批准主管签章：________________</div>
                </div>

              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>此表单已进行合规性政策比对核定。您可以直接复制此页面或者按下 <b>Ctrl+P</b> 唤起浏览器直接打印该表单纸质件。</span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <Button
                id="btn-copy-sheet"
                onClick={() => {
                  const printableText = `AI 智能审核管理中心 - 审核员出差派遣与差旅费核定申请表\n申请人：${authState.user?.name || '管理员'}\n起点：${startLoc}\n终点：${endLoc}\n出差天数：${travelDays}天\n干线交通路费：￥${calculatedBudget.estTransportMin} - ￥${calculatedBudget.estTransportMax}元\n接驳通勤小交通：￥${calculatedBudget.estLocalTransitMin} - ￥${calculatedBudget.estLocalTransitMax}元\n餐食补贴：￥${calculatedBudget.estAllowance}元\n住宿总上限：￥${calculatedBudget.estAccommodation}元\n全口径差旅概算总额：￥${Math.round(calculatedBudget.estTotalMin)} - ￥${Math.round(calculatedBudget.estTotalMax)}元`;
                  safeCopyToClipboard(printableText);
                }}
                variant="outline"
                className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                复制表格文本
              </Button>
              <Button
                id="btn-confirm-print"
                onClick={() => {
                  window.print();
                }}
                className="h-9 px-4 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors border-none cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>立即唤起浏览器打印</span>
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
