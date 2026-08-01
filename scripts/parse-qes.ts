import fs from 'fs';

const ocrText = fs.readFileSync('qes.txt', 'utf-8');

const lines = ocrText.split('\n').filter(Boolean);

const result: Record<string, { Q: string, E: string, S: string }> = {};

for (const line of lines) {
  const parts = line.split(/\s+/);
  // Match lines with at least 3 parts that might be codes
  let currentCode = "";
  
  let qesIndex = 0; // 0=Q, 1=E, 2=S
  for (let i = 0; i < parts.length; i++) {
     const p = parts[i].replace('*', '');
     
     if (/^\d{2}\.\d{2}/.test(p)) {
        currentCode = p;
     } else if (p === '一' || p === '二' || p === '三') {
        if (currentCode) {
           if (!result[currentCode]) {
              result[currentCode] = { Q: '', E: '', S: '' };
           }
           if (qesIndex === 0) result[currentCode].Q = p;
           else if (qesIndex === 1) result[currentCode].E = p;
           else if (qesIndex === 2) result[currentCode].S = p;
           
           qesIndex++;
        }
     }
  }
}

fs.writeFileSync('src/data/qes-risks.json', JSON.stringify(result, null, 2));
console.log('Done!');
