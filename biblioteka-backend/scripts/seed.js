import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Book } from "../models/Book.js";

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/biblioteka";
  await mongoose.connect(uri);
  console.log("✅ Connected for seed");

  const adminEmail = "admin@biblioteka.com";
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const admin = await User.create({
      name: "Admin",
      email: adminEmail,
      password: await bcrypt.hash("admin123", 10),
      role: "admin"
    });
    console.log("Admin created:", admin.email);
  } else {
    console.log("Admin already exists.");
  }

  const count = await Book.countDocuments();
  if (count === 0) {
    await Book.insertMany([
      { title: "Na Drini ćuprija", author: "Ivo Andrić", year: "1945", image: null, description: "Klasik srpske književnosti." },
      { title: "Prokleta avlija", author: "Ivo Andrić", year: "1954", image: null, description: "Novela o usudu i krivici." },
      { title: "Seobe", author: "Miloš Crnjanski", year: "1929", image: null, description: "Epski roman o selidbama." }
    ]);
    console.log("Sample books inserted.");
  } else {
    console.log("Books already present.");
  }

  await mongoose.disconnect();
  console.log("✅ Seed done");
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
