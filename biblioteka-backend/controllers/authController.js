import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Activity } from "../models/Activity.js";

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed, role: "user" });

  const token = signToken(user.toJSON());
  await Activity.create({ type: "USER_REGISTERED", userId: user._id, meta: { email } });

  res.status(201).json({ data: { ...user.toJSON(), token } });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user.toJSON());
  await Activity.create({ type: "USER_LOGIN", userId: user._id, meta: { email } });
  res.json({ data: { ...user.toJSON(), token } });
}

export async function me(req, res) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ data: user.toJSON() });
}
