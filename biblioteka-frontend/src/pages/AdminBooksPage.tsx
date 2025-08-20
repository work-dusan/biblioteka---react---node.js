// src/pages/AdminBooksPage.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/apiService";
import useAuth from "../hooks/useAuth";
import type { Book } from "../types";

type Order = "asc" | "desc";

// Bezbedno izvlačenje niza knjiga
function pickBooks(payload: any): any[] {
  if (payload?.data?.data?.items && Array.isArray(payload.data.data.items)) {
    return payload.data.data.items;
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) return payload;
  return [];
}

// Normalizacija Book objekta
function normalizeBook(raw: any): Book {
  const id = raw?._id ?? raw?.id ?? "";
  return {
    id: typeof id === "string" ? id : String(id),
    title: raw?.title ?? "",
    author: raw?.author ?? "",
    year: String(raw?.year ?? ""),
    image: raw?.image ?? null,
    description: raw?.description ?? null,
    rentedBy: raw?.rentedBy ?? null,
  } as Book;
}

export default function AdminBooksPage() {
  const { user: currentUser } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // search/sort
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "author" | "year">("title");
  const [order, setOrder] = useState<Order>("asc");

  // Dodavanje
  const [showCreate, setShowCreate] = useState(false);
  const [titleN, setTitleN] = useState("");
  const [authorN, setAuthorN] = useState("");
  const [yearN, setYearN] = useState("");
  const [descN, setDescN] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [creating, setCreating] = useState(false);

  // Izmena
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/books", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      setBooks(pickBooks(res).map(normalizeBook));
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Greška pri učitavanju knjiga.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(() => {
    const copy = [...books];
    // sort
    copy.sort((a, b) => {
      const av = String(a[sortBy] ?? "").toLowerCase();
      const bv = String(b[sortBy] ?? "").toLowerCase();
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    });
    // filter
    const qq = q.trim().toLowerCase();
    if (!qq) return copy;
    return copy.filter(
      (b) =>
        b.title.toLowerCase().includes(qq) ||
        b.author.toLowerCase().includes(qq) ||
        b.year.toLowerCase().includes(qq)
    );
  }, [books, q, sortBy, order]);

  // Dodavanje
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (titleN.trim().length < 2) return setCreateErr("Naslov mora imati bar 2 znaka.");
    if (authorN.trim().length < 2) return setCreateErr("Autor mora imati bar 2 znaka.");
    if (!yearN.trim()) return setCreateErr("Godina je obavezna.");

    try {
      setCreating(true);
      setCreateErr("");
      const token = localStorage.getItem("token") || "";
      const res = await api.post(
        "/books",
        { title: titleN.trim(), author: authorN.trim(), year: yearN.trim(), description: descN.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const created = normalizeBook(res?.data?.data ?? res?.data);
      setBooks((prev) => [created, ...prev]);
      setTitleN(""); setAuthorN(""); setYearN(""); setDescN("");
      setShowCreate(false);
    } catch (e: any) {
      setCreateErr(e?.response?.data?.error || "Greška pri kreiranju knjige.");
    } finally {
      setCreating(false);
    }
  }

  // Izmena
  function startEdit(b: Book) {
    setEditId(b.id);
    setEditTitle(b.title);
    setEditAuthor(b.author);
    setEditYear(b.year);
    setEditDesc(b.description ?? "");
    setEditErr("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      setSavingEdit(true);
      const token = localStorage.getItem("token") || "";
      const res = await api.patch(
        `/books/${editId}`,
        { title: editTitle.trim(), author: editAuthor.trim(), year: editYear.trim(), description: editDesc.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = normalizeBook(res?.data?.data ?? res?.data);
      setBooks((prev) => prev.map((b) => (b.id === editId ? updated : b)));
      setEditId(null);
    } catch (e: any) {
      setEditErr(e?.response?.data?.error || "Greška pri izmeni knjige.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Brisanje
  async function removeBook(targetId: string) {
    if (!confirm("Da li sigurno želiš da obrišeš ovu knjigu?")) return;
    try {
      await api.delete(`/books/${targetId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      setBooks((prev) => prev.filter((b) => b.id !== targetId));
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Greška pri brisanju knjige.");
    }
  }

  if (loading) return <div className="p-4">Učitavanje…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Knjige</h1>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {showCreate ? "× Zatvori" : "+ Dodaj knjigu"}
        </button>
      </div>

      {/* Inline forma dodavanja */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
          {createErr && <div className="md:col-span-2 text-red-600">{createErr}</div>}
          <div><label>Naslov</label><input className="w-full border px-2 py-1" value={titleN} onChange={(e) => setTitleN(e.target.value)} /></div>
          <div><label>Autor</label><input className="w-full border px-2 py-1" value={authorN} onChange={(e) => setAuthorN(e.target.value)} /></div>
          <div><label>Godina</label><input className="w-full border px-2 py-1" value={yearN} onChange={(e) => setYearN(e.target.value)} /></div>
          <div className="md:col-span-2"><label>Opis</label><textarea className="w-full border px-2 py-1" value={descN} onChange={(e) => setDescN(e.target.value)} /></div>
          <div className="md:col-span-2"><button type="submit" disabled={creating} className="bg-green-600 text-white px-4 py-2 rounded">{creating ? "Čuvam…" : "Sačuvaj"}</button></div>
        </form>
      )}

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input className="flex-1 border px-3 py-2 rounded" placeholder="Pretraga…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border px-3 py-2 rounded">
          <option value="title">Naslov</option>
          <option value="author">Autor</option>
          <option value="year">Godina</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as any)} className="border px-3 py-2 rounded">
          <option value="asc">Rastuće</option>
          <option value="desc">Opadajuće</option>
        </select>
      </div>

      {/* Tabela knjiga */}
      <table className="w-full border rounded overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border-b">Naslov</th>
            <th className="p-2 border-b">Autor</th>
            <th className="p-2 border-b">Godina</th>
            <th className="p-2 border-b">Status</th>
            <th className="p-2 border-b">Akcije</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((b) => (
            <tr key={b.id} className="border-b align-top">
              <td className="p-2">{b.title}</td>
              <td className="p-2">{b.author}</td>
              <td className="p-2">{b.year}</td>
              <td className="p-2">{b.rentedBy ? <span className="text-red-600">Iznajmljena</span> : <span className="text-green-600">Slobodna</span>}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => startEdit(b)} className="px-2 py-1 bg-blue-600 text-white rounded">Izmeni</button>
                  <button onClick={() => removeBook(b.id)} className="px-2 py-1 bg-red-600 text-white rounded">Obriši</button>
                </div>

                {/* Inline forma izmene */}
                {editId === b.id && (
                  <form onSubmit={handleEdit} className="mt-3 border rounded p-3 bg-gray-50 space-y-2">
                    {editErr && <div className="text-red-600">{editErr}</div>}
                    <div><label>Naslov</label><input className="w-full border px-2 py-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
                    <div><label>Autor</label><input className="w-full border px-2 py-1" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} /></div>
                    <div><label>Godina</label><input className="w-full border px-2 py-1" value={editYear} onChange={(e) => setEditYear(e.target.value)} /></div>
                    <div><label>Opis</label><textarea className="w-full border px-2 py-1" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingEdit} className="bg-blue-600 text-white px-3 py-1 rounded">{savingEdit ? "Čuvam…" : "Sačuvaj izmene"}</button>
                      <button type="button" onClick={() => setEditId(null)} className="px-3 py-1 border rounded">Otkaži</button>
                    </div>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
