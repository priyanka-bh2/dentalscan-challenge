"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

//types
type Sender = "patient" | "dentist";

interface Message {
  id: string;
  threadId: string;
  content: string;
  sender: Sender;
  createdAt: string;
  pending?: boolean;
}

interface MessagingSidebarProps {

  threadId?: string;

  patientId: string;
  /** "patient" or "dentist" — controls which side messages appear on */
  currentSender?: Sender;
  open: boolean;
  onClose?: () => void;
}

// helpers
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(msgs: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const m of msgs) {
    const label = formatDateLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last?.date === label) last.messages.push(m);
    else groups.push({ date: label, messages: [m] });
  }
  return groups;
}

// bubble

function Bubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0 self-end mb-4">
          {message.sender === "dentist" ? "D" : "P"}
        </div>
      )}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed transition-opacity duration-300
          ${isOwn
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-zinc-800 text-zinc-100 rounded-tl-sm"}
          ${message.pending ? "opacity-55" : "opacity-100"}`}>
          {message.content}
        </div>
        <span className="text-[10px] text-zinc-600 px-1">
          {message.pending ? "Sending…" : formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

// main
export default function MessagingSidebar({
  threadId: initialThreadId,
  patientId,
  currentSender = "patient",
  open,
  onClose,
}: MessagingSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // fetch messages
  const fetchMessages = useCallback(async () => {
    if (!threadId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/messaging?threadId=${encodeURIComponent(threadId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { if (open) fetchMessages(); }, [open, fetchMessages]);

  // Poll every 5s for new messages
  useEffect(() => {
    if (!open || !threadId) return;
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [open, threadId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // send
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSendError(null);
    setSending(true);

    // Optimistic message
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      threadId: threadId ?? "",
      content: trimmed,
      sender: currentSender,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          patientId,
          content: trimmed,
          sender: currentSender,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      // If a new thread was created, save its ID for subsequent calls
      if (data.message?.threadId && !threadId) setThreadId(data.message.threadId);

      // Replace optimistic with confirmed
      await fetchMessages();
    } catch (e) {
      // Roll back
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(trimmed);
      setSendError(e instanceof Error ? e.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }, [input, sending, threadId, patientId, currentSender, fetchMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const grouped = groupByDate(messages);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-30 sm:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 flex flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            aria-label="Clinic messaging"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Message Clinic</h2>
                  <p className="text-xs text-zinc-500">Your care team will respond shortly</p>
                </div>
              </div>
              {onClose && (
                <button onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500"
                  aria-label="Close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {loading && (
                <div className="flex items-center justify-center py-12 text-zinc-600 text-sm gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading messages…
                </div>
              )}

              {!loading && loadError && (
                <button onClick={fetchMessages}
                  className="text-sm text-red-400 text-center py-8 w-full hover:underline">
                  Failed to load. Tap to retry.
                </button>
              )}

              {!loading && !loadError && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                    <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-600 max-w-[220px]">
                    No messages yet. Send a message to start the conversation with your clinic.
                  </p>
                </div>
              )}

              {grouped.map(({ date, messages: dayMsgs }) => (
                <div key={date} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{date}</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                  {dayMsgs.map((m) => (
                    <Bubble key={m.id} message={m} isOwn={m.sender === currentSender} />
                  ))}
                </div>
              ))}
            </div>

            {/* Send error */}
            {sendError && (
              <div className="mx-4 mb-2 px-3 py-2 bg-red-900/30 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.73-3L13.73 5a2 2 0 00-3.46 0L3.2 16a2 2 0 001.73 3z" />
                </svg>
                {sendError}
                <button onClick={() => setSendError(null)} className="ml-auto text-red-500 hover:text-red-300">✕</button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-5 pt-2 border-t border-zinc-800">
              <div className="flex gap-2 items-end bg-zinc-900 rounded-2xl px-3 py-2
                focus-within:ring-1 ring-blue-500/50 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Message your clinic…"
                  rows={1}
                  disabled={sending}
                  aria-label="Type a message"
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600
                    resize-none outline-none min-h-[36px] max-h-[120px] py-1.5 leading-snug"
                />
                <button onClick={handleSend} disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-xl bg-blue-600 disabled:bg-zinc-800 flex items-center justify-center
                    transition-all active:scale-95 disabled:cursor-not-allowed mb-0.5 shrink-0"
                  aria-label="Send">
                  {sending ? (
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-zinc-700 text-center mt-1.5">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
