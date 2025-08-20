import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/apiService";
import BookCard from "../components/BookCard";
import Pagination from "../components/Pagination";
import type { Book } from "../types";

const DEFAULT_LIMIT = 12;

type SortField = "title" | "author" | "year";
type Order = "asc" | "desc";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "title", label: "Naslov" },
  { value: "author", label: "Autor" },
  { value: "year", label: "Godina" },
];

export default function HomePage() {
  const [params, setParams] = useSearchParams();

  // --- URL state ---
  const page = useMemo(() => {
    const p = Number(params.get("page") || "1");
    return Number.isFinite(p) && p > 0 ? p : 1;
  }, [params]);

  const limit = useMemo(() => {
    const l = Number(params.get("limit") || DEFAULT_LIMIT);
    return Number.isFinite(l) && l > 0 ? l : DEFAULT_LIMIT;
  }, [params]);

  const search = params.get("q") ?? "";                 // backend koristi "q"
  const sort = (params.get("sort") as SortField) || "createdAt";
  const order = (params.get("order") as Order) || "desc";

  // --- local state ---
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);

  // --- helpers za URL izmene ---
  const setQuery = (patch: Record<string, string | null | undefined>, replace = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace });
  };

  // --- fetch ---
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const res = await api.get("/books", {
          params: {
            page,
            limit,
            q: search || undefined,   // ✅ pretraga
            sort,                     // ✅ sortiranje
            order,                    // ✅ smer
          },
        });

        // očekivani odgovor: { data: { items: [...], total: number } }
        const payload = res.data?.data ?? {};
        const items = Array.isArray(payload.items) ? payload.items : Array.isArray(res.data) ? res.data : [];
        const totalCount = Number(payload.total ?? items.length) || 0;

        if (!alive) return;

        // normalizuj id/_id → id (za UI)
        const normalized = (items as any[]).map((b) => ({ ...b, id: (b as any).id ?? (b as any)._id }));
        setBooks(normalized as Book[]);
        setTotal(totalCount);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.error || "Greška pri učitavanju knjiga.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [page, limit, search, sort, order]);

  // --- UI handlers (bez debounce-a, po želji se može dodati kasnije) ---
  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery({ q: e.target.value, page: "1" }); // reset na stranu 1
  };

  const onSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as SortField;
    setQuery({ sort: newSort, page: "1" });
  };

  const onOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrder = e.target.value as Order;
    setQuery({ order: newOrder, page: "1" });
  };

  const onPageChange = (nextPage: number) => {
    setQuery({ page: String(nextPage) });
  };

  // (opciono) ako želiš i padajući za limit:
  // const onLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   setQuery({ limit: e.target.value, page: "1" });
  // };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold">Knjige</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Pretraga */}
          <input
            value={search}
            onChange={onSearchChange}
            placeholder="Pretraga po naslovu ili autoru…"
            className="w-72 px-3 py-2 rounded-xl border bg-white"
          />

          {/* Sortiranje */}
          <select
            value={sort}
            onChange={onSortChange}
            className="px-3 py-2 rounded-xl border bg-white"
            title="Sortiraj po"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Smer */}
          <select
            value={order}
            onChange={onOrderChange}
            className="px-3 py-2 rounded-xl border bg-white"
            title="Smer"
          >
            <option value="asc">Rastuće</option>
            <option value="desc">Opadajuće</option>
          </select>

          {/* (opciono) Limit po strani
          <select
            value={String(limit)}
            onChange={onLimitChange}
            className="px-3 py-2 rounded-xl border bg-white"
            title="Po stranici"
          >
            {[6, 12, 24, 48].map((l) => (
              <option key={l} value={l}>{l} / strana</option>
            ))}
          </select>
          */}
        </div>
      </header>

      {loading && <p>Učitavanje…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <>
          {books.length === 0 ? (
            <p className="text-gray-600">Nema rezultata za zadate filtere.</p>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {books.map((b) => (
                  <BookCard
                    key={b.id}
                    book={b}
                    onOrdered={() => {
                      // posle poručivanja osveži listu sa istim filterima/stranom
                      setParams((prev) => new URLSearchParams(prev), { replace: true });
                    }}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                total={total}
                limit={limit}
                onChange={onPageChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
