import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useTable(table, { orderBy = "sort_order", ascending = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.from(table).select("*").order(orderBy, { ascending });
    if (err) setError(err.message);
    else {
      setError("");
      setRows(data || []);
    }
    setLoading(false);
  }, [table, orderBy, ascending]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const insert = async (values) => {
    const { error: err } = await supabase.from(table).insert(values);
    if (err) throw err;
    await refresh();
  };

  const update = async (id, values) => {
    const { error: err } = await supabase.from(table).update(values).eq("id", id);
    if (err) throw err;
    await refresh();
  };

  const remove = async (id) => {
    const { error: err } = await supabase.from(table).delete().eq("id", id);
    if (err) throw err;
    await refresh();
  };

  return { rows, loading, error, refresh, insert, update, remove };
}
