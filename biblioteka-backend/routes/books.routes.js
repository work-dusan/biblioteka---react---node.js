// routes/books.routes.js
import { Router } from "express";
import {
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  rentBook,
  returnBook,
} from "../controllers/booksController.js";
import { auth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { bookCreateSchema, bookUpdateSchema } from "../validation/book.validation.js";

const router = Router();

function validate(schema, property = "body") {
  return (req, res, next) => {
    const data = property === "body" ? req.body : (property === "query" ? req.query : req.params);
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ error: "Validation error", details: error.details.map(d => d.message) });
    if (property === "body") req.body = value;
    else if (property === "query") req.query = value;
    else req.params = value;
    next();
  };
}

router.get("/", listBooks);
router.get("/:id", getBook);

// samo admin za kreiranje / generalni update / brisanje
router.post("/", auth, requireRole(["admin"]), validate(bookCreateSchema), createBook);
router.patch("/:id", auth, requireRole(["admin"]), validate(bookUpdateSchema), updateBook);
router.delete("/:id", auth, requireRole(["admin"]), deleteBook);

// NOVO: user rent/return (menjaju SAMO rentedBy)
router.post("/:id/rent", auth, rentBook);
router.post("/:id/return", auth, returnBook);

export default router;
