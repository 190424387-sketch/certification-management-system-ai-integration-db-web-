import React from 'react';

interface HighlightTextProps {
  text: string;
  highlight?: string;
}

export const ScheduleHighlightText: React.FC<HighlightTextProps> = ({ text, highlight }) => {
   if (!text) return null;

   const strText = String(text);
   
   // Split by system prefix. 
   // Allows system names that start with alphanumeric, optionally followed by Chinese.
   // e.g. "ITSMS:", "Q:", "Q高级:", "HACCP:" 
   // This correctly handles missing spaces like "实习审核员HACCP:审核员" -> "实习审核员" and "HACCP"
   const parts = strText.split(/([A-Za-z0-9]+(?:[\u4e00-\u9fa5]*))[:：]/);
   
   let blocks: { system: string | null; content: string; originalIndex: number }[] = [];
   
   if (parts[0]) blocks.push({ system: null, content: parts[0], originalIndex: 0 });
   
   for (let i = 1; i < parts.length; i += 2) {
      blocks.push({ system: parts[i], content: parts[i+1] || '', originalIndex: i });
   }

   const getSystemWeight = (sys: string | null) => {
      if (!sys) return -1;
      const upper = sys.toUpperCase();
      const alphaMatch = upper.match(/^[A-Z0-9]+/);
      const alpha = alphaMatch ? alphaMatch[0] : upper;
      
      if (alpha === 'Q') return 1;
      if (alpha === 'E') return 2;
      if (alpha === 'S') return 3;
      if (alpha === 'ISMS') return 4;
      if (alpha === 'ITSMS') return 5;
      
      // Fallback weight to maintain a stable alphabetical order for others
      return 100 + alpha.charCodeAt(0); 
   };

   blocks.sort((a, b) => {
      const weightA = getSystemWeight(a.system);
      const weightB = getSystemWeight(b.system);
      if (weightA !== weightB) {
         return weightA - weightB;
      }
      return a.originalIndex - b.originalIndex;
   });

   let parsedQueries: any[] = [];
   let combinedQueriesRegex = '';
   
   if (highlight) {
      const queries = highlight.split(/[;；,，\s]+/).map(q => q.trim()).filter(Boolean);
      if (queries.length > 0) {
         const escapeRegExp = (str: string) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
         parsedQueries = queries.map(q => {
            const isTwoPairs = /^\d{1,2}\.\d{1,2}$/.test(q);
            const isThreePairs = /^\d{2}\.\d{2}\.\d{2}$/.test(q);
            let regexStr = escapeRegExp(q);
            if (isTwoPairs || isThreePairs) {
               regexStr = `(?<![\\d\\.])` + regexStr + `(?![\\d\\.])`;
            }
            return { q, isTwoPairs, isThreePairs, regexStr };
         });
         combinedQueriesRegex = parsedQueries.map(pq => pq.regexStr).join('|');
      }
   }

    const renderContent = (sysName: string | null, contentStr: string) => {
        if (!combinedQueriesRegex || parsedQueries.length === 0) {
            return <>{contentStr}</>;
        }

        const validQueries = parsedQueries.filter(pq => {
            if (pq.isTwoPairs && sysName) {
                const upperSys = sysName.toUpperCase();
                if (!['ITSMS', 'ISMS', 'IT', 'IS', 'ENMS'].includes(upperSys)) return false;
            }
            return true;
        });

        if (validQueries.length === 0) {
            return <>{contentStr}</>;
        }

        const validCombinedRegex = validQueries.map(pq => pq.regexStr).join('|');
        const hlRegex = new RegExp(`(${validCombinedRegex})`, 'gi');

        const chunks = contentStr.split(hlRegex);
        return chunks.map((c, cIdx) => {
            if (cIdx % 2 === 1) {
                return <mark key={cIdx} className="bg-yellow-300 text-slate-900 font-bold px-0.5 rounded shadow-sm">{c}</mark>;
            }
            return c ? <React.Fragment key={cIdx}>{c}</React.Fragment> : null;
        });
    };

   return (
      <div className="flex flex-col gap-1.5">
         {blocks.map((block, i) => {
            if (!block.system && !block.content.trim()) return null;
            
            let systemEl: React.ReactNode = block.system;
            if (block.system && combinedQueriesRegex) {
               const hlRegex = new RegExp(`^(${combinedQueriesRegex})$`, 'i');
               if (hlRegex.test(block.system)) {
                  systemEl = <span className="bg-yellow-300 text-slate-900 px-0.5 rounded shadow-sm">{block.system}</span>;
               }
            }
            
            return (
               <div key={i} className="leading-relaxed">
                  {block.system && (
                     <span className="font-bold text-slate-800 tracking-tight mr-1">
                        {systemEl}:
                     </span>
                  )}
                  <span className="text-slate-600">
                     {renderContent(block.system, block.content)}
                  </span>
               </div>
            );
         })}
      </div>
   );
};
