// src/pages/AdminUserOrdersPage.tsx (ili .jsx)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../api/apiService";

const unwrap = (res: any) => res?.data?.data?.items ?? res?.data?.data ?? res?.data ?? [];

export default function AdminUserOrdersPage() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  const userId = paramId && paramId !== "undefined" ? paramId : null;

  const [orders, setOrders] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) {
        setErr("Nedostaje ID korisnika u URL-u.");
        setLoading(false);
        return;
      }

      try {
        // Učitaj narudžbine za korisnika + sve knjige (ili backend-ov items)
        const [ordersRes, booksRes] = await Promise.all([
          api.get(`/orders?userId=${encodeURIComponent(userId)}`),
          api.get(`/books`)
        ]);

        const allOrders = unwrap(ordersRes).map((o: any) => ({
          ...o,
          id: o.id ?? o._id,
          bookId: o.bookId ?? o.book?.id ?? o.book?._id, // fallback ako backend vraća ugnježden objekat
        }));

        const allBooks = unwrap(booksRes).map((b: any) => ({
          ...b,
          id: b.id ?? b._id,
        }));

        if (!alive) return;
        setOrders(allOrders);
        setBooks(allBooks);
      } catch (e: any) {
        if (!alive) return;
        const msg =
          e?.response?.data?.error ||
          (e?.response?.status === 403 ? "Nemate pravo pristupa ovim podacima." : null) ||
          "Greška pri učitavanju podataka.";
        setErr(msg);
      } finally {
        if (alive) setLoading(false); // ✅ uvek gasimo spinner
      }
    })();

    return () => { alive = false; };
  }, [userId]);

  const bookById = (id: string) => books.find((b) => b.id === id);

  const active = orders.filter((o) => !o.returnedAt);
  const history = orders.filter((o) => !!o.returnedAt);

  const renderOrder = (o: any) => {
    const b = bookById(o.bookId) || {};
    return (
      <div key={o.id} className="p-4 border rounded-xl bg-white flex justify-between items-center">
        <div>
          <div className="font-semibold">{b.title || "Nepoznata knjiga"}</div>
          <div className="text-gray-600">{b.author || ""}</div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>Iznajmljeno: {new Date(o.rentedAt).toLocaleString()}</div>
          {o.returnedAt && <div>Vraćeno: {new Date(o.returnedAt).toLocaleString()}</div>}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <header className="flex justify-between items-center mb-8">
          <Navbar />
          <h1 className="text-3xl font-bold">Admin – Porudžbine korisnika</h1>
        </header>
        <p>Učitavanje…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <header className="flex justify-between items-center mb-8">
          <Navbar />
          <h1 className="text-3xl font-bold">Admin – Porudžbine korisnika</h1>
        </header>
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-red-600 mb-4">{err}</p>
          <button onClick={() => navigate(-1)} className="px-3 py-2 bg-gray-200 rounded">
            Nazad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <header className="flex justify-between items-center mb-8">
        <Navbar />
        <h1 className="text-3xl font-bold">Admin – Porudžbine korisnika</h1>
      </header>

      <main className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Aktivne porudžbine</h2>
          {active.length ? (
            <div className="space-y-4">{active.map(renderOrder)}</div>
          ) : (
            <p className="text-gray-600">Nema aktivnih porudžbina.</p>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Istorija porudžbina</h2>
          {history.length ? (
            <div className="space-y-4">{history.map(renderOrder)}</div>
          ) : (
            <p className="text-gray-600">Još nema vraćenih porudžbina.</p>
          )}
        </section>
      </main>
    </div>
  );
}
