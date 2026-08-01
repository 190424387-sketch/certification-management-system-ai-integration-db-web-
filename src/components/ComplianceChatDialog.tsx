import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Bot, User, Loader2, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { callAI } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ComplianceChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AssistantMessageContent = ({ content, isLast }: { content: string, isLast: boolean }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(isLast);
  const [isThinkExpanded, setIsThinkExpanded] = useState(true);
  
  useEffect(() => {
    if (!isLast) {
      setDisplayedContent(content);
      setIsTyping(false);
      setIsThinkExpanded(false);
      return;
    }

    let i = 0;
    setDisplayedContent('');
    setIsTyping(true);
    setIsThinkExpanded(true);
    
    // Fake streaming effect
    const interval = setInterval(() => {
      setDisplayedContent(content.substring(0, i));
      i += Math.floor(Math.random() * 5) + 1; // 1-5 chars at a time
      if (i > content.length) {
        setDisplayedContent(content);
        setIsTyping(false);
        clearInterval(interval);
        
        // Auto collapse think block after 2 seconds when done
        setTimeout(() => setIsThinkExpanded(false), 2000);
      }
    }, 20); // Fast typing
    
    return () => clearInterval(interval);
  }, [content, isLast]);

  // Parse think block
  const thinkMatch = displayedContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';
  const isThinkComplete = displayedContent.includes('</think>');
  const mainContent = displayedContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();

  return (
    <div className="flex flex-col gap-2">
      {thinkMatch && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 transition-all duration-300">
          <button 
            onClick={() => setIsThinkExpanded(!isThinkExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              {!isThinkComplete && isTyping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
              <span>思考过程</span>
            </div>
            {isThinkExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          <AnimatePresence initial={false}>
            {isThinkExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-3 pb-3 text-xs text-slate-500 whitespace-pre-wrap leading-relaxed border-t border-slate-100">
                  {thinkContent}
                  {!isThinkComplete && isTyping && <span className="inline-block w-1 h-3 ml-1 bg-slate-400 animate-pulse" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {mainContent && (
        <div className="prose prose-sm max-w-none prose-p:leading-relaxed text-slate-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainContent}</ReactMarkdown>
        </div>
      )}
      
      {isThinkComplete && isTyping && !mainContent && (
        <div className="flex items-center gap-2 text-sm text-slate-400 h-6">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>正在生成结论...</span>
        </div>
      )}
      
      {!isThinkComplete && !isTyping && !mainContent && !thinkMatch && (
        <div className="prose prose-sm max-w-none prose-p:leading-relaxed text-slate-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export function ComplianceChatDialog({ open, onOpenChange }: ComplianceChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: '您好，我是合规咨询助手。您可以向我咨询关于申请材料文件要求、业务范围资质要求、许可要求、环评、CCC认证等相关合规问题。'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context from previous messages
      const conversationHistory = messages.map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n');
      
      const systemPrompt = `你是一个专业的认证合规咨询助手。请基于项目评审的策略规则，回答用户的合规性问题。你可以解答关于：申请材料文件要求，特定业务范围的资质要求，是否需要行政许可、环评报告、CCC强制性认证等。
机加工行业合规提示：机加工不强制要求环评许可，提供排污备案手续也可以。
请保持回答专业、客观、严谨，分点说明。
【重要指令】请务必按以下格式输出你的回答：
首先，用 <think> 和 </think> 标签包裹你的思考、分析和推理过程。
然后，在标签之后，输出最终的合规结论。`;
      
      const prompt = `
${systemPrompt}

对话历史：
${conversationHistory}
用户: ${userMsg.content}
助手: `;

      const response = await callAI(prompt, { module: 'audit', temperature: 0.2 });
      
      const assistantMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response.text || '抱歉，我无法回答这个问题。' 
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**发生错误：** ${error.message || '请求失败，请稍后重试。'}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center isolate">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Dialog Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 25 }}
            className="relative w-full max-w-[680px] h-[85vh] bg-gradient-to-b from-white via-slate-50/98 to-slate-100/98 flex flex-col rounded-[32px] shadow-[0_30px_80px_-15px_rgba(15,23,42,0.35),0_15px_35px_-10px_rgba(15,23,42,0.2),inset_0_1.5px_0_0_rgba(255,255,255,0.9),inset_0_-1.5px_0_0_rgba(15,23,42,0.05)] border border-slate-200/80 overflow-hidden z-10 sm:mx-4"
          >
            <div className="px-6 py-4.5 border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50/80 to-white/90 backdrop-blur-md shrink-0 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] z-10">
              <h2 className="text-lg flex items-center gap-3 text-slate-800 font-black m-0 tracking-tight">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_3px_10px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] border border-indigo-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 tracking-tight leading-tight">合规咨询助手</span>
                  <span className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase mt-0.5">Expert AI Compliance Advisor</span>
                </div>
              </h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-gradient-to-b from-slate-100/60 via-slate-50/40 to-slate-100/60 shadow-[inset_0_10px_20px_-10px_rgba(15,23,42,0.05),inset_0_-10px_20px_-10px_rgba(15,23,42,0.05)]">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all border ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 border-indigo-200/60 shadow-[0_2px_5px_rgba(99,102,241,0.1)]' 
                      : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border-slate-300/40 shadow-[0_2px_5px_rgba(15,23,42,0.05)]'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed transition-all ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-[0_4px_15px_-3px_rgba(99,102,241,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-indigo-600/50 rounded-tr-sm font-medium' 
                      : 'bg-white border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)] rounded-tl-sm flex-1'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <AssistantMessageContent content={msg.content} isLast={msg.id === messages[messages.length - 1].id} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex gap-3 max-w-[85%] flex-row">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300/40 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl text-sm bg-white border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.04)] text-slate-700 rounded-tl-sm flex items-center gap-3">
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-indigo-500" />
                  <span className="text-slate-500 font-medium">正在思考...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-5 bg-gradient-to-t from-slate-50 via-white to-white border-t border-slate-200/80 shrink-0 shadow-[0_-4px_20px_rgba(15,23,42,0.02)] z-10">
          <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入您的合规问题 (例如: 申请ISO9001需要环评报告吗？)..."
                className="w-full rounded-2xl border-slate-200 bg-slate-50/50 pr-14 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-[inset_0_2px_4px_rgba(15,23,42,0.05)] h-12 text-slate-800 placeholder:text-slate-400 font-medium transition-all focus:bg-white"
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                className="absolute right-1.5 top-1.5 h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-[0_3px_8px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all duration-200 flex items-center justify-center border border-indigo-600/20"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4.5 h-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    )}
    </AnimatePresence>
  );
}
