import React, { useState, useRef, useEffect } from 'react';
import { 
  Megaphone,
  Hammer,
  RefreshCw,
  Bug,
  Folder, 
  Plus, 
  ChevronDown, 
  ArrowUp, 
  Mic,
  Hand,
  Sparkles,
  User,
  Copy,
  Check,
  Loader2,
  FileCode,
  RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ASTSymbol, RAGChunk } from '../services/vaultdoc';
import { lanceDb } from '../services/vaultdoc';
import { getStoredProviderConfig, saveProviderConfig } from '../services/ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: RAGChunk[];
}

interface ChatStudioProps {
  symbols?: ASTSymbol[];
  activeProject?: string;
  onSelectProject?: () => void;
  onNavigateTab?: (tab: 'architecture' | 'spec' | 'audit' | 'tests') => void;
  onSelectCitation?: (node: { file?: string; symbol?: string }) => void;
}

export const ChatStudio = ({ 
  symbols = [], 
  activeProject = 'DATADUKAN_PRO',
  onSelectProject,
  onNavigateTab,
  onSelectCitation 
}: ChatStudioProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>(() => {
    const config = getStoredProviderConfig();
    return config.model || '5.6 Terra Medium';
  });
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isAstContextPickerOpen, setIsAstContextPickerOpen] = useState(false);
  const [attachedSymbols, setAttachedSymbols] = useState<ASTSymbol[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableModels = [
    '5.6 Terra Medium',
    'qwen2.5-coder:7b',
    'qwen2.5-coder:14b',
    'deepseek-coder:6.7b',
    'codellama:7b',
    'llama3.2:3b'
  ];

  useEffect(() => {
    const handleConfigChange = () => {
      const config = getStoredProviderConfig();
      if (config.model) {
        setCurrentModel(config.model);
      }
    };
    window.addEventListener('vaultdoc_config_change', handleConfigChange);
    return () => window.removeEventListener('vaultdoc_config_change', handleConfigChange);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSelectModel = (model: string) => {
    setCurrentModel(model);
    const config = getStoredProviderConfig();
    saveProviderConfig({ ...config, model });
    setIsModelDropdownOpen(false);
  };

  const triggerIntent = (intent: 'explore' | 'spec' | 'audit' | 'tests') => {
    switch (intent) {
      case 'explore':
        if (onNavigateTab) {
          onNavigateTab('architecture');
        } else {
          handleSendQuery('Explore and understand high-level architecture, API routing, and DB schemas.');
        }
        break;
      case 'spec':
        if (onNavigateTab) {
          onNavigateTab('spec');
        } else {
          handleSendQuery('Build a new feature, app, or tool by synthesizing codebase AST symbols.');
        }
        break;
      case 'audit':
        if (onNavigateTab) {
          onNavigateTab('audit');
        } else {
          handleSendQuery('Review code, uncommitted working diffs, and suggest architectural improvements.');
        }
        break;
      case 'tests':
        if (onNavigateTab) {
          onNavigateTab('tests');
        } else {
          handleSendQuery('Fix issues and failures, audit security flaws, and generate test suites.');
        }
        break;
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || isStreaming) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    try {
      const citations = await lanceDb.search(textToSend, { symbols, limit: 5 });

      if (attachedSymbols.length > 0) {
        attachedSymbols.forEach(sym => {
          if (!citations.some(c => c.symbol === sym.symbol && c.file === sym.filePath)) {
            citations.unshift({
              file: sym.filePath,
              symbol: sym.symbol,
              type: sym.type,
              code: sym.code,
              distance: 0.05
            });
          }
        });
      }

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, citations } : m));

      let contextStr = '';
      if (citations.length > 0) {
        contextStr = `Codebase AST Context (from ${activeProject}):\n` + 
          citations.map(c => `File: ${c.file}\nSymbol: ${c.symbol} (${c.type})\n\`\`\`\n${c.code}\n\`\`\``).join('\n\n') + '\n\n';
      }

      const config = getStoredProviderConfig();
      const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
      const prompt = `${contextStr}User Request: ${textToSend}\n\nPlease ground your response in the provided codebase context and AST symbols.`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey && config.apiKey.trim().length > 0) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      } else {
        headers['Authorization'] = 'Bearer local';
      }

      const isOpenAIFormat = config.provider === 'lmstudio' || config.provider === 'custom' || baseUrl.endsWith('/v1');
      const endpointUrl = isOpenAIFormat 
        ? (baseUrl.endsWith('/v1') ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`)
        : `${baseUrl}/api/generate`;

      const requestBody = isOpenAIFormat
        ? JSON.stringify({
            model: config.model || currentModel,
            messages: [
              { role: 'system', content: 'You are VaultDoc, a high-performance air-gapped codebase intelligence engine.' },
              { role: 'user', content: prompt }
            ],
            stream: true
          })
        : JSON.stringify({
            model: config.model || currentModel,
            prompt,
            stream: true
          });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok || !res.body) {
        throw new Error(`AI model response returned ${res.status}: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });

        if (isOpenAIFormat) {
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.substring(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed.choices?.[0]?.delta?.content;
                if (token) {
                  setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + token } : m));
                }
              } catch (_) {}
            }
          }
        } else {
          const lines = chunkStr.split('\n').filter(l => l.trim().length > 0);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + parsed.response } : m));
              }
            } catch (_) {}
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        content: `⚠️ **Offline Notice:** Unable to reach local model (${err.message}). Ensure Ollama is running (\`ollama serve\`) or configure custom endpoint in Settings.`
      } : m));
    } finally {
      setIsStreaming(false);
      setAttachedSymbols([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 h-full bg-[#131316] flex flex-col overflow-hidden relative select-none">
      
      {/* Top Banner Left Tag: Get Plus Pill */}
      <div className="absolute top-3 left-4 z-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#23153c] text-[#c084fc] border border-[#7e22ce]/30 text-xs font-medium backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Get Plus</span>
        </div>
      </div>

      {/* Scrollable Center Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-6 w-full max-w-[780px] mx-auto justify-center">
        
        {/* If no conversation started yet, render the Center Hero + Cards */}
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center w-full animate-fadeIn my-auto pb-6">
            
            {/* Center Cloud / Terminal Glyph (Clean floating outline icon matching Codex) */}
            <div className="flex items-center justify-center text-slate-400/80 mb-6">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                <path d="M10 13l2 2-2 2" />
              </svg>
            </div>

            {/* Hero Heading */}
            <h1 className="text-2xl md:text-[28px] font-medium text-white/95 tracking-tight text-center mb-8 font-sans">
              What should we build?
            </h1>

            {/* 1x4 Action Cards Grid (Horizontal Row) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-0">
              
              {/* Card 1: Explore */}
              <button 
                type="button"
                onClick={() => triggerIntent('explore')} 
                className="bg-[#1c1c20] hover:bg-[#242429] border border-white/[0.06] hover:border-white/20 transition-all rounded-2xl p-4 text-left cursor-pointer flex flex-col justify-between h-[108px] group shadow-sm"
              >
                <Megaphone className="w-4 h-4 text-sky-400 group-hover:scale-105 transition-transform" />
                <p className="font-normal text-white/90 text-[13px] leading-snug">
                  Explore and understand code
                </p>
              </button>

              {/* Card 2: Build */}
              <button 
                type="button"
                onClick={() => triggerIntent('spec')} 
                className="bg-[#1c1c20] hover:bg-[#242429] border border-white/[0.06] hover:border-white/20 transition-all rounded-2xl p-4 text-left cursor-pointer flex flex-col justify-between h-[108px] group shadow-sm"
              >
                <Hammer className="w-4 h-4 text-purple-400 group-hover:scale-105 transition-transform" />
                <p className="font-normal text-white/90 text-[13px] leading-snug">
                  Build a new feature, app, or tool
                </p>
              </button>

              {/* Card 3: Review */}
              <button 
                type="button"
                onClick={() => triggerIntent('audit')} 
                className="bg-[#1c1c20] hover:bg-[#242429] border border-white/[0.06] hover:border-white/20 transition-all rounded-2xl p-4 text-left cursor-pointer flex flex-col justify-between h-[108px] group shadow-sm"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform" />
                <p className="font-normal text-white/90 text-[13px] leading-snug">
                  Review code and suggest changes
                </p>
              </button>

              {/* Card 4: Fix */}
              <button 
                type="button"
                onClick={() => triggerIntent('tests')} 
                className="bg-[#1c1c20] hover:bg-[#242429] border border-white/[0.06] hover:border-white/20 transition-all rounded-2xl p-4 text-left cursor-pointer flex flex-col justify-between h-[108px] group shadow-sm"
              >
                <Bug className="w-4 h-4 text-amber-400 group-hover:scale-105 transition-transform" />
                <p className="font-normal text-white/90 text-[13px] leading-snug">
                  Fix issues and failures
                </p>
              </button>

            </div>

          </div>
        ) : (
          /* Conversational Feed */
          <div className="flex-1 space-y-4 w-full pb-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Session Active ({activeProject})
              </span>
              <button 
                type="button"
                onClick={() => setMessages([])}
                className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset session"
              >
                <RotateCcw className="w-3 h-3" />
                <span>New Session</span>
              </button>
            </div>

            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-white/10 text-white shadow-md'
                      : 'bg-[#1e1e23]/90 border border-white/10 text-slate-200 shadow-lg'
                  }`}>
                    
                    {/* Citations Tag Header */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mb-3 pb-2 border-b border-white/5">
                        <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Ingested AST Citations
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => onSelectCitation?.({ file: c.file, symbol: c.symbol })}
                              className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-sky-300 flex items-center gap-1 hover:border-sky-400/50 transition-colors"
                            >
                              <FileCode className="w-2.5 h-2.5" />
                              <span>{c.file.split(/[/\\]/).pop()}:{c.symbol}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message Content */}
                    <div className="markdown-body prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {/* Footer / Copy */}
                    <div className="mt-2 pt-1 flex items-center justify-between text-[10px] opacity-60">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity cursor-pointer"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* Floating Bottom Command Dock (Matching Codex Reference Pixel-for-Pixel) */}
      <div className="w-full max-w-[780px] mx-auto px-4 pb-6 z-20">
        
        {/* Project Picker Tab - Tucked behind top of input card */}
        <div className="flex justify-start px-2 -mb-2 relative z-0">
          <button
            type="button"
            onClick={onSelectProject}
            className="inline-flex items-center gap-2 px-3.5 pt-2 pb-3.5 rounded-t-xl bg-[#1c1c1f] text-[#8e8e93] hover:text-white text-xs font-normal transition-colors cursor-pointer border-t border-l border-r border-white/[0.04]"
          >
            <Folder size={14} className="text-[#8e8e93]" />
            <span>Choose project</span>
          </button>
        </div>

        {/* Input Box Container */}
        <div className="bg-[#242428] rounded-[22px] p-4 shadow-[0_15px_35px_rgba(0,0,0,0.5)] border border-white/[0.04] relative z-10 transition-all focus-within:border-white/10">
          
          {/* Prompt Input Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Do anything"
            className="w-full bg-transparent px-1 pt-1 pb-2 text-sm text-white placeholder:text-[#6e6e73] outline-none resize-none font-sans leading-relaxed"
          />

          {/* Bottom Toolbar Control Row */}
          <div className="flex items-center justify-between pt-1">
            
            {/* Left Controls: Plus + Hand (Ask for approval) */}
            <div className="flex items-center gap-3 text-[#8e8e93]">
              
              {/* Add Context Plus Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAstContextPickerOpen(prev => !prev)}
                  className="hover:text-white transition-colors cursor-pointer p-0.5"
                  title="Add context"
                >
                  <Plus size={16} />
                </button>

                {/* Context Picker Dropdown */}
                {isAstContextPickerOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1e1e24] border border-white/10 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Attached AST Symbols ({symbols.length})
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 mt-1">
                      {symbols.slice(0, 15).map((sym, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!attachedSymbols.some(s => s.symbol === sym.symbol)) {
                              setAttachedSymbols(prev => [...prev, sym]);
                            }
                            setIsAstContextPickerOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 text-xs flex items-center justify-between group cursor-pointer"
                        >
                          <span className="text-sky-300 font-mono truncate">{sym.symbol}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{sym.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ask for approval Button (with Hand icon) */}
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-[#8e8e93] hover:text-white transition-colors cursor-pointer py-0.5"
              >
                <Hand size={14} className="stroke-[1.8]" />
                <span>Ask for approval</span>
              </button>
            </div>

            {/* Right Controls: Model Selector, Mic, Submit Button */}
            <div className="flex items-center gap-3 text-[#8e8e93]">
              
              {/* Model Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(prev => !prev)}
                  className="flex items-center gap-1 text-xs text-[#8e8e93] hover:text-white transition-colors cursor-pointer"
                >
                  <span>{currentModel}</span>
                  <ChevronDown size={13} className="opacity-70" />
                </button>

                {isModelDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1e1e24] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-fadeIn">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Models
                    </div>
                    {availableModels.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectModel(m)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                          currentModel === m ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>{m}</span>
                        {currentModel === m && <Check size={13} className="text-sky-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mic Icon */}
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer p-0.5"
                title="Voice input"
              >
                <Mic size={15} />
              </button>

              {/* Send / Arrow Up Button */}
              <button
                type="button"
                onClick={() => handleSendQuery()}
                disabled={(!input.trim() && attachedSymbols.length === 0) || isStreaming}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  input.trim().length > 0
                    ? 'bg-white text-black hover:bg-slate-200'
                    : 'bg-[#3e3e42] text-[#8e8e93] hover:text-white hover:bg-[#4a4a4f]'
                } disabled:pointer-events-none`}
                title="Send query"
              >
                {isStreaming ? (
                  <Loader2 size={13} className="animate-spin text-white" />
                ) : (
                  <ArrowUp size={14} className="stroke-[2.2]" />
                )}
              </button>

            </div>

          </div>

        </div>
      </div>

    </div>
  );
};

export default ChatStudio;
