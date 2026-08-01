import * as fs from 'fs';
import * as path from 'path';
import { ocrPages as existingOcrPages } from './ocr_data';

function combine() {
  const page1 = existingOcrPages[0];
  const page2 = fs.readFileSync(path.join(process.cwd(), 'scripts', 'page2.txt'), 'utf-8').trim();
  const page3 = fs.readFileSync(path.join(process.cwd(), 'scripts', 'page3.txt'), 'utf-8').trim();
  const page4 = fs.readFileSync(path.join(process.cwd(), 'scripts', 'page4.txt'), 'utf-8').trim();
  const page5 = fs.readFileSync(path.join(process.cwd(), 'scripts', 'page5.txt'), 'utf-8').trim();
  const page6 = fs.readFileSync(path.join(process.cwd(), 'scripts', 'page6.txt'), 'utf-8').trim();

  const allPages = [page1, page2, page3, page4, page5, page6];

  const fileContent = `export const ocrPages = ${JSON.stringify(allPages, null, 2)};\n`;
  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'ocr_data.ts'), fileContent, 'utf-8');
  console.log('Successfully combined all 6 pages into ocr_data.ts!');
}

combine();
