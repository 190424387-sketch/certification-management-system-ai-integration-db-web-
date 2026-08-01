import React from 'react';
import { Button } from '../ui/button';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface RecommendationItem {
  id: string;
  name: string;
  teacherIndex: number; // For single selection, or primary lead
  teacherIndices?: number[]; // For multi-teacher highlight
  groupNames?: string[]; // For multi-teacher display
  matchLevel: string;
  reason: string;
  p1Cells: number[];
  p2Cells: number[];
  otherSchedulesInRow: any[];
}

interface RecommendationsSidePanelProps {
  showRecommendations: boolean;
  setShowRecommendations: (show: boolean) => void;
  generateError: string;
  recommendations: RecommendationItem[] | null;
  activeRecommendationIndex: number;
  setActiveRecommendationIndex: (index: number) => void;
  isGenerating: boolean;
}

export const RecommendationsSidePanel: React.FC<RecommendationsSidePanelProps> = ({
  showRecommendations,
  setShowRecommendations,
  generateError,
  recommendations,
  activeRecommendationIndex,
  setActiveRecommendationIndex,
  isGenerating,
}) => {
  if (!showRecommendations) return null;

  return (
    <div className="fixed sm:left-auto sm:right-6 sm:bottom-6 sm:top-auto sm:h-auto sm:max-h-[80vh] inset-0 sm:w-96 border border-slate-200 sm:rounded-2xl bg-white/95 backdrop-blur-md flex flex-col z-50 shadow-2xl text-left overflow-hidden ring-1 ring-slate-900/5 animate-in slide-in-from-bottom-5">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2 font-black text-slate-800 text-base">
          <Sparkles className="w-5 h-5 text-brand-blue" />排程方案推荐
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500" 
          title="关闭推荐窗口" 
          onClick={() => setShowRecommendations(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {generateError ? (
        <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <span className="text-sm font-medium text-slate-700">{generateError}</span>
          <Button variant="outline" className="mt-4" onClick={() => setShowRecommendations(false)}>确认</Button>
        </div>
      ) : (
        <>
          <div className="bg-slate-50/80 border-b border-slate-200 p-3 flex flex-col gap-2 relative z-10 shrink-0">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-slate-300 hover:bg-slate-50 shadow-sm" 
                disabled={!recommendations || recommendations.length === 0 || activeRecommendationIndex === 0}
                onClick={() => setActiveRecommendationIndex(Math.max(0, activeRecommendationIndex - 1))}
              >
                上一个
              </Button>
              <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
                {recommendations && recommendations.length > 0 ? `${activeRecommendationIndex + 1} / ${recommendations.length}` : '0 / 0'}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-slate-300 hover:bg-slate-50 shadow-sm" 
                disabled={!recommendations || recommendations.length === 0 || activeRecommendationIndex === recommendations.length - 1}
                onClick={() => setActiveRecommendationIndex(Math.min(recommendations.length - 1, activeRecommendationIndex + 1))}
              >
                下一个
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50/30">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
                <span className="text-sm font-medium">正在计算最佳组合...</span>
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              recommendations.map((req, idx) => (
                <div 
                  key={req.id} 
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${idx === activeRecommendationIndex ? 'bg-white border-brand-blue ring-2 ring-brand-blue/20 shadow-md' : 'bg-white border-slate-200 hover:border-brand-blue/40 hover:shadow-sm opacity-80 hover:opacity-100'}`}
                  onClick={() => setActiveRecommendationIndex(idx)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-black flex-1 break-all ${idx === activeRecommendationIndex ? 'text-brand-blue' : 'text-slate-800'}`}>{req.name}</span>
                    <span className={`shrink-0 text-xs px-2.5 py-1 rounded-md font-bold ml-2 ${req.matchLevel.includes('优先') ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-500/20' : req.matchLevel.includes('优选') ? 'bg-green-100 text-green-700 ring-1 ring-green-500/20' : 'bg-amber-100 text-amber-700 ring-1 ring-amber-500/20'}`}>
                      {req.matchLevel}
                    </span>
                  </div>
                  <div className="text-sm mt-3 relative space-y-1">
                    {(req.reason || '').split('\n').map((line: string, i: number) => (
                      <div 
                        key={i} 
                        className={`whitespace-pre-wrap flex items-center ${idx === activeRecommendationIndex ? 'text-slate-700 font-medium' : 'text-slate-500'}`}
                      >
                        {i > 0 && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2 inline-block"></span>}
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 flex flex-col items-center justify-center text-slate-500">
                <X className="w-10 h-10 text-slate-300 mb-3" />
                <span className="text-sm font-medium">未找到符合条件的方案</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
