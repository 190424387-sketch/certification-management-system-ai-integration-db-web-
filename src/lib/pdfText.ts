import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPDF(base64: string): Promise<string> {
  try {
    let b64 = base64;
    if (b64.startsWith('data:')) {
      b64 = b64.split(',')[1];
    }
    
    const binary = atob(b64);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
       uint8Array[i] = binary.charCodeAt(i);
    }
    
    // @ts-ignore
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 100); // Guard against massive documents
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // @ts-ignore
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    if (pdf.numPages > 100) {
       fullText += `\n[Warning: Document too long. Only first 100 pages extracted to maintain efficiency.]`;
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return `(Error extracting text from PDF: ${error instanceof Error ? error.message : String(error)})`;
  }
}
