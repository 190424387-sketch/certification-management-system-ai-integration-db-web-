import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, MapPin, Navigation, Send, X } from 'lucide-react';
import { Input } from '../ui/input';
import { useDraggable } from '../../hooks/useDraggable';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { callAI } from '../../services/aiService';

interface DistancePlannerProps {
  onPickRequest: (step: 'start' | 'end' | null) => void;
  pickingStep: 'start' | 'end' | null;
  startLoc: string;
  setStartLoc: (v: string) => void;
  endLoc: string;
  setEndLoc: (v: string) => void;
  onClose: () => void;
}

export const DistancePlanner: React.FC<DistancePlannerProps> = ({
  onPickRequest,
  pickingStep,
  startLoc,
  setStartLoc,
  endLoc,
  setEndLoc,
  onClose
}) => {
  const [result, setResult] = useState('');
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { position, handlePointerDown, handlePointerMove, handlePointerUp } = useDraggable({ x: 16, y: 96 });

  const handleQuery = async () => {
    if (!startLoc || !endLoc) {
      alert('请确保已输入或拾取起始和终点项目');
      return;
    }
    
    setIsLoading(true);
    setResult('');
    
    try {
      const prompt = `请帮我测算以下两个地点（企业名称、城市或具体地址）的距离和交通方式。系统支持模糊测算。
起点：${startLoc}
终点：${endLoc}

请使用 **Markdown** 格式返回，并注意以下规则：
- **距离超过500公里时**，请务必提供配套的 ✈️ **飞机方案**。
- **同城或50公里以内时**，优先强烈建议 🚗 **驾车或打车** 方案。
- **一般跨城**，优先展示 🚄 **高铁交通方案**。
- 回答保持极为精简，段落紧凑，对关键信息加黑加粗凸显。

1. **起始地**：（精准到区县或具体位置）
2. **终点地**：（精准到区县或具体位置）
3. **距离与耗时**：大致自驾距离与耗时
4. **交通方案**（按优先级排序，每个方案必须包含大概的费用区间）：
   - 🚄 **高铁**（首选）：站点、时长、预估费用区间。
   - ✈️ **飞机**（>500km）：机场间耗时、预估费用区间。
   - 🚗 **驾车或打车**（<50km优先）：时长、高速费预估及打车预估费用区间。`;

      const response = await callAI(prompt, { module: 'schedule' });
      setResult(response.text);
      setUsage(response.usage);
    } catch (err: any) {
      console.error(err);
      setResult('查询失败: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card 
      className="fixed z-50 w-[300px] sm:w-[350px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border-slate-300 bg-white flex flex-col max-h-[80vh] cursor-move"
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-100/80 rounded-t-xl flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center select-none">
          <MapPin className="w-4 h-4 mr-2 text-brand-blue" />
          AI 距离与交通测算
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClose}>
          <X className="w-3.5 h-3.5 text-slate-500" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 flex flex-col flex-1 gap-3 overflow-hidden min-h-0">
        <div className="space-y-3 shrink-0">
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1 flex justify-between">
              起点项目
              <span className="text-slate-400 font-normal">点击拾取从表格中选择</span>
            </label>
            <div className="flex gap-2">
              <Input 
                className="text-xs h-8 bg-slate-50" 
                value={startLoc} 
                onChange={e => setStartLoc(e.target.value)} 
                placeholder="名称..."
              />
              <Button 
                variant={pickingStep === 'start' ? "default" : "outline"}
                className={`h-8 px-2.5 text-[11px] shrink-0 ${pickingStep === 'start' ? 'bg-amber-500 hover:bg-amber-600 font-bold' : ''}`}
                onClick={() => onPickRequest(pickingStep === 'start' ? null : 'start')}
              >
                {pickingStep === 'start' ? '取消拾取' : '拾取表格'}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1 flex justify-between">
              终点项目
              <span className="text-slate-400 font-normal">点击拾取从表格中选择</span>
            </label>
            <div className="flex gap-2">
              <Input 
                className="text-xs h-8 bg-slate-50" 
                value={endLoc} 
                onChange={e => setEndLoc(e.target.value)} 
                placeholder="名称..."
              />
              <Button 
                variant={pickingStep === 'end' ? "default" : "outline"}
                className={`h-8 px-2.5 text-[11px] shrink-0 ${pickingStep === 'end' ? 'bg-amber-500 hover:bg-amber-600 font-bold' : ''}`}
                onClick={() => onPickRequest(pickingStep === 'end' ? null : 'end')}
              >
                {pickingStep === 'end' ? '取消拾取' : '拾取表格'}
              </Button>
            </div>
          </div>
          <Button 
            className="w-full h-8 text-xs bg-brand-blue hover:bg-brand-blue/90"
            onClick={handleQuery}
            disabled={isLoading || !startLoc || !endLoc}
          >
            {isLoading ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Send className="w-3 h-3 mr-1.5" />}
            AI 生成路线与费用
          </Button>
        </div>
        
        {result && (
          <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-2.5 scrollbar-thin min-h-[100px]" onPointerDown={(e) => e.stopPropagation()}>
              <div className="text-[11px] text-slate-700 leading-[1.5] font-sans overflow-x-hidden prose prose-sm prose-p:my-1.5 prose-headings:my-1.5 prose-ul:my-1 prose-li:my-1 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
            {usage && (
                <div className="px-1 flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                  <Navigation className="w-2.5 h-2.5" />
                  <span>AI消耗: {usage.totalTokens} Tokens</span>
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
