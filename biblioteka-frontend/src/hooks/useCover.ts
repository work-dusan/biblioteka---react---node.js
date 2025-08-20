import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Dohvata URL korica knjige sa OpenLibrary na osnovu naslova.
 * Vraća string URL ili null ako nije pronađeno.
 */
export default function useCover(title: string | null | undefined) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCover = async () => {
      try {
        const res = await axios.get(
          `https://openlibrary.org/search.json?title=${encodeURIComponent(title ?? "")}`
        );
        const doc = res.data?.docs?.[0];
        if (!cancelled && doc?.cover_i) {
          setCoverUrl(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
        }
      } catch (err) {
        console.error("Greška pri dohvatu korica:", err);
      }
    };

    if (title && title.trim().length > 0) fetchCover();
    else setCoverUrl(null);

    return () => { cancelled = true; };
  }, [title]);

  return coverUrl;
}
