import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import api from "../api/apiService";
import useAuth from "../hooks/useAuth";
import type { Book } from "../types";

export default function BookCard({
  book,
  onOrdered,
}: {
  book: Book;
  onOrdered?: () => void;
}) {
  const { user, toggleFavorite } = useAuth();

  const isFavorited = !!user?.favorites?.includes(book.id);
  const [renting, setRenting] = useState(false);
  const [localRentedBy, setLocalRentedBy] = useState<string | null>(book.rentedBy ?? null);

  const currentUserId = (user as any)?.id ?? (user as any)?._id ?? null;

  const isRentedByMe = !!user && !!currentUserId && localRentedBy === currentUserId;
  const isFree = !localRentedBy;

  const handleOrder = async () => {
    if (!user || !currentUserId) return;
    setRenting(true);
    try {
      // ✅ Jedan korak — backend kreira order i zaključava knjigu
      await api.post("/orders", { bookId: book.id });

      // Optimistički označi lokalno da je iznajmljena od strane mene
      setLocalRentedBy(currentUserId);

      // Osveži listu u parentu
      onOrdered?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Greška pri poručivanju.";
      if (err?.response?.status === 409) {
        alert("Ova knjiga je već iznajmljena.");
      } else {
        alert(msg);
      }
      // rollback
      setLocalRentedBy(book.rentedBy ?? null);
    } finally {
      setRenting(false);
    }
  };

  return (
    <div className="relative flex flex-col bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition h-full">
      {user?.role === "user" && (
        <button
          onClick={() => toggleFavorite(book.id)}
          className="absolute top-3 right-3 z-10 p-1 bg-white rounded-full shadow"
        >
          <Star className={isFavorited ? "w-6 h-6 text-yellow-400" : "w-6 h-6 text-gray-400"} />
        </button>
      )}

      <Link to={`/books/${book.id}`} className="group mb-4">
        <div className="w-full h-64 bg-gray-100 rounded-md overflow-hidden">
          <img
            src={book.image || "https://placehold.co/300x400?text=No+Cover"}
            alt={book.title}
            className="w-full h-full object-cover transition group-hover:opacity-90"
          />
        </div>
        <h3 className="mt-3 text-lg font-bold group-hover:text-blue-600 transition">
          {book.title}
          <p className="text-gray-500 text-sm">Godina: {book.year ?? "—"}</p>
        </h3>
        <p className="text-gray-600">{book.author}</p>
      </Link>

      {user?.role === "user" && isFree && (
        <button
          onClick={handleOrder}
          disabled={renting}
          className={`mt-auto text-white py-2 rounded-xl transition ${
            renting ? "bg-green-600 opacity-70 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {renting ? "Iznajmljujem…" : "Poruči"}
        </button>
      )}

      {user && isRentedByMe && (
        <span className="mt-auto text-gray-500">Već ste iznajmili</span>
      )}

      {user && !isFree && !isRentedByMe && (
        <span className="mt-auto text-red-600">Iznajmljena</span>
      )}
    </div>
  );
}
