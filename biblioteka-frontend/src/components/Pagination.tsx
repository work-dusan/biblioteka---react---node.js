import React from "react";

type Props = {
  page: number;          // 1-based
  total: number;         // ukupan broj stavki
  limit: number;         // po stranici
  onChange: (page: number) => void;
  siblingCount?: number; // koliko brojeva levo/desno (default 1)
};

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({ page, total, limit, onChange, siblingCount = 1 }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (totalPages <= 1) return null;

  const first = 1;
  const last = totalPages;

  const left = Math.max(first, page - siblingCount);
  const right = Math.min(last, page + siblingCount);

  const showLeftEllipsis = left > first + 1;
  const showRightEllipsis = right < last - 1;

  const pages: (number | "…")[] = [];
  pages.push(first);
  if (showLeftEllipsis) pages.push("…");
  range(Math.max(left, first + 1), Math.min(right, last - 1)).forEach((n) => pages.push(n));
  if (showRightEllipsis) pages.push("…");
  if (last !== first) pages.push(last);

  const go = (p: number) => () => onChange(Math.min(Math.max(p, first), last));

  const btn = (label: React.ReactNode, disabled: boolean, onClick: () => void, key?: React.Key) => (
    <button
      key={key ?? String(label)}
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg border text-sm
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}
      `}
    >
      {label}
    </button>
  );

  return (
    <nav className="flex items-center justify-center gap-2 mt-6 select-none">
      {btn("« Prva", page === first, go(first))}
      {btn("‹ Prethodna", page === first, go(page - 1), "prev")}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`dots-${i}`} className="px-2 text-gray-500">…</span>
        ) : (
          <button
            key={p}
            onClick={go(p)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              p === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-100"
            }`}
          >
            {p}
          </button>
        )
      )}
      {btn("Sledeća ›", page === last, go(page + 1), "next")}
      {btn("Poslednja »", page === last, go(last))}
    </nav>
  );
}
