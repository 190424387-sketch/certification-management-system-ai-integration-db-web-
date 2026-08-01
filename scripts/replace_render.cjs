const fs = require('fs'); 
const text = fs.readFileSync('src/components/scheduling/ScheduleHighlightText.tsx', 'utf8'); 
const lines = text.split('\n'); 
const start = lines.findIndex(l => l.includes('const renderContent')); 
const end = lines.findIndex((l, i) => i > start && l.trim() === '};'); 
const rep = `    const renderContent = (sysName: string | null, contentStr: string) => {
        if (!combinedQueriesRegex || parsedQueries.length === 0) {
            return <>{contentStr}</>;
        }

        const validQueries = parsedQueries.filter(pq => {
            if ((pq.isTwoPairs || pq.isThreePairs) && sysName) {
                const upperSys = sysName.toUpperCase();
                if (pq.isTwoPairs && !['ITSMS', 'ISMS', 'IT', 'IS', 'ENMS'].includes(upperSys)) return false;
                if (pq.isThreePairs && !['Q', 'E', 'S', 'EC'].includes(upperSys)) return false;
            }
            return true;
        });

        if (validQueries.length === 0) {
            return <>{contentStr}</>;
        }

        const validCombinedRegex = validQueries.map(pq => pq.regexStr).join('|');
        const hlRegex = new RegExp(\`(\${validCombinedRegex})\`, 'gi');

        const chunks = contentStr.split(hlRegex);
        return chunks.map((c, cIdx) => {
            if (cIdx % 2 === 1) {
                return <mark key={cIdx} className="bg-yellow-300 text-slate-900 font-bold px-0.5 rounded shadow-sm">{c}</mark>;
            }
            return c ? <React.Fragment key={cIdx}>{c}</React.Fragment> : null;
        });
    };`; 
lines.splice(start, end - start + 1, rep); 
fs.writeFileSync('src/components/scheduling/ScheduleHighlightText.tsx', lines.join('\n')); 
console.log('Replaced successfully');
