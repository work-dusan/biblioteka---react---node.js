// src/pages/RegisterPage.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function RegisterPage() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Ime mora imati bar 2 znaka.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) errs.email = "Nevažeća email adresa.";
    if (password.length < 6) errs.password = "Lozinka mora imati najmanje 6 karaktera.";
    return errs;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setErrors({}); // očisti prethodne greške

  // lokalna validacija
  const errs = validate();
  if (Object.keys(errs).length) {
    setErrors(errs);
    return;
  }

  // pozovi backend registraciju
  const res = await register(name.trim(), email.trim(), password);

  if (res.success) {
    // uspeh → idi na profil (ili /)
    navigate("/profile");
  } else {
    // neuspeh → ostani na istoj strani i prikaži poruku
    const msg = res.message || "Email je već registrovan.";
    setErrors({ email: msg }); // ili npr. setErrors({ form: msg })
  }
};

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4">Registracija</h2>

      {errors.general && <div className="mb-3 text-red-600">{errors.general}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Ime i prezime</label>
          <input
            type="text"
            className={`w-full border px-3 py-2 rounded ${errors.name ? "border-red-500" : ""}`}
            value={name}
            onChange={e => setName(e.currentTarget.value)}
            required
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            className={`w-full border px-3 py-2 rounded ${errors.email ? "border-red-500" : ""}`}
            value={email}
            onChange={e => setEmail(e.currentTarget.value)}
            required
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block mb-1">Lozinka</label>
          <input
            type="password"
            className={`w-full border px-3 py-2 rounded ${errors.password ? "border-red-500" : ""}`}
            value={password}
            onChange={e => setPassword(e.currentTarget.value)}
            required
          />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full bg-green-600 text-white py-2 rounded-xl transition ${
            submitting ? "opacity-70 cursor-not-allowed" : "hover:bg-green-700"
          }`}
        >
          {submitting ? "Kreiram nalog…" : "Registruj se"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Već imaš nalog?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Prijavi se
        </Link>
      </p>

      <div className="mt-6 text-center">
        <Link to="/" className="text-gray-600 hover:text-gray-900 underline">
          ← Nazad na početnu
        </Link>
      </div>
    </div>
  );
}
