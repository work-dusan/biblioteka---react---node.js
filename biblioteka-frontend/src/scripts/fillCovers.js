import fs from "fs/promises";
import axios from "axios";

async function run() {
  try {
    const raw = await fs.readFile("db.json", "utf-8");
    const db = JSON.parse(raw);

    for (let book of db.books) {
      try {
        const res = await axios.get(
          `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}`
        );
        const doc = res.data.docs?.[0];
        if (doc?.cover_i) {
          book.image = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        }
      } catch (err) {
        console.error(`Greška za ${book.title}:`, err.message);
      }
      // osiguraj da rentedBy postoji
      if (book.rentedBy === undefined) book.rentedBy = null;
    }

    await fs.writeFile("db.json", JSON.stringify(db, null, 2));
    console.log("✅ db.json ažuriran sa cover URL-ovima.");
  } catch (err) {
    console.error("Neuspešna obrada fillCovers:", err);
    process.exit(1);
  }
}

// Pokreći: npm run fill:covers
run();
