import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import useAuth from "../hooks/useAuth";
import api from "../api/apiService";
import type { Order, Book } from "../types";

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, booksRes] = await Promise.all([
        api.get(`/orders`, { params: { userId: user?._id } }),
        api.get("/books")
      ]);
      setOrders(ordersRes.data as Order[]);
      setBooks(booksRes.data as Book[]);
    } catch (err) {
      console.error("Greška pri učitavanju:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user]);

  const handleReturn = async (order: Order) => {
    try {
      const now = new Date().toISOString();
      await api.patch(`/orders/${order.id}`, { returnedAt: now });
      await api.patch(`/books/${order.bookId}`, { rentedBy: null });
      fetchData();
    } catch (err) {
      console.error("Greška pri vraćanju knjige:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <p>Učitavanje porudžbina…</p>
      </div>
    );
  }

  const active = orders.filter(o => o.returnedAt === null);
  const history = orders.filter(o => o.returnedAt !== null);

  const renderOrder = (order: Order, isActive: boolean) => {
    const book = books.find(b => b.id === order.bookId);
    return (
      <div key={order.id} className="bg-white p-4 rounded-2xl shadow flex items-center gap-4">
        <img
          src={book?.image || "https://via.placeholder.com/80x120?text=No+Cover"}
          alt={book?.title}
          className="w-20 h-28 object-cover rounded"
        />
        <div className="flex-1">
          <h3 className="font-bold">{book?.title || "Nepoznata knjiga"}</h3>
          <p className="text-gray-600">{book?.author}</p>
          <p className="text-sm text-gray-500">
            Iznajmljena: {new Date(order.rentedAt).toLocaleDateString()}
          </p>
          {order.returnedAt && (
            <p className="text-sm text-gray-500">
              Vraćena: {new Date(order.returnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {isActive && (
          <button onClick={() => handleReturn(order)} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition">
            Vrati
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <Navbar />
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">← Nazad</button>
      </header>

      <main className="flex-grow space-y-8 max-w-4xl mx-auto">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Aktivne porudžbine</h2>
          {active.length > 0 ? <div className="space-y-4">{active.map(o => renderOrder(o, true))}</div>
            : <p className="text-gray-600">Nemate aktivnih porudžbina.</p>}
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Istorija porudžbina</h2>
          {history.length > 0 ? <div className="space-y-4">{history.map(o => renderOrder(o, false))}</div>
            : <p className="text-gray-600">Još nema vraćenih porudžbina.</p>}
        </section>
      </main>
    </div>
  );
}
