import { useEffect, useMemo, useState } from "react";
import { Plus, X, Search, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import useTable from "../useTable";
import ResourceTable from "../components/ResourceTable";
import ResourceForm from "../components/ResourceForm";
import Pagination from "../components/Pagination";
import AdminPageHeader, { HeaderButton } from "../components/AdminPageHeader";
import { useConfirm } from "../components/ConfirmDialog";

const PAGE_SIZE = 20;

// The list-and-form screen behind most of the admin (Events, Lab, Ridge,
// Membership, Community, Home sections …) — one config in
// resourceConfig.js per table.
export default function ResourceAdminPage({ resource }) {
  const confirm = useConfirm();
  const { rows, loading, error, insert, update, remove } = useTable(resource.table, {
    orderBy: resource.orderBy,
    ascending: resource.ascending ?? true,
  });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = editing existing
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  // Search matches any listed column (and the title/name), case-blind.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const cols = [...new Set([...resource.listColumns, "title", "name"])];
    return rows.filter((r) => cols.some((c) => r[c] != null && String(r[c]).toLowerCase().includes(q)));
  }, [rows, query, resource.listColumns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  // Switching resource (Events → Sponsors in the sidebar) reuses this same
  // component — start the new board on page 1 with an empty search.
  useEffect(() => {
    setPage(1);
    setQuery("");
  }, [resource.table]);
  useEffect(() => setPage(1), [query]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasPublished = resource.fields.some((f) => f.name === "published");
  const stats = [
    { label: rows.length === 1 ? resource.singular.toLowerCase() : "total", value: rows.length },
    ...(hasPublished
      ? [
          { label: "live on the site", value: rows.filter((r) => r.published !== false).length },
          { label: "hidden", value: rows.filter((r) => r.published === false).length },
        ]
      : []),
  ];

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editing?.id) await update(editing.id, values);
      else await insert(values);
      setEditing(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      // Rows without a title or name (a city photo, say) are named by what they are.
      title: `Delete ${row.title || row.name ? `"${row.title || row.name}"` : `this ${resource.singular.toLowerCase()}`}?`,
      message: "This can't be undone.",
    });
    if (!ok) return;
    await remove(row.id);
  };

  return (
    <div>
      <AdminPageHeader
        title={resource.title}
        description={`Everything here appears on the public site as soon as you save it.`}
        stats={loading ? [] : stats}
        actions={
          <HeaderButton onClick={() => setEditing({})}>
            <Plus size={16} /> Add {resource.singular}
          </HeaderButton>
        }
      />

      <div className="glass rounded-3xl p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <label className="relative block w-full max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${resource.title.toLowerCase()}…`}
              className="w-full rounded-full border border-rtg-border bg-rtg-purple-950/[0.03] py-2.5 pl-10 pr-4 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:border-rtg-orange-400 focus:outline-none focus:ring-4 focus:ring-rtg-orange-400/15"
            />
          </label>
          {!loading && (
            <span className="text-xs text-rtg-mist">
              {query ? `${filtered.length} of ${rows.length} shown` : `${rows.length} ${rows.length === 1 ? "item" : "items"}`}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid place-items-center py-16 text-rtg-mist">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : error ? (
          <p className="px-2 py-6 text-sm text-rtg-orange-600">{error}</p>
        ) : (
          <>
            <ResourceTable
              rows={pageRows}
              columns={resource.listColumns}
              fields={resource.fields}
              onEdit={setEditing}
              onDelete={handleDelete}
              emptyText={query ? `Nothing matches "${query}".` : `No ${resource.title.toLowerCase()} yet — add the first one with the button above.`}
            />
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-[100] flex justify-end bg-rtg-purple-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
          >
            {/* Slide-over panel: the list stays visible behind it. */}
            <motion.div
              className="flex h-full w-full max-w-xl flex-col bg-white shadow-[-30px_0_80px_-30px_rgba(27,17,48,0.6)]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-rtg-border bg-[linear-gradient(135deg,#1b1130,#35246f)] px-6 py-5 text-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rtg-orange-300">{resource.title}</p>
                  <h2 className="font-display text-2xl leading-none">{editing.id ? `Edit ${resource.singular}` : `New ${resource.singular}`}</h2>
                </div>
                <button
                  onClick={() => setEditing(null)}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <ResourceForm
                  fields={resource.fields}
                  initialValues={editing}
                  onSubmit={handleSubmit}
                  onCancel={() => setEditing(null)}
                  submitting={submitting}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
