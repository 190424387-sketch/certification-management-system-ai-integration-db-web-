import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { Edit3, Check, Save, RotateCcw, ZoomIn, ZoomOut, FileText, Sparkles } from 'lucide-react';

interface DocxNativeViewerProps {
  filename: string;
  companyInfo: any;
  contactInfo: any;
  feeInfo: any;
  systems: string[];
  bClassRequirements: string[];
  previewResponse?: any;
  certInfo?: any;
  transferInfo?: any;
  documentEdits?: Record<string, Record<string, string>>;
  onSaveEdits?: (filename: string, edits: Record<string, string>) => void;
}

export const DocxNativeViewer: React.FC<DocxNativeViewerProps> = ({
  filename,
  companyInfo,
  contactInfo,
  feeInfo,
  systems,
  bClassRequirements,
  previewResponse,
  certInfo,
  transferInfo,
  documentEdits,
  onSaveEdits
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditable, setIsEditable] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const originalTextsRef = useRef<string[]>([]);

  const loadAndRenderDocx = async () => {
    setLoading(true);
    setError(null);
    try {
      let previewMeta = previewResponse?.previews?.[filename];
      if (!previewMeta && previewResponse?.previews) {
        const normFilename = filename.replace(/\s+/g, ' ').trim().toLowerCase();
        const matchedKey = Object.keys(previewResponse.previews).find(
          k => k.replace(/\s+/g, ' ').trim().toLowerCase() === normFilename
        );
        if (matchedKey) {
          previewMeta = previewResponse.previews[matchedKey];
        }
      }
      if (previewMeta?.type === 'doc') {
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); font-family: system-ui, -apple-system, sans-serif;">
              <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
              <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 12px; font-family: inherit;">二进制 Word 97-2003 格式 (.doc) 预览说明</h3>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: left; margin-bottom: 20px; font-family: inherit;">
                ${previewMeta.message}
              </p>
              <div style="background: #f8fafc; border-radius: 12px; padding: 16px; font-size: 13px; color: #475569; text-align: left; line-height: 1.6; border-left: 4px solid #3b82f6; font-family: inherit;">
                <strong>💡 为什么无法直接预览？</strong><br/>
                传统二进制 .doc 格式非现代 XML 压缩包结构，浏览器前端插件目前无法直接渲染该类二进制文档。但请放心，此文件<strong>已经为您完美装配并安全打包</strong>。当您点击“下一步：生成材料包并下载”后，解包即可直接双击查看与打印使用！
              </div>
            </div>
          `;
        }
        setLoading(false);
        return;
      }

      if (previewMeta?.type === 'pdf') {
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); font-family: system-ui, -apple-system, sans-serif;">
              <div style="font-size: 48px; margin-bottom: 20px;">📕</div>
              <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 12px; font-family: inherit;">PDF 格式模板说明</h3>
              <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: left; margin-bottom: 20px; font-family: inherit;">
                ${previewMeta.message}
              </p>
              <div style="background: #f8fafc; border-radius: 12px; padding: 16px; font-size: 13px; color: #475569; text-align: left; line-height: 1.6; border-left: 4px solid #10b981; font-family: inherit;">
                <strong>💡 提示信息</strong><br/>
                PDF 属于高保真不可编辑的只读模板。为了保证最纯正的书面格式，系统已经为您将该 PDF 模板原封不动、高精度地安全合规归档进申报材料压缩包。当您点击并解包后，可直接进行打印并进行物理手写或盖章。
              </div>
            </div>
          `;
        }
        setLoading(false);
        return;
      }

      const res = await fetch('/api/templates/render-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          companyInfo,
          contactInfo,
          feeInfo,
          systems,
          bClassRequirements,
          certInfo,
          transferInfo,
          documentEdits
        })
      });

      if (!res.ok) {
        throw new Error('无法渲染该文档');
      }

      if (filename.endsWith('.txt')) {
        const text = await res.text();
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre style="font-family: monospace; white-space: pre-wrap; padding: 24px; background: #fafafa; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #1e293b;">${text}</pre>`;
        }
        setLoading(false);
        return;
      }

      const arrayBuffer = await res.arrayBuffer();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          experimental: true,
          useBase64URL: true,
          useLayoutWithTabs: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true
        } as any);

        // Record original paragraph texts for differential tracking
        setTimeout(() => {
          if (containerRef.current) {
            const elements = containerRef.current.querySelectorAll('p');
            const originalTexts: string[] = [];
            elements.forEach((el, index) => {
              el.setAttribute('data-edit-index', index.toString());
              originalTexts.push(el.textContent || '');
            });
            originalTextsRef.current = originalTexts;
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('Docx render error:', err);
      setError(err.message || '文档渲染失败');
    } finally {
      setLoading(false);
    }
  };

  const editsString = JSON.stringify(documentEdits?.[filename] || {});

  useEffect(() => {
    loadAndRenderDocx();
  }, [filename, companyInfo, contactInfo, feeInfo, systems, previewResponse, certInfo, transferInfo, editsString]);

  const handleSave = () => {
    if (containerRef.current && onSaveEdits) {
      const edits: Record<string, string> = {};
      const currentElements = containerRef.current.querySelectorAll('p');
      currentElements.forEach((el) => {
        const indexStr = el.getAttribute('data-edit-index');
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          const originalText = (originalTextsRef.current[index] || '').replace(/\u00a0/g, ' ').trim();
          const currentText = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
          if (originalText && currentText && originalText !== currentText) {
            edits[originalText] = currentText;
          }
        }
      });
      
      onSaveEdits(filename, edits);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const toggleEditable = () => {
    const nextEditable = !isEditable;
    setIsEditable(nextEditable);
    if (containerRef.current) {
      containerRef.current.contentEditable = nextEditable ? 'true' : 'false';
      if (nextEditable) {
        containerRef.current.focus();
      } else {
        handleSave();
      }
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-300/80 shadow-lg">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-medium border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <FileText className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-100 max-w-[280px] truncate" title={filename}>
            {filename}
          </span>
          <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[11px] font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 样式排版完全对齐
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setZoom(prev => Math.max(50, prev - 10))}
              className="p-1 hover:bg-slate-700 rounded transition text-slate-300"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono w-12 text-center text-slate-300">{zoom}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(150, prev + 10))}
              className="p-1 hover:bg-slate-700 rounded transition text-slate-300"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Edit Toggle & Save Buttons */}
          {isEditable ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  handleSave();
                  setIsEditable(false);
                  if (containerRef.current) containerRef.current.contentEditable = 'false';
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存并同步修改</span>
              </button>
            </div>
          ) : (
            <button
              onClick={toggleEditable}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 transition text-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
              <span>开启在线编辑</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={loadAndRenderDocx}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            title="重新渲染原文档"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Document Render Area */}
      <div className="flex-1 overflow-auto p-6 bg-slate-200/90 relative flex justify-center">
        {loading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3 bg-slate-900/90 px-6 py-5 rounded-2xl border border-slate-800 text-white shadow-2xl">
              <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-200">正在严格遵照原文样式格式在线渲染...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-white flex items-center justify-center p-6 z-10 text-center">
            <div className="max-w-md">
              <p className="text-red-500 font-bold mb-2">文档渲染失败</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                onClick={loadAndRenderDocx}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700"
              >
                重试装载
              </button>
            </div>
          </div>
        )}

        {/* Global Styles for docx-preview elements - strict 1:1 alignment with original Word template */}
        <style>{`
          .docx-wrapper {
            background: transparent !important;
            padding: 24px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 24px !important;
            box-sizing: border-box !important;
            min-height: 100% !important;
          }
          .docx-wrapper > section {
            background: white !important;
            box-shadow: 0 10px 30px -5px rgba(0,0,0,0.15), 0 0 2px rgba(0,0,0,0.1) !important;
            margin-bottom: 24px !important;
            border-radius: 4px !important;
            transition: transform 0.2s ease;
            color: #000000 !important;
            font-family: "SimSun", "Songti SC", "STSong", "Microsoft YaHei", sans-serif !important;
            box-sizing: border-box !important;
            position: relative !important;
          }
          
          /* Native table copy layout & alignments (avoid breaking custom document borders/paddings) */
          .docx-wrapper table {
            margin-top: 12px !important;
            margin-bottom: 12px !important;
          }
          
          /* Let native margins and paddings take precedence to reproduce the exact 1:1 format of the Word document */
          
          [contenteditable="true"] .docx-wrapper > section {
            outline: 2px dashed #3b82f6 !important;
            outline-offset: 6px;
            cursor: text;
          }
          [contenteditable="true"] p {
            transition: background-color 0.15s, outline 0.15s;
            border-radius: 2px;
          }
          [contenteditable="true"] p:hover {
            outline: 1px dashed #3b82f6 !important;
            background-color: #eff6ff !important;
            cursor: text;
          }
          [contenteditable="true"] p:focus {
            outline: 2px solid #2563eb !important;
            background-color: #e0f2fe !important;
          }
        `}</style>

        <div
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 my-auto"
        >
          <div
            ref={containerRef}
            className="bg-transparent text-slate-900 min-h-[842px]"
          />
        </div>
      </div>
    </div>
  );
};
