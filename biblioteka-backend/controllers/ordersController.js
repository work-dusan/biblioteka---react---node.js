// controllers/ordersController.js
import { Order } from "../models/Order.js";
import { Book } from "../models/Book.js";
import { parsePagination } from "../utils/pagination.js";
import { Activity } from "../models/Activity.js";

export async function listOrders(req, res) {
  const { skip, limit, sort, page } = parsePagination(req.query);

  const filter = {};
  if (req.user?.role === "user") {
    filter.userId = req.user.id;
  } else if (req.query.userId) {
    filter.userId = req.query.userId;
  }
  if (req.query.bookId) filter.bookId = req.query.bookId;

  // ⬇️ Povuci minimalne podatke o živoj knjizi (ako postoji)
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("bookId", "title author year image") // samo što treba za prikaz
      .lean(),
    Order.countDocuments(filter)
  ]);

  // ⬇️ Normalizuj i dodaj displayBook + isActive
  const items = rows.map(o => {
    const live =
      o.bookId && typeof o.bookId === "object"
        ? {
            id: o.bookId._id?.toString?.() ?? o.bookId.id ?? o.bookId,
            title: o.bookId.title,
            author: o.bookId.author,
            year: o.bookId.year,
            image: o.bookId.image
          }
        : null;

    const snap = o.bookSnapshot
      ? {
          id: o.bookSnapshot.id?.toString?.() ?? o.bookSnapshot.id ?? null,
          title: o.bookSnapshot.title,
          author: o.bookSnapshot.author,
          year: o.bookSnapshot.year,
          image: o.bookSnapshot.image
        }
      : null;

    return {
      ...o,
      id: o._id?.toString?.() ?? o.id, // da uvek postoji id string
      userId: o.userId?.toString?.() ?? o.userId ?? null,
      // bookId neka ostane string ako postoji (posle populate-a je objekat)
      bookId:
        o.bookId && o.bookId._id
          ? o.bookId._id.toString()
          : typeof o.bookId === "string"
          ? o.bookId
          : null,
      displayBook: live || snap, // 👈 frontend koristi samo ovo za naslov/sliku
      isActive: !o.returnedAt && (o.status ?? "active") === "active",
      _id: undefined,
      __v: undefined
    };
  });

  res.json({ data: { items, total, page, pageSize: limit } });
}

export async function createOrder(req, res) {
  const userId = req.user.id;
  const { bookId } = req.body;

  const book = await Book.findById(bookId);
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (book.rentedBy) return res.status(409).json({ error: "Book already rented" });

  book.rentedBy = userId;
  await book.save();

  const order = await Order.create({
    userId,
    bookId: book._id,
    bookSnapshot: {
      id: book._id,
      title: book.title,
      author: book.author,
      year: book.year,
      image: book.image
    },
    status: "active",
    rentedAt: new Date(),
    returnedAt: null
  });

  await Activity.create({ type: "ORDER_CREATED", userId, meta: { bookId: book._id } });

  // ⬇️ odmah vrati displayBook i isActive
  const displayBook = {
    id: book._id.toString(),
    title: book.title,
    author: book.author,
    year: book.year,
    image: book.image
  };

  res.status(201).json({
    data: {
      ...order.toJSON(),
      displayBook,
      isActive: true
    }
  });
}

export async function returnOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (req.user?.role === "user" && order.userId.toString() !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (order.returnedAt) return res.status(400).json({ error: "Already returned" });

  order.returnedAt = new Date();
  order.status = "returned";
  await order.save();

  // Ako knjiga još postoji, oslobodi je; ako je već obrisana (bookId === null), samo preskoči
  if (order.bookId) {
    await Book.findByIdAndUpdate(order.bookId, { rentedBy: null });
  }

  await Activity.create({
    type: "ORDER_RETURNED",
    userId: order.userId,
    meta: { bookId: order.bookId ?? order.bookSnapshot?.id ?? null }
  });

  res.json({ data: order.toJSON() });
}
