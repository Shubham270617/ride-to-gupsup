import { useEffect, useState } from "react";
import { Mail, MailOpen, Trash2, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useConfirm } from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 15;

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Everything submitted through the public Contact page's form, in one
// place. New submissions show unread (bold, with a dot) until opened.
export default function MessagesAdmin() {
  const confirm = useConfirm();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    setMessages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleOpen = async (msg) => {
    const opening = openId !== msg.id;
    setOpenId(opening ? msg.id : null);
    if (opening && !msg.read) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      await supabase.from("contact_messages").update({ read: true }).eq("id", msg.id);
    }
  };

  const handleDelete = async (msg) => {
    const ok = await confirm({ title: "Delete this message?", message: "This can't be undone.", confirmLabel: "Delete" });
    if (!ok) return;
    setBusyId(msg.id);
    await supabase.from("contact_messages").delete().eq("id", msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setBusyId(null);
  };

  const unreadCount = messages.filter((m) => !m.read).length;
  const totalPages = Math.max(1, Math.ceil(messages.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageMessages = messages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Messages</h1>
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-rtg-orange-500/15 text-rtg-orange-300 px-3 py-1">
            {unreadCount} unread
          </span>
        )}
      </div>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">Everything submitted through the Contact page's form.</p>

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-rtg-mist text-sm py-10 text-center">No messages yet.</p>
      ) : (
        <div className="space-y-2">
          {pageMessages.map((m) => {
            const isOpen = openId === m.id;
            return (
              <div key={m.id} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleOpen(m)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  {m.read ? (
                    <MailOpen size={16} className="text-rtg-mist shrink-0" />
                  ) : (
                    <Mail size={16} className="text-rtg-orange-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${m.read ? "text-rtg-white" : "text-rtg-white font-semibold"}`}>
                      {m.name} <span className="text-rtg-mist font-normal">— {m.subject || "General Question"}</span>
                    </p>
                    <p className="text-xs text-rtg-mist truncate">{m.email}</p>
                  </div>
                  <span className="text-xs text-rtg-mist shrink-0">{formatDate(m.created_at)}</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/5">
                    <p className="text-sm text-rtg-white whitespace-pre-wrap mb-4">{m.message}</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={`mailto:${m.email}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-rtg-orange-500/15 text-rtg-orange-300 px-3.5 py-1.5 hover:bg-rtg-orange-500/25 transition-colors"
                      >
                        Reply by Email
                      </a>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={busyId === m.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-white/5 text-rtg-mist px-3.5 py-1.5 hover:text-rtg-orange-400 hover:bg-white/10 transition-colors disabled:opacity-60"
                      >
                        {busyId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
