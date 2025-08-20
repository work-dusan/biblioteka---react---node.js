// src/pages/AdminUsersPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiService";
import type { User } from "../types";
import useAuth from "../hooks/useAuth";

type Order = "asc" | "desc";

// backend: { data: { items: [...] } } ili { data: [...] }
function pickUsers(payload: any): any[] {
  if (payload?.data?.data?.items && Array.isArray(payload.data.data.items)) {
    return payload.data.data.items;
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) return payload;
  return [];
}

function normalizeUser(raw: any): User {
  return {
    _id: raw?._id ?? raw?.id ?? "",
    name: raw?.name ?? "",
    email: raw?.email ?? "",
    role: raw?.role ?? "user",
    favorites: Array.isArray(raw?.favorites) ? raw.favorites : [],
  } as User;
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role">("name");
  const [order, setOrder] = useState<Order>("asc");

  // Dodavanje
  const [showCreate, setShowCreate] = useState(false);
  const [nameN, setNameN] = useState("");
  const [emailN, setEmailN] = useState("");
  const [roleN, setRoleN] = useState<"user" | "admin">("user");
  const [passwordN, setPasswordN] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [creating, setCreating] = useState(false);

  // Izmena
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      setUsers(pickUsers(res).map(normalizeUser));
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Greška pri učitavanju korisnika.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(() => {
    const copy = [...users];
    copy.sort((a, b) => {
      const av = String(a[sortBy] ?? "").toLowerCase();
      const bv = String(b[sortBy] ?? "").toLowerCase();
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    });
    const qq = q.trim().toLowerCase();
    if (!qq) return copy;
    return copy.filter(
      (u) =>
        u.name.toLowerCase().includes(qq) ||
        u.email.toLowerCase().includes(qq) ||
        u.role.toLowerCase().includes(qq)
    );
  }, [users, q, sortBy, order]);

  // ====== Inline izmena ======
  function startEdit(u: User) {
    setEditId(u._id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role as "user" | "admin");
    setEditErr("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    try {
      setSavingEdit(true);
      const token = localStorage.getItem("token") || "";
      const res = await api.patch(
        `/users/${editId}`,
        { name: editName.trim(), email: editEmail.trim(), role: editRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = normalizeUser(res?.data?.data ?? res?.data);
      setUsers((prev) => prev.map((u) => (u._id === editId ? updated : u)));
      setEditId(null);
    } catch (e: any) {
      setEditErr(e?.response?.data?.error || "Greška pri izmeni korisnika.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeUser(targetId: string) {
    if (!confirm("Da li sigurno želiš da obrišeš ovog korisnika?")) return;
    try {
      await api.delete(`/users/${targetId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== targetId));
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Greška pri brisanju korisnika.");
    }
  }

  // ====== Inline dodavanje ======
  function validateCreate(): string {
    if (nameN.trim().length < 2) return "Ime mora imati bar 2 znaka.";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(emailN.trim())) return "Neispravan email format.";
    if (passwordN.length < 6) return "Lozinka mora imati najmanje 6 karaktera.";
    return "";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const v = validateCreate();
    if (v) return setCreateErr(v);

    try {
      setCreating(true);
      setCreateErr("");
      const token = localStorage.getItem("token") || "";
      const res = await api.post(
        "/users",
        { name: nameN.trim(), email: emailN.trim(), password: passwordN, role: roleN },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const created = normalizeUser(res?.data?.data ?? res?.data);
      setUsers((prev) => [created, ...prev]);

      setNameN(""); setEmailN(""); setRoleN("user"); setPasswordN("");
      setShowCreate(false);
    } catch (e: any) {
      setCreateErr(e?.response?.data?.error || "Greška pri kreiranju korisnika.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="p-4">Učitavanje…</div>;
  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Korisnici</h1>
        <button onClick={() => setShowCreate((s) => !s)} className="bg-green-600 text-white px-4 py-2 rounded">
          {showCreate ? "× Zatvori" : "+ Dodaj korisnika"}
        </button>
      </div>

      {/* Inline forma za dodavanje */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 border rounded p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
          {createErr && <div className="col-span-2 text-red-600">{createErr}</div>}
          <input placeholder="Ime" value={nameN} onChange={(e) => setNameN(e.target.value)} className="border px-2 py-1" />
          <input placeholder="Email" type="email" value={emailN} onChange={(e) => setEmailN(e.target.value)} className="border px-2 py-1" />
          <select value={roleN} onChange={(e) => setRoleN(e.target.value as any)} className="border px-2 py-1">
            <option value="user">Korisnik</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Privremena lozinka" type="password" value={passwordN} onChange={(e) => setPasswordN(e.target.value)} className="border px-2 py-1" />
          <button type="submit" disabled={creating} className="bg-green-600 text-white px-4 py-2 rounded col-span-2">
            {creating ? "Sačuvavam…" : "Sačuvaj"}
          </button>
        </form>
      )}

      {/* Search/sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input className="flex-1 border px-3 py-2 rounded" placeholder="Pretraga…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="border px-3 py-2 rounded">
          <option value="name">Ime</option>
          <option value="email">Email</option>
          <option value="role">Uloga</option>
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as any)} className="border px-3 py-2 rounded">
          <option value="asc">Rastuće</option>
          <option value="desc">Opadajuće</option>
        </select>
      </div>

      <table className="w-full border rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border-b">Ime</th>
            <th className="p-2 border-b">Email</th>
            <th className="p-2 border-b">Uloga</th>
            <th className="p-2 border-b">Akcije</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((u) => (
            <tr key={u._id} className="border-b align-top">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-2">
                  {u.role === "user" && (
                    <button onClick={() => navigate(`/admin/users/${u._id}/orders`)} className="px-2 py-1 bg-slate-600 text-white rounded">
                      Porudžbine
                    </button>
                  )}
                  <button onClick={() => startEdit(u)} className="px-2 py-1 bg-blue-600 text-white rounded">Izmeni</button>
                  {currentUser?._id !== u._id && (
                    <button onClick={() => removeUser(u._id)} className="px-2 py-1 bg-red-600 text-white rounded">Obriši</button>
                  )}
                </div>

                {/* Inline forma za izmenu */}
                {editId === u._id && (
                  <form onSubmit={handleEdit} className="mt-3 border rounded p-3 bg-gray-50 space-y-2">
                    {editErr && <div className="text-red-600">{editErr}</div>}
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border px-2 py-1" />
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border px-2 py-1" />
                    <select value={editRole} onChange={(e) => setEditRole(e.target.value as any)} className="w-full border px-2 py-1">
                      <option value="user">Korisnik</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingEdit} className="bg-blue-600 text-white px-3 py-1 rounded">
                        {savingEdit ? "Čuvam…" : "Sačuvaj izmene"}
                      </button>
                      <button type="button" onClick={() => setEditId(null)} className="px-3 py-1 border rounded">
                        Otkaži
                      </button>
                    </div>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
