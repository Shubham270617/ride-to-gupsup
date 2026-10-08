import { Pencil, Trash2 } from "lucide-react";

// How one cell reads, using the column's field from resourceConfig.js when
// it has one: a photo shows as a thumbnail, a dropdown value as the wording
// the admin picked (not the code stored behind it).
function Cell({ value, field }) {
  if (field?.type === "image") {
    return value ? <img src={value} alt="" className="w-14 h-10 rounded-lg object-cover bg-white/5" /> : "—";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field?.type === "select") {
    const picked = (field.options || []).find((o) => typeof o !== "string" && o.value === value);
    if (picked) return picked.label;
  }
  return String(value ?? "—");
}

// `fields` (optional) is the resource's field list — a column whose field
// has a `listLabel` uses it as its heading instead of the column's name.
export default function ResourceTable({ rows, columns, fields = [], onEdit, onDelete }) {
  if (rows.length === 0) {
    return <p className="text-rtg-mist text-sm py-10 text-center">Nothing here yet — add your first one above.</p>;
  }
  const fieldOf = (column) => fields.find((f) => f.name === column);

  return (
    <div className="overflow-x-auto rounded-2xl border border-rtg-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rtg-border text-left text-xs uppercase tracking-wide text-rtg-mist">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold whitespace-nowrap">
                {fieldOf(c)?.listLabel || c.replace(/_/g, " ")}
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
                  <Cell value={row[c]} field={fieldOf(c)} />
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
