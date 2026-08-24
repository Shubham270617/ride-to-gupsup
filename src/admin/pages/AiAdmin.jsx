import { useEffect, useState } from "react";
import { Loader2, Check, MessageCircle, ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import Pagination from "../components/Pagination";

const SETTINGS_KEYS = ["ai.enabled", "ai.name", "ai.greeting", "ai.systemPrompt"];
const PAGE_SIZE = 15;

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AiAdmin() {
  const [settings, setSettings] = useState({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");

  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [messagesByConvo, setMessagesByConvo] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!supabase) {
      setLoadingSettings(false);
      setLoadingConvos(false);
      return;
    }
    supabase
      .from("site_settings")
      .select("key,value")
      .in("key", SETTINGS_KEYS)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((r) => {
          map[r.key] = r.value;
        });
        setSettings(map);
        setLoadingSettings(false);
      });

    supabase
      .from("ai_conversations")
      .select("id,session_id,user_id,created_at,last_message_at")
      .order("last_message_at", { ascending: false })
      .then(async ({ data }) => {
        const rows = data || [];
        setConversations(rows);
        const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
        if (userIds.length) {
          const { data: profileRows } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds);
          const map = {};
          (profileRows || []).forEach((p) => {
            map[p.id] = p;
          });
          setProfiles(map);
        }
        setLoadingConvos(false);
      });
  }, []);

  const setField = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const saveSettings = async () => {
    setSaveStatus("saving");
    await Promise.all(
      SETTINGS_KEYS.map((key) => supabase.from("site_settings").upsert({ key, value: settings[key] ?? "", label: key }))
    );
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus((s) => (s === "saved" ? "" : s)), 1500);
  };

  const toggleOpen = async (convo) => {
    const opening = openId !== convo.id;
    setOpenId(opening ? convo.id : null);
    if (opening && !messagesByConvo[convo.id]) {
      setLoadingMessages(convo.id);
      const { data } = await supabase
        .from("ai_messages")
        .select("role,content,created_at")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: true });
      setMessagesByConvo((prev) => ({ ...prev, [convo.id]: data || [] }));
      setLoadingMessages(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(conversations.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageConvos = conversations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const enabled = settings["ai.enabled"] !== "false";

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">AI Assistant</h1>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">
        Tapri — the floating chat widget on the public site. Configure how it introduces itself and review what
        people have been asking it.
      </p>

      {loadingSettings ? (
        <p className="text-rtg-mist text-sm mb-8">Loading…</p>
      ) : (
        <div className="glass rounded-2xl p-6 mb-8 max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-5">Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setField("ai.enabled", enabled ? "false" : "true")}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${enabled ? "bg-rtg-orange-500" : "bg-white/10"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : ""}`}
                />
              </button>
              <span className="text-sm text-rtg-white">{enabled ? "Enabled — visible on the public site" : "Disabled — widget hidden"}</span>
            </label>

            <div>
              <label className="block text-xs text-rtg-mist mb-1.5">Assistant name</label>
              <input
                type="text"
                value={settings["ai.name"] ?? "Tapri"}
                onChange={(e) => setField("ai.name", e.target.value)}
                className="w-full rounded-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
              />
            </div>

            <div>
              <label className="block text-xs text-rtg-mist mb-1.5">Greeting message (first thing people see)</label>
              <textarea
                rows={2}
                value={settings["ai.greeting"] ?? "Hey, I'm Tapri! Ask me about events, weekly rides, or tell me what you're looking for."}
                onChange={(e) => setField("ai.greeting", e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
              />
            </div>

            <div>
              <label className="block text-xs text-rtg-mist mb-1.5">
                Personality / instructions (advanced — leave blank to use the default)
              </label>
              <textarea
                rows={5}
                value={settings["ai.systemPrompt"] ?? ""}
                placeholder="e.g. Always mention the Friday Bricks session when someone asks about cycling…"
                onChange={(e) => setField("ai.systemPrompt", e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/40 focus:outline-none focus:border-rtg-orange-400/60"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saveStatus === "saving"}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-5 py-2 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
          >
            {saveStatus === "saving" && <Loader2 size={14} className="animate-spin" />}
            {saveStatus === "saved" && <Check size={14} />}
            {saveStatus === "saved" ? "Saved" : "Save"}
          </button>
        </div>
      )}

      <h2 className="font-display text-xl mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-rtg-orange-400" /> Conversations
      </h2>

      {loadingConvos ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-rtg-mist text-sm py-10 text-center">No conversations yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {pageConvos.map((c) => {
              const profile = c.user_id ? profiles[c.user_id] : null;
              const isOpen = openId === c.id;
              return (
                <div key={c.id} className="glass rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleOpen(c)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-rtg-white font-medium truncate">
                        {profile?.full_name || profile?.email || "Guest visitor"}
                      </p>
                      <p className="text-xs text-rtg-mist">Last message {formatDate(c.last_message_at)}</p>
                    </div>
                    <ChevronDown size={16} className={`text-rtg-mist shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/5 space-y-2 max-h-96 overflow-y-auto">
                      {loadingMessages === c.id ? (
                        <p className="text-rtg-mist text-sm py-4">Loading…</p>
                      ) : (
                        (messagesByConvo[c.id] || []).map((m, i) => (
                          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                                m.role === "user" ? "bg-rtg-orange-500/15 text-rtg-white" : "bg-white/5 text-rtg-white/85"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
