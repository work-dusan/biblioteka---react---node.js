import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { Book } from "../models/Book.js";
import { parsePagination } from "../utils/pagination.js";

export async function listUsers(req, res) {
  const { skip, limit, sort, page } = parsePagination(req.query);
  const q = String(req.query.q ?? "").trim();
  const filter = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } }
    ];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  res.json({ data: { items, total, page, pageSize: limit } });
}

export async function updateUser(req, res) {
  const id = req.params.id;
  const updates = { ...req.body };
  if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);

  if (req.user?.role === "user") {
    delete updates.role;
    if (req.user.id !== id) return res.status(403).json({ error: "Forbidden" });
  }

  if (updates.role && req.user?.id === id) {
    return res.status(400).json({ error: "Cannot change own role" });
  }

  if (updates.email) {
    const emailExists = await User.findOne({ email: updates.email, _id: { $ne: id } });
    if (emailExists) return res.status(409).json({ error: "Email already in use" });
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ data: user });
}

export async function deleteUser(req, res) {
  const id = req.params.id;
  if (req.user?.id === id) return res.status(400).json({ error: "Cannot delete yourself" });

  const activeOrders = await Order.find({ userId: id, returnedAt: null });
  for (const o of activeOrders) {
    await Book.findByIdAndUpdate(o.bookId, { rentedBy: null });
    o.returnedAt = new Date();
    await o.save();
  }

  const orders = await Order.find({ userId: id });
  await Promise.all(orders.map(o => o.deleteOne()));
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ data: true });
}

export async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Korisnik sa ovim emailom već postoji" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role: role || "user" });
    await user.save();
    res.status(201).json({ data: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: "Greška pri kreiranju korisnika", details: err.message });
  }
}
