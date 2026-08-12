import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import useTable from "../useTable";
import ResourceTable from "../components/ResourceTable";
import ResourceForm from "../components/ResourceForm";

export default function ResourceAdminPage({ resource }) {
  const { rows, loading, error, insert, update, remove } = useTable(resource.table, {
    orderBy: resource.orderBy,
    ascending: resource.ascending ?? true,
  });
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = editing existing
  const [submitting, setSubmitting] = useState(false);

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
    if (!window.confirm(`Delete "${row.title || row.name}"? This can't be undone.`)) return;
    await remove(row.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">{resource.title}</h1>
        <button
          onClick={() => setEditing({})}
          className="inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-5 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors"
        >
          <Plus size={16} /> Add {resource.singular}
        </button>
      </div>

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : error ? (
        <p className="text-rtg-orange-400 text-sm">{error}</p>
      ) : (
        <ResourceTable rows={rows} columns={resource.listColumns} onEdit={setEditing} onDelete={handleDelete} />
      )}

      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-[100] bg-rtg-ink/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
          >
            <motion.div
              className="glass rounded-3xl p-6 md:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl">
                  {editing.id ? `Edit ${resource.singular}` : `Add ${resource.singular}`}
                </h2>
                <button onClick={() => setEditing(null)} className="text-rtg-mist hover:text-rtg-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <ResourceForm
                fields={resource.fields}
                initialValues={editing}
                onSubmit={handleSubmit}
                onCancel={() => setEditing(null)}
                submitting={submitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
