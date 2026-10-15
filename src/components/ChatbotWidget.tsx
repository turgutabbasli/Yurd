import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles, RotateCcw } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  error?: boolean;
}

const HISTORY_KEY = 'yurd_chat_history';
const GREETING: ChatMessage = {
  role: 'model',
  text: 'Salam! Mən Yurd köməkçisiyəm. Platformadan istifadə, müraciət və investor təklifləri, eləcə də Qarabağ və Şərqi Zəngəzurda kənd təsərrüfatı imkanları barədə suallarınızı cavablandıra bilərəm.'
};
const QUICK_QUESTIONS = [
  'Necə müraciət edim?',
  'Ağdamda hansı bitkilər uyğundur?',
  'İnvestor təklifini necə seçim?',
  'Hansı əməkdaşlıq modelləri var?'
];

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [GREETING];
  } catch {
    return [GREETING];
  }
}

interface ChatbotWidgetProps {
  raised?: boolean; // lift above bottom action bars on some pages
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({ raised = false }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // History is a convenience only
    }
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || typing) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text: question }];
    setMessages(next);
    setInput('');
    setTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Error bubbles and the greeting are UI-only and not sent to the model
        body: JSON.stringify({ messages: next.filter(m => !m.error && m.text !== GREETING.text) })
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok || !data?.reply) {
        const msg = data?.error || 'Hazırda cavab verə bilmirəm, bir az sonra yenidən cəhd edin.';
        setMessages(prev => [...prev, { role: 'model', text: msg, error: true }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'model', text: 'Hazırda cavab verə bilmirəm, bir az sonra yenidən cəhd edin.', error: true }
      ]);
    } finally {
      setTyping(false);
    }
  };

  const resetChat = () => {
    setMessages([GREETING]);
  };

  // Sit above any fixed bottom panel (its height is published as --bottom-bar-h) and above the floating compare button
  const buttonBottom = `max(calc(var(--bottom-bar-h, 0px) + 16px), ${raised ? '96px' : '24px'})`;
  const windowBottom = `calc(${buttonBottom} + 72px)`;

  return (
    <>
      {open && (
        <div
          style={{ bottom: windowBottom }}
          className={`fixed right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[min(560px,calc(100dvh-12rem))] bg-white rounded-3xl shadow-2xl border border-[#EADBC8] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#2F6B3A] to-[#24542E] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/15">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <div className="text-sm font-extrabold leading-tight">Yurd köməkçisi</div>
                <div className="text-[10px] text-emerald-100">Ümumi məsləhət · AI</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                title="Söhbəti təmizlə"
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} title="Bağla" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4EBDD]/40">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#2F6B3A] text-white rounded-br-md'
                      : m.error
                      ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
                      : 'bg-white text-[#1F2A24] border border-[#EADBC8] rounded-bl-md'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-[#EADBC8] text-xs text-[#7A5230] flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6B3A] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6B3A] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6B3A] animate-bounce [animation-delay:300ms]" />
                  </span>
                  <span>yazır...</span>
                </div>
              </div>
            )}

            {messages.length <= 1 && !typing && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#2F6B3A]/30 text-[#2F6B3A] text-[11px] font-bold hover:bg-[#2F6B3A]/10 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
            className="p-3 border-t border-[#EADBC8] flex items-center gap-2 bg-white"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Sualınızı yazın…"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#EADBC8] text-base sm:text-xs text-[#1F2A24] focus:outline-none focus:border-[#2F6B3A]"
            />
            <button
              type="submit"
              disabled={typing || !input.trim()}
              title="Göndər"
              className="p-2.5 rounded-xl bg-[#2F6B3A] hover:bg-[#26572F] text-white cursor-pointer disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Çatı bağla' : 'Yurd köməkçisi ilə danış'}
        style={{ bottom: buttonBottom }}
        className={`fixed right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-[#2F6B3A] hover:bg-[#26572F] text-white shadow-xl border-2 border-white flex items-center justify-center cursor-pointer transition-all`}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  );
};
