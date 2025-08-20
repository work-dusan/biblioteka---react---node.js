import { Router } from "express";
import { listUsers, updateUser, deleteUser, createUser } from "../controllers/usersController.js";
import { auth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { userUpdateSchema } from "../validation/user.validation.js";

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

router.get("/", auth, requireRole(["admin"]), listUsers);
router.patch("/:id", auth, validate(userUpdateSchema), updateUser);
router.post("/", auth, requireRole(["admin"]), createUser); 
router.delete("/:id", auth, requireRole(["admin"]), deleteUser);

export default router;
