import { useEffect, useState } from "react";

function formatTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export default function LiveClock({ className = "" }) {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`inline-flex items-center gap-2 font-mono tabular-nums ${className}`}>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rtg-orange-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rtg-orange-500" />
      </span>
      {time} IST
    </span>
  );
}
