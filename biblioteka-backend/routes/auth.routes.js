import { Router } from "express";
import { register, login, me } from "../controllers/authController.js";
import { auth } from "../middleware/authMiddleware.js";
import { registerSchema, loginSchema } from "../validation/auth.validation.js";

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ error: "Validation error", details: error.details.map(d => d.message) });
    req.body = value;
    next();
  };
}

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", auth, me);

export default router;
