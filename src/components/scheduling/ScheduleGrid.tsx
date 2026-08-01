import React, { useEffect, useRef } from 'react';
import { Button } from '../ui/button';

interface ScheduleGridProps {
  scheduleData: any[];
  schedulePage: number;
  setSchedulePage: (page: number | ((prev: number) => number)) => void;
  schedulePageSize: number;
  totalSchedulePages: number;
  paginatedScheduleData: any[];
  recommendations: any[] | null;
  activeRecommendationIndex: number;
  isPicking?: boolean;
  onCellClick?: (val: string) => void;
  onClose?: () => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  scheduleData,
  schedulePage,
  setSchedulePage,
  schedulePageSize,
  totalSchedulePages,
  paginatedScheduleData,
  recommendations,
  activeRecommendationIndex,
  isPicking,
  onCellClick,
  onClose
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!scheduleData || scheduleData.length === 0) return null;

  const maxDays = scheduleData?.[0]?.totalRenderDays || 62;
  const tableWidth = 160 + maxDays * 72;

  const activeRec = recommendations?.[activeRecommendationIndex];

  useEffect(() => {
    if (activeRec && scrollRef.current) {
       const activeIdx = activeRec.teacherIndices ? activeRec.teacherIndices[0] : activeRec.teacherIndex;
       const el = document.getElementById(`schedule-row-${activeIdx}`);
       if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
    }
  }, [activeRecommendationIndex, activeRec]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white/95 backdrop-blur-xl w-full h-full shadow-2xl overflow-hidden ring-1 ring-slate-900/10">
       <div className="bg-slate-800 p-2.5 flex justify-between items-center text-sm font-medium z-10 shrink-0 text-white shadow-sm cursor-move">
          <div className="flex items-center gap-2">
             <span className="font-bold flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
               排程智能提取视图
             </span>
             <span className="bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-300 ml-2">本地共 {scheduleData.length} 条</span>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-300 hover:text-white" onClick={() => setSchedulePage(1)} disabled={schedulePage === 1}>首页</Button>
             <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-300 hover:text-white" onClick={() => setSchedulePage(p => Math.max(1, p - 1))} disabled={schedulePage === 1}>上一页</Button>
             <span className="px-2 text-xs font-mono">{schedulePage} / {Math.max(1, totalSchedulePages)}</span>
             <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-300 hover:text-white" onClick={() => setSchedulePage(p => Math.min(totalSchedulePages, p + 1))} disabled={schedulePage === totalSchedulePages}>下一页</Button>
             
             {onClose && (
                <button onClick={onClose} className="ml-4 hover:bg-red-500 hover:text-white p-1 rounded transition-colors text-slate-400 w-6 h-6 flex items-center justify-center">
                   ✕
                </button>
             )}
          </div>
       </div>
       <div className="flex-1 overflow-auto custom-scrollbar relative" ref={scrollRef}>
          <table className="border-collapse text-[11px] table-fixed w-full" style={{ minWidth: `${tableWidth}px` }}>
             <colgroup>
               <col style={{ width: '40px' }} />
               <col style={{ width: '120px' }} />
               {Array.from({ length: maxDays * 2 }).map((_, i) => (
                 <col key={i} style={{ width: '36px' }} />
               ))}
             </colgroup>
             <thead className="sticky top-0 bg-slate-100/90 backdrop-blur z-20 shadow-sm">
                <tr className="hover:bg-transparent border-b-2 border-slate-700">
                   <th rowSpan={3} className="w-[40px] sticky left-0 top-0 z-40 bg-slate-100 border-r-2 border-slate-700 text-center px-1 font-bold">序号</th>
                   <th rowSpan={3} className="w-[120px] sticky left-[40px] top-0 z-40 bg-slate-100 border-r-2 border-slate-700 font-bold max-w-[120px] overflow-hidden">姓名/备注</th>
                   <th colSpan={Math.min(31, maxDays) * 2} className="border-r-2 border-slate-700 text-center py-0.5 font-bold bg-blue-50/80 text-blue-900 border-b-2 border-slate-700">主要周期</th>
                   {maxDays > 31 && <th colSpan={(maxDays - 31) * 2} className="border-r-2 border-slate-700 text-center py-0.5 font-bold bg-emerald-50/80 text-emerald-900 border-b-2 border-slate-700">延展期</th>}
                </tr>
                <tr className="hover:bg-transparent border-b-2 border-slate-700">
                   {Array.from({length: maxDays}).map((_, i) => (
                      <th key={i} colSpan={2} className={`border-r-2 border-slate-700 text-center px-1 py-0.5 border-b-2 border-slate-700 font-bold w-[72px] ${i < 31 ? 'bg-blue-50/30' : 'bg-emerald-50/30'}`}>
                         <div className="text-slate-800 font-bold">{i % 31 + 1}</div>
                      </th>
                   ))}
                </tr>
                <tr className="hover:bg-transparent border-b-2 border-slate-700">
                   {Array.from({length: maxDays}).map((_, i) => (
                      <React.Fragment key={i}>
                        <th className={`border-r-2 border-slate-700 text-center py-0.5 text-[10px] text-slate-800 font-bold w-[36px] min-w-[36px] ${i < 31 ? 'bg-blue-50/10' : 'bg-emerald-50/10'}`}>上</th>
                        <th className={`border-r-2 border-slate-700 text-center py-0.5 text-[10px] text-slate-800 font-bold w-[36px] min-w-[36px] ${i < 31 ? 'bg-blue-50/10' : 'bg-emerald-50/10'}`}>下</th>
                      </React.Fragment>
                   ))}
                </tr>
             </thead>
             <tbody>
                {paginatedScheduleData.map((row: any, localIdx: number) => {
                   const globalIdx = (schedulePage - 1) * schedulePageSize + localIdx;
                   
                   let isTeacherActive = false;
                   let isLead = false;
                   let isInP1 = false;
                   let isInP2 = false;

                   if (activeRec) {
                      if (activeRec.p1TeacherIndices) {
                         isInP1 = activeRec.p1TeacherIndices.includes(globalIdx);
                         isInP2 = activeRec.p2TeacherIndices.includes(globalIdx);
                         isTeacherActive = isInP1 || isInP2;
                         
                         if (activeRec.teacherIndices && activeRec.teacherIndices.length > 0) {
                             isLead = activeRec.teacherIndices[0] === globalIdx;
                         } else {
                             isLead = activeRec.teacherIndex === globalIdx;
                         }
                      } else {
                          // Fallback for older data format
                          if (activeRec.teacherIndices) {
                             const idxInGroup = activeRec.teacherIndices.indexOf(globalIdx);
                             if (idxInGroup !== -1) {
                                isTeacherActive = true;
                                if (idxInGroup === 0) isLead = true;
                                isInP1 = idxInGroup === 0;
                                isInP2 = true;
                             }
                          } else if (activeRec.teacherIndex === globalIdx) {
                             isTeacherActive = true;
                             isLead = true;
                             isInP1 = true;
                             isInP2 = true;
                          }
                      }
                   }

                   return (
                      <tr key={localIdx} id={`schedule-row-${globalIdx}`} className={`hover:bg-slate-50 transition-all duration-300 ${isTeacherActive ? 'bg-blue-50/60' : ''}`}>
                         <td className="sticky left-0 z-10 bg-white/95 backdrop-blur border-r-2 border-b-2 border-slate-700 text-center px-1 text-slate-800 font-bold max-w-[40px] truncate" title={(globalIdx + 1).toString()}>{globalIdx + 1}</td>
                         <td className="sticky left-10 z-10 bg-white/95 backdrop-blur border-r-2 border-b-2 border-slate-700 font-bold px-2 py-1 truncate max-w-[120px] text-slate-900" title={row.name}>
                            <span className="flex items-center gap-1">
                               {row.name}
                               {isTeacherActive && isLead && <span className="text-[9px] bg-emerald-500 text-white px-1 leading-tight rounded-sm shadow-sm scale-90 origin-left font-bold">主</span>}
                               {isTeacherActive && !isLead && <span className="text-[9px] bg-blue-500 text-white px-1 leading-tight rounded-sm shadow-sm scale-90 origin-left font-bold">副</span>}
                            </span>
                         </td>
                         {(() => {
                            if (!row.days) return null;
                            
                            const rowCells: any[] = [];
                            row.days.slice(0, maxDays).forEach((day: any, dIdx: number) => {
                               const amGlobalCol = dIdx * 2;
                               const pmGlobalCol = dIdx * 2 + 1;
                               
                               const isAmHighlightedP1 = isTeacherActive && activeRec?.p1Cells?.includes(amGlobalCol) && isInP1;
                               const isAmHighlightedP2 = isTeacherActive && activeRec?.p2Cells?.includes(amGlobalCol) && isInP2;
                               
                               rowCells.push({
                                  text: day.am || '',
                                  bgColor: day.amBg || '',
                                  globalCol: amGlobalCol,
                                  isHighlightedP1: isAmHighlightedP1,
                                  isHighlightedP2: isAmHighlightedP2,
                                  isPmItem: false,
                               });
                               
                               const isPmHighlightedP1 = isTeacherActive && activeRec?.p1Cells?.includes(pmGlobalCol) && isInP1;
                               const isPmHighlightedP2 = isTeacherActive && activeRec?.p2Cells?.includes(pmGlobalCol) && isInP2;

                               rowCells.push({
                                  text: day.pm || '',
                                  bgColor: day.pmBg || '',
                                  globalCol: pmGlobalCol,
                                  isHighlightedP1: isPmHighlightedP1,
                                  isHighlightedP2: isPmHighlightedP2,
                                  isPmItem: true,
                               });
                            });
                            
                            const groupedCells: any[] = [];
                            let currentGroup: any = null;
                            for (const cell of rowCells) {
                               if (currentGroup && currentGroup.text === cell.text && currentGroup.bgColor === cell.bgColor && currentGroup.isHighlightedP1 === cell.isHighlightedP1 && currentGroup.isHighlightedP2 === cell.isHighlightedP2 && currentGroup.text !== '') {
                                   currentGroup.colSpan += 1;
                               } else {
                                   if (currentGroup) groupedCells.push(currentGroup);
                                   currentGroup = { ...cell, colSpan: 1 };
                               }
                            }
                            if (currentGroup) groupedCells.push(currentGroup);
                            
                            return groupedCells.map((cellGroup: any) => {
                               const borderClass = 'border-r-2 border-b-2 border-slate-700';
                               const highlightClass = cellGroup.isHighlightedP1 ? 'bg-emerald-200 text-emerald-900 font-bold shadow-[inset_0_0_0_1px_#34d399]' : cellGroup.isHighlightedP2 ? 'bg-blue-200 text-blue-900 font-bold shadow-[inset_0_0_0_1px_#60a5fa]' : '';
                               const customStyle = !cellGroup.isHighlightedP1 && !cellGroup.isHighlightedP2 && cellGroup.bgColor ? { backgroundColor: cellGroup.bgColor } : {};
                               
                               return (
                                  <td 
                                    key={`cell-${cellGroup.globalCol}`}
                                    colSpan={cellGroup.colSpan}
                                    style={customStyle}
                                    className={`px-1 py-1 text-center overflow-hidden whitespace-nowrap transition-all duration-300 ${borderClass} ${highlightClass} ${isPicking ? 'cursor-crosshair hover:bg-amber-100' : ''}`}
                                    onClick={() => isPicking && onCellClick?.(cellGroup.text)}
                                    title={cellGroup.text}
                                  >
                                     <span className="truncate block w-full text-[10px] leading-tight select-none text-slate-800 font-medium">{cellGroup.text}</span>
                                  </td>
                               );
                            });
                         })()}
                      </tr>
                   );
                })}
             </tbody>
          </table>
       </div>
    </div>
  );
};
