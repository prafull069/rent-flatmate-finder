import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "TENANT" });
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const user = await register(form.name, form.email, form.password, form.role);
      navigate(user.role === "OWNER" ? "/owner" : "/browse");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div className="auth-page">
      <h2>Create your account</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>I am a...</label>
          <select value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="TENANT">Tenant, looking for a room</option>
            <option value="OWNER">Owner, listing a room</option>
          </select>
        </div>
        <div className="form-group">
          <label>Full name</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            minLength={6}
            required
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
          Create account
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
