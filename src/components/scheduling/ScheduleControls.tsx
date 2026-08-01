import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Play, Loader2 } from 'lucide-react';

interface SchedParams {
  preferredTeachers: string;
  codes: string;
  phase1People: string;
  phase1Days: string;
  phase2People: string;
  phase2Days: string;
  targetMonth: 'current' | 'next';
}

interface ScheduleControlsProps {
  schedParams: SchedParams;
  setSchedParams: (params: SchedParams) => void;
  isGenerating: boolean;
  onGenerateSchedule: () => void;
}

export const ScheduleControls: React.FC<ScheduleControlsProps> = ({
  schedParams,
  setSchedParams,
  isGenerating,
  onGenerateSchedule,
}) => {
  return (
    <div className="p-2 px-4 border-b border-slate-100 flex flex-wrap gap-3 bg-slate-50 shrink-0 relative z-20 shadow-sm shadow-slate-200/50 items-center">
      <div className="flex items-center gap-2 flex-1 min-w-[120px]">
        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">优先(选填)</label>
        <Input 
          placeholder="姓名，逗号分隔" 
          className="bg-white h-8 text-xs" 
          value={schedParams.preferredTeachers || ''} 
          onChange={e => setSchedParams({...schedParams, preferredTeachers: e.target.value})} 
          onPaste={e => {
            const pastedText = e.clipboardData.getData('text');
            if (pastedText && /[\n\r]/.test(pastedText)) {
              e.preventDefault();
              const formatted = pastedText.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean).join(',');
              const val = schedParams.preferredTeachers || '';
              const input = e.target as HTMLInputElement;
              const start = input.selectionStart || 0;
              const end = input.selectionEnd || 0;
              const newText = val.substring(0, start) + formatted + val.substring(end);
              setSchedParams({...schedParams, preferredTeachers: newText});
              setTimeout(() => {
                if (input) {
                   input.setSelectionRange(start + formatted.length, start + formatted.length);
                }
              }, 0);
            }
          }}
        />
      </div>
      <div className="flex items-center gap-2 flex-[2] min-w-[200px]">
        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">专业代码</label>
        <Input 
          placeholder="19.01.02, 03.06..." 
          className="bg-white h-8 text-xs placeholder-slate-400 placeholder:text-opacity-30" 
          value={schedParams.codes || ''} 
          onChange={e => setSchedParams({...schedParams, codes: e.target.value})} 
          onPaste={e => {
            const pastedText = e.clipboardData.getData('text');
            if (pastedText && /[\n\r]/.test(pastedText)) {
              e.preventDefault();
              const formatted = pastedText.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean).join(';');
              const val = schedParams.codes || '';
              const input = e.target as HTMLInputElement;
              const start = input.selectionStart || 0;
              const end = input.selectionEnd || 0;
              const newText = val.substring(0, start) + formatted + val.substring(end);
              setSchedParams({...schedParams, codes: newText});
              setTimeout(() => {
                if (input) {
                   input.setSelectionRange(start + formatted.length, start + formatted.length);
                }
              }, 0);
            }
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs font-bold text-slate-600 whitespace-nowrap mr-1">一阶段</label>
        <Input 
          type="text" 
          placeholder="人数" 
          className="bg-white h-8 text-xs w-[48px] px-1 text-center font-mono font-medium" 
          value={schedParams.phase1People || ''} 
          onChange={e => setSchedParams({...schedParams, phase1People: e.target.value})} 
        />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">人</span>
        <Input 
          type="text" 
          placeholder="天数" 
          className="bg-white h-8 text-xs w-[48px] px-1 text-center font-mono font-medium ml-1" 
          value={schedParams.phase1Days || ''} 
          onChange={e => setSchedParams({...schedParams, phase1Days: e.target.value})} 
        />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">天/人</span>
      </div>
      <div className="flex items-center gap-1">
        <label className="text-xs font-bold text-slate-600 whitespace-nowrap mr-1 ml-2">二阶段</label>
        <Input 
          type="text" 
          placeholder="人数" 
          className="bg-white h-8 text-xs w-[48px] px-1 text-center font-mono font-medium" 
          value={schedParams.phase2People || ''} 
          onChange={e => setSchedParams({...schedParams, phase2People: e.target.value})} 
        />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">人</span>
        <Input 
          type="text" 
          placeholder="天数" 
          className="bg-white h-8 text-xs w-[48px] px-1 text-center font-mono font-medium ml-1" 
          value={schedParams.phase2Days || ''} 
          onChange={e => setSchedParams({...schedParams, phase2Days: e.target.value})} 
        />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">天/人</span>
      </div>
      <div className="flex items-center gap-2 px-2 border-l border-slate-200">
        <div className="text-[11px] text-slate-500 font-medium">总人日:</div>
        <div className="text-xs font-bold text-brand-blue font-mono">
            {(parseFloat(schedParams.phase1Days || '0') * parseInt(schedParams.phase1People || '1', 10) + 
              parseFloat(schedParams.phase2Days || '0') * parseInt(schedParams.phase2People || '1', 10)) || 0}
        </div>
      </div>
      <div className="flex items-center gap-2 w-[110px]">
        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">排程月份</label>
        <select 
          className="bg-white h-8 text-xs border border-slate-200 rounded px-1 w-full"
          value={schedParams.targetMonth || 'current'}
          onChange={e => setSchedParams({...schedParams, targetMonth: e.target.value as 'current' | 'next'})}
        >
          <option value="current">当月</option>
          <option value="next">次月及以后</option>
        </select>
      </div>
      <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
        <Button 
          className="flex-1 sm:flex-none bg-brand-blue hover:bg-brand-blue/90 border-none font-bold h-8 text-xs px-4" 
          onClick={onGenerateSchedule} 
          disabled={isGenerating}
        >
          {isGenerating ? (
            <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> 计算中</>
          ) : (
            <><Play className="w-3 h-3 mr-1.5" /> 生成排程</>
          )}
        </Button>
      </div>
    </div>
  );
};
