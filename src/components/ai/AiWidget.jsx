import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useSiteImages, useSiteSettings, pickText } from "../../lib/publicData";
import useSession from "../../lib/useSession";
import { getAiSessionId, sendAiMessage } from "../../lib/aiChat";

const SUGGESTIONS = [
  "Find me a beginner cycling event",
  "Suggest a training plan for a 10K",
  "How do I join RTG?",
];

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-rtg-orange-500 text-rtg-ink" : "glass text-rtg-white/90"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

export default function AiWidget() {
  const images = useSiteImages();
  const settings = useSiteSettings();
  const { session } = useSession();
  const name = pickText(settings, "ai.name", "Tapri");
  const greeting = pickText(
    settings,
    "ai.greeting",
    "Hey, I'm Tapri! Ask me about events, weekly rides, or tell me what you're looking for."
  );

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) sessionIdRef.current = getAiSessionId();
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const sendText = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setSending(true);
    try {
      const reply = await sendAiMessage({
        sessionId: sessionIdRef.current,
        message: trimmed,
        history,
        token: session?.access_token,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong — please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating launcher — left side, gently bobbing to catch the eye.
          Hidden while the panel is open (which has its own close button) —
          otherwise its glow pulse bleeds through the panel's translucent
          glass background right behind it. */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="fixed left-4 md:left-6 bottom-6 md:bottom-8 z-40"
          >
            <motion.button
              onClick={() => setOpen(true)}
              aria-label={`Chat with ${name}`}
              className="relative block w-16 h-16 md:w-20 md:h-20 rounded-full"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="absolute inset-0 rounded-full bg-rtg-orange-500"
                animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0, 0.45] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="absolute inset-0 rounded-full overflow-hidden border-2 border-rtg-orange-400/80 shadow-lg shadow-black/30">
                <img src={images.aiAssistant} alt={name} className="w-full h-full object-cover" />
              </span>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rtg-orange-400 border-2 border-rtg-ink" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-40 left-4 right-4 bottom-28 md:left-6 md:right-auto md:bottom-32 md:w-96 h-[65vh] max-h-[540px] glass rounded-3xl flex flex-col overflow-hidden shadow-2xl shadow-black/40"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
              <img src={images.aiAssistant} alt={name} className="w-9 h-9 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rtg-white">{name}</p>
                <p className="text-[11px] text-rtg-mist">RTG's AI companion</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="text-rtg-mist hover:text-rtg-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <Bubble role="assistant" content={greeting} />
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendText(s)}
                      className="text-xs glass rounded-full px-3.5 py-2 text-rtg-white/80 hover:text-rtg-white hover:border-rtg-orange-400/60 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="glass rounded-2xl px-4 py-2.5 text-sm text-rtg-mist">···</div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendText(input);
              }}
              className="flex items-center gap-2 p-3 border-t border-white/10 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${name}…`}
                className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label="Send"
                className="w-10 h-10 shrink-0 rounded-full bg-rtg-orange-500 text-rtg-ink flex items-center justify-center hover:bg-rtg-orange-400 transition-colors disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
