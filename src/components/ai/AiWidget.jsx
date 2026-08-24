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
          isUser ? "bg-rtg-orange-500 text-rtg-ink" : "bg-white/[0.07] border border-white/10 text-rtg-white/90"
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

  const AvatarShell = ({ size, ring }) => (
    <motion.div
      layoutId="ai-avatar-shell"
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={`relative rounded-full ${size}`}
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-rtg-orange-500"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={`absolute inset-0 rounded-full overflow-hidden border-2 shadow-lg shadow-black/40 ${ring}`}>
        <img src={images.aiAssistant} alt={name} className="w-full h-full object-cover" />
      </span>
    </motion.div>
  );

  return (
    <>
      {/* Floating launcher — right side, gently bobbing to catch the eye.
          The avatar circle shares a layoutId with the one that pokes out of
          the open panel, so it visibly glides from here to there instead of
          just popping in and out. */}
      {!open && (
        <motion.button
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${name}`}
          className="fixed right-4 md:right-6 bottom-6 md:bottom-8 z-40 block"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <AvatarShell size="w-12 h-12 md:w-14 md:h-14" ring="border-rtg-orange-400/80" />
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rtg-orange-400 border-2 border-rtg-ink"
          />
        </motion.button>
      )}

      {/* Chat panel — solid, not glass, so hero text behind it never bleeds
          through; a soft blurred glow sits behind the panel for atmosphere
          instead. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed z-40 left-4 right-4 bottom-24 md:left-auto md:right-6 md:bottom-8 md:w-96 h-[65vh] max-h-[540px]"
          >
            <motion.div
              className="absolute -inset-6 rounded-[2.5rem] bg-rtg-orange-500/20 blur-3xl -z-10"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.button
              onClick={() => setOpen(false)}
              aria-label={`Close ${name}`}
              className="absolute -top-7 right-7 z-10 block"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.08 }}
            >
              <AvatarShell size="w-14 h-14" ring="border-rtg-orange-400" />
            </motion.button>

            <div className="relative w-full h-full bg-rtg-ink border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 px-5 pt-6 pb-3 border-b border-white/10 shrink-0">
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
                        className="text-xs bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-2 text-rtg-white/80 hover:text-rtg-white hover:border-rtg-orange-400/60 transition-colors"
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
                    <div className="bg-white/[0.07] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-rtg-mist">···</div>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
