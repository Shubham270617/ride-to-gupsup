import { Pencil, Trash2, Check, Minus, ImageOff } from "lucide-react";

// How one cell reads, using the column's field from resourceConfig.js when
// it has one: a photo shows as a thumbnail, a yes/no as a pill, a dropdown
// value as the wording the admin picked (not the code stored behind it).
function Cell({ value, field, column }) {
  if (field?.type === "image") {
    return value ? (
      <img src={value} alt="" className="h-11 w-16 rounded-xl object-cover ring-1 ring-rtg-border" />
    ) : (
      <span className="grid h-11 w-16 place-items-center rounded-xl bg-rtg-purple-950/[0.04] text-rtg-mist">
        <ImageOff size={14} />
      </span>
    );
  }
  if (typeof value === "boolean") {
    const isPublished = column === "published";
    return value ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <Check size={12} strokeWidth={3} /> {isPublished ? "Live" : "Yes"}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-rtg-purple-950/[0.05] px-2.5 py-1 text-[11px] font-semibold text-rtg-mist">
        <Minus size={12} strokeWidth={3} /> {isPublished ? "Hidden" : "No"}
      </span>
    );
  }
  if (field?.type === "select") {
    const picked = (field.options || []).find((o) => typeof o !== "string" && o.value === value);
    const text = picked ? picked.label : value;
    return text ? (
      <span className="inline-flex rounded-full bg-rtg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-rtg-orange-600">{String(text)}</span>
    ) : (
      "—"
    );
  }
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value ?? "—");
}

// `fields` (optional) is the resource's field list — a column whose field
// has a `listLabel` uses it as its heading instead of the column's name.
export default function ResourceTable({ rows, columns, fields = [], onEdit, onDelete, emptyText }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-rtg-border px-6 py-14 text-center">
        <p className="font-display text-2xl">Nothing here</p>
        <p className="mt-1 text-sm text-rtg-mist">{emptyText || "Nothing here yet — add your first one above."}</p>
      </div>
    );
  }
  const fieldOf = (column) => fields.find((f) => f.name === column);
  const firstText = columns.find((c) => fieldOf(c)?.type !== "image");

  return (
    <div className="overflow-x-auto rounded-2xl border border-rtg-border">
      <table className="w-full text-sm">
        <thead className="bg-rtg-purple-950/[0.03]">
          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-rtg-mist">
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-3 font-bold">
                {fieldOf(c)?.listLabel || c.replace(/_/g, " ")}
              </th>
            ))}
            {/* Sticky so Edit/Delete stay reachable without swiping across a
                wide table on a phone. */}
            <th className="sticky right-0 bg-[#f8f6fb] px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onDoubleClick={() => onEdit(row)}
              className="group border-t border-rtg-border transition-colors hover:bg-rtg-orange-500/[0.035]"
            >
              {columns.map((c) => (
                <td key={c} className={`max-w-xs truncate px-4 py-3 ${c === firstText ? "font-semibold text-rtg-white" : "text-rtg-white/80"}`}>
                  <Cell value={row[c]} field={fieldOf(c)} column={c} />
                </td>
              ))}
              <td className="sticky right-0 whitespace-nowrap bg-white px-3 py-2 text-right shadow-[-10px_0_12px_-10px_rgba(53,36,111,0.25)] transition-colors group-hover:bg-[#fffaf7]">
                <button
                  onClick={() => onEdit(row)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 align-middle text-xs font-semibold text-rtg-mist transition-colors hover:bg-rtg-orange-500/10 hover:text-rtg-orange-600"
                  aria-label="Edit"
                >
                  <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => onDelete(row)}
                  className="inline-grid h-8 w-8 place-items-center rounded-full align-middle text-rtg-mist transition-colors hover:bg-red-500/10 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
