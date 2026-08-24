import { Pencil, Trash2 } from "lucide-react";

export default function ResourceTable({ rows, columns, onEdit, onDelete }) {
  if (rows.length === 0) {
    return <p className="text-rtg-mist text-sm py-10 text-center">Nothing here yet — add your first one above.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-rtg-mist">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold whitespace-nowrap">
                {c.replace(/_/g, " ")}
              </th>
            ))}
            {/* Sticky so Edit/Delete stay reachable without swiping across a
                wide table on a phone — the real complaint with the old table
                was that these buttons scrolled off-screen entirely. */}
            <th className="sticky right-0 bg-rtg-ink px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
              {columns.map((c) => (
                <td key={c} className="px-4 py-3 text-rtg-white/90 max-w-xs truncate">
                  {typeof row[c] === "boolean" ? (row[c] ? "Yes" : "No") : String(row[c] ?? "—")}
                </td>
              ))}
              <td className="sticky right-0 bg-rtg-ink shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.6)] px-4 py-3 text-right whitespace-nowrap">
                <button
                  onClick={() => onEdit(row)}
                  className="text-rtg-mist hover:text-rtg-orange-400 p-1.5 transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(row)}
                  className="text-rtg-mist hover:text-rtg-orange-400 p-1.5 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
