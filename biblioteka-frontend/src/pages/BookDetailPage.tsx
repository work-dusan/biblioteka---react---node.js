// src/pages/BookDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/apiService";
import type { Book } from "../types";

function normalizeBook(raw: any): Book {
  // mapira Mongo _id -> id, i doda fallback polja
  return {
    id: raw?._id ?? raw?.id ?? "",
    title: raw?.title ?? "",
    author: raw?.author ?? "",
    description: raw?.description ?? "",
    image: raw?.image ?? "",
    rentedBy: raw?.rentedBy ?? null,
    // dodaj ostala polja ako postoje u tvom tipu
  } as Book;
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`/books/${id}`);
        // backend vraća { data: {...} }
        const payload = res?.data?.data ?? res?.data;
        const b = normalizeBook(payload);
        if (!cancelled) setBook(b);
      } catch (e: any) {
        if (!cancelled) setErr(e?.response?.data?.error || "Greška pri dohvaćanju knjige");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto p-4">Učitavanje…</div>;
  if (err) return (
    <div className="max-w-4xl mx-auto p-4 text-red-600 space-y-3">
      <div>{err}</div>
      <Link to="/" className="text-blue-600 underline">← Nazad</Link>
    </div>
  );
  if (!book) return <div className="max-w-4xl mx-auto p-4">Knjiga nije pronađena.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Link to="/" className="text-blue-600 underline">← Nazad</Link>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <img
            src={book.image || "https://placehold.co/400x560?text=No+Cover"}
            alt={book.title}
            className="w-full rounded-xl shadow"
          />
        </div>
        <div className="md:col-span-2">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-gray-600 mb-4">Autor: {book.author}</p>
          <p className="leading-7">{book.description || "Nema opisa."}</p>
        </div>
      </div>
    </div>
  );
}
