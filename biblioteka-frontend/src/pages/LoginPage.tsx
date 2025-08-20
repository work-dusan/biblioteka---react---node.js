import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res.success) {
      navigate("/");
    } else {
      setError(res.message ?? "Greška pri prijavi.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4">Prijava</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            className="w-full border px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Lozinka</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Prijavi se
        </button>
      </form>

      <p className="mt-4 text-sm">
        Nemaš nalog?{" "}
        <Link to="/register" className="text-green-600 hover:underline">
          Registruj se
        </Link>
      </p>

      <div className="mt-6 text-center">
        <button
          onClick={() => navigate("/")}
          className="text-gray-600 hover:text-gray-900 underline"
        >
          ← Nazad na početnu
        </button>
      </div>
    </div>
  );
}
