import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MessagesSquare } from "lucide-react";
import { useChat } from "../../lib/ChatContext";

// Small floating chat button, stacked just above the Tapri AI button in the
// bottom-right corner. Opens /chat; shows unread private messages as a
// number and new community-room messages as a dot. Logged-in members only,
// and hidden on /chat itself.
export default function ChatLauncher() {
  const { enabled, userId, unreadDMs, roomHasNew, online } = useChat();
  const { pathname } = useLocation();
  if (!enabled || !userId || pathname.startsWith("/chat")) return null;

  const othersOnline = Math.max(0, online.size - 1);
  const label = unreadDMs
    ? `Chat — ${unreadDMs} unread message${unreadDMs === 1 ? "" : "s"}`
    : `Chat — ${othersOnline} online`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="fixed bottom-[5.5rem] right-4 z-30 md:bottom-[6.75rem] md:right-6"
    >
      <Link
        to={unreadDMs ? "/chat" : "/chat?c=room"}
        aria-label={label}
        title={label}
        className="group relative grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,#35246f,#5e43a1)] text-white shadow-[0_14px_30px_-10px_rgba(53,36,111,0.75)] ring-2 ring-white transition-transform hover:scale-105 md:h-14 md:w-14"
      >
        <MessagesSquare size={22} />
        {unreadDMs > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rtg-orange-500 px-1 text-[0.625rem] font-bold text-white ring-2 ring-white">
            {unreadDMs > 9 ? "9+" : unreadDMs}
          </span>
        ) : roomHasNew ? (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-rtg-orange-500 ring-2 ring-white" />
        ) : null}
        {othersOnline > 0 && (
          <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[0.6875rem] font-semibold text-rtg-white shadow-md ring-1 ring-rtg-border group-hover:inline-flex group-hover:items-center group-hover:gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {othersOnline} online
          </span>
        )}
      </Link>
    </motion.div>
  );
}
