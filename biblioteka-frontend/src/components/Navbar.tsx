// src/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/"); // odmah vrati na početnu
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold hover:text-gray-200">
          📚 BookApp
        </Link>

        <div className="flex gap-6 items-center">
          <Link to="/" className="hover:text-gray-200">Početna</Link>

          {user?.role === "admin" && (
            <Link to="/admin" className="hover:text-gray-200">Admin Panel</Link>
          )}
          {user?.role === "user" && (
            <Link to="/profile" className="hover:text-gray-200">Moj Profil</Link>
          )}

          {user ? (
            <>
              <span className="font-medium">{user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600"
              >
                Odjavi se
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-200">Prijava</Link>
              <Link to="/register" className="hover:text-gray-200">Registracija</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
