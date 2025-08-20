export type Role = "user" | "admin";

export interface User {
  _id: string;          // Mongo ID
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  favorites: string[];
}


export interface Book {
  id: string;
  title: string;
  author: string;
  year: string;
  image?: string | null;
  description?: string | null;
  rentedBy: string | null;
}

export interface Order {
  id: string;
  userId: string;
  bookId: string;
  rentedAt: string;        // ISO
  returnedAt: string | null;
}
