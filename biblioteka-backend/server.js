import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { connectMongo } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/books.routes.js";
import orderRoutes from "./routes/orders.routes.js";
import userRoutes from "./routes/users.routes.js";
import activityRoutes from "./routes/activities.routes.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/", (_req, res) => res.json({ ok: true, service: "biblioteka-backend-js" }));

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);

const port = Number(process.env.PORT || 4000);
connectMongo().then(() => {
  app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
}).catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});
