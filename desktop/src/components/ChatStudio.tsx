import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Loader2, 
  Trash2,
  FileCode
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ASTSymbol, RAGChunk } from '../services/vaultdoc';
import { lanceDb } from '../services/vaultdoc';
import { getStoredProviderConfig } from '../services/ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: RAGChunk[];
}

interface ChatStudioProps {
  symbols?: ASTSymbol[];
}

export const ChatStudio = ({ symbols }: ChatStudioProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **Air-Gapped Codebase Assistant**. All prompts and code chunks are processed **100% locally** via your on-device model.

You can ask me questions about your architecture, AST symbols, database models, or security vulnerabilities.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText,
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
      // 1. Search LanceDB for relevant AST context from active repository
      const citations = await lanceDb.search(userText, { symbols, limit: 5 });

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, citations } : m));

      let contextStr = '';
      if (citations.length > 0) {
        contextStr = 'Codebase AST Context (from local repository index):\n' + citations.map(c => `File: ${c.file}\nSymbol: ${c.symbol} (${c.type})\n\`\`\`\n${c.code}\n\`\`\``).join('\n\n') + '\n\n';
      }

      const config = getStoredProviderConfig();
      const baseUrl = config.baseUrl.replace(/\/$/, '');

      const prompt = `${contextStr}User Question: ${userText}\n\nAnswer concisely and reference AST files and symbols when applicable. Ground your explanation in the provided code snippets.`;

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
            model: config.model,
            messages: [
              { role: 'system', content: 'You are an air-gapped codebase intelligence assistant.' },
              { role: 'user', content: prompt }
            ],
            stream: true
          })
        : JSON.stringify({
            model: config.model,
            prompt,
            stream: true
          });

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: requestBody
      });

      if (!res.ok || !res.body) {
        throw new Error(`Local model response failed (${res.status} ${res.statusText})`);
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
              } catch (e) {}
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
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
        ...m,
        content: `⚠️ Offline Assistant Notice: Unable to connect to local model (${err.message}). Verify that Ollama or LM Studio is running locally.`
      } : m));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 h-full bg-[#080d1a] flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="border-b border-vault-border bg-[#0b1224] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">
              Air-Gapped Codebase Assistant
            </h2>
            <p className="text-[10px] text-slate-400">
              Interactive chat grounded by LanceDB vector index & Tree-sitter AST nodes
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded hover:bg-vault-panel"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar max-w-4xl mx-auto w-full">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[80%] rounded-xl p-4 text-xs leading-relaxed ${
                isUser
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-md'
                  : 'bg-[#0d1527] border border-vault-border text-slate-200 shadow-sm'
              }`}>
                
                {/* Citations block if any */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mb-3 pb-2 border-b border-vault-border/60">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Grounded Ingested AST Citations
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                          <FileCode className="w-2.5 h-2.5" />
                          <span>{c.file.split('/').pop()}:{c.symbol}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message body */}
                <div className="markdown-body prose prose-invert prose-xs max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Footer time & copy */}
                <div className="mt-2 pt-1 flex items-center justify-between text-[10px] opacity-60">
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:opacity-100 flex items-center gap-1 ml-2"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 flex-shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-vault-border bg-[#0a0f1e] max-w-4xl mx-auto w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-[#070b16] border border-vault-border rounded-xl p-2 focus-within:border-cyan-400 transition-colors shadow-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your codebase, security, AST symbols, or architecture..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatStudio;
