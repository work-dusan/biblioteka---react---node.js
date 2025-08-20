import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-200 py-6 mt-12">
      <div className="max-w-5xl mx-auto text-center space-y-2">
        <p>© {new Date().getFullYear()} Dušan Stojiljković 5835. Sva prava zadržana.</p>
        <p>
          <a href="/" className="hover:underline">Početna</a> ·{" "}
          <a href="/profile" className="hover:underline">Profil</a> ·{" "}
          <a href="/orders" className="hover:underline">Porudžbine</a>
        </p>
      </div>
    </footer>
  );
}
