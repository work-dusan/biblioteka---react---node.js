import { Router } from "express";
import { listOrders, createOrder, returnOrder } from "../controllers/ordersController.js";
import { auth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { orderCreateSchema, orderReturnSchema } from "../validation/order.validation.js";

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

router.get("/", auth, listOrders);
router.post("/", auth, requireRole(["user"]), validate(orderCreateSchema), createOrder);
router.patch("/:id/return", auth, validate(orderReturnSchema), returnOrder);

export default router;
