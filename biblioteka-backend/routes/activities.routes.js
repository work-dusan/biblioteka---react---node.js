import { Router } from "express";
import { Activity } from "../models/Activity.js";
import { auth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

router.get("/", auth, requireRole(["admin"]), async (req, res) => {
  const { skip, limit, sort, page } = parsePagination(req.query);
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.userId) filter.userId = req.query.userId;

  const [items, total] = await Promise.all([
    Activity.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Activity.countDocuments(filter)
  ]);
  res.json({ data: { items, total, page, pageSize: limit } });
});

export default router;
