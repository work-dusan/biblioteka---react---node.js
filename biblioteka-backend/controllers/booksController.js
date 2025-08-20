// controllers/booksController.js
import { Book } from "../models/Book.js";
import { parsePagination } from "../utils/pagination.js";
import { Activity } from "../models/Activity.js";
import { Order } from "../models/Order.js";

export async function listBooks(req, res) {
  const { skip, limit, sort, page } = parsePagination(req.query);
  const q = String(req.query.q ?? "").trim();
  const filter = {};
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { author: { $regex: q, $options: "i" } }
    ];
  }
  const [items, total] = await Promise.all([
    Book.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Book.countDocuments(filter)
  ]);
  res.json({ data: { items, total, page, pageSize: limit } });
}

export async function getBook(req, res) {
  const book = await Book.findById(req.params.id).lean();
  if (!book) return res.status(404).json({ error: "Not found" });
  res.json({ data: book });
}

export async function createBook(req, res) {
  const book = await Book.create(req.body);
  await Activity.create({ type: "BOOK_CREATED", userId: req.user?.id ?? null, meta: { bookId: book._id } });
  res.status(201).json({ data: book.toJSON() });
}

export async function updateBook(req, res) {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
  if (!book) return res.status(404).json({ error: "Not found" });
  await Activity.create({ type: "BOOK_UPDATED", userId: req.user?.id ?? null, meta: { bookId: req.params.id } });
  res.json({ data: book });
}

export async function deleteBook(req, res) {
  try {
    const { id } = req.params;

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ error: "Not found" });

    // 1) Snapshot-uj porudžbine koje NEMAJU snapshot
    await Order.updateMany(
      {
        bookId: book._id,
        $or: [{ bookSnapshot: { $exists: false } }, { "bookSnapshot.title": { $exists: false } }]
      },
      {
        $set: {
          bookSnapshot: {
            id: book._id,
            title: book.title,
            author: book.author,
            year: book.year,
            image: book.image
          }
        }
      }
    );

    // 2) Sve AKTIVNE porudžbine za ovu knjigu zatvori (postavi returnedAt) i status
    await Order.updateMany(
      { bookId: book._id, returnedAt: null },
      { $set: { returnedAt: new Date(), status: "book_deleted" } }
    );

    // 3) Ukloni “živu” referencu (ostaće snapshot za prikaz)
    await Order.updateMany({ bookId: book._id }, { $unset: { bookId: "" } });

    // 4) Obriši knjigu
    await book.deleteOne();

    // 5) Aktivnost
    await Activity.create({
      type: "BOOK_DELETED",
      userId: req.user?.id ?? null,
      meta: { bookId: id }
    });

    return res.json({ data: true });
  } catch (e) {
    return res.status(500).json({ error: "Greška pri brisanju knjige", details: e.message });
  }
}


/**
 * User rent endpoint – menja samo rentedBy.
 * - Ako je već iznajmljena od drugog korisnika: 409
 * - Ako je već iznajmljena od istog korisnika: vrati OK (idempotentno)
 */
export async function rentBook(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Not found" });

  if (book.rentedBy && String(book.rentedBy) !== String(userId)) {
    return res.status(409).json({ error: "Book already rented" });
  }

  if (!book.rentedBy) {
    book.rentedBy = userId;
    await book.save();
    await Activity.create({ type: "BOOK_RENTED", userId, meta: { bookId: book._id } });
  }

  res.json({ data: book.toJSON() });
}

/**
 * Return endpoint – vraća knjigu.
 * - Može vlasnik ili admin.
 */
export async function returnBook(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ error: "Not found" });

  const isOwner = book.rentedBy && String(book.rentedBy) === String(userId);
  const isAdmin = req.user?.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (book.rentedBy) {
    book.rentedBy = null;
    await book.save();
    await Activity.create({ type: "BOOK_RETURNED", userId, meta: { bookId: book._id } });
  }

  res.json({ data: book.toJSON() });
}
