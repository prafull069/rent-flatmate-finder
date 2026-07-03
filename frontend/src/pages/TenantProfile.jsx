import { useEffect, useState } from "react";
import client from "../api/client";

export default function TenantProfile() {
  const [form, setForm] = useState({
    preferredLocation: "",
    budgetMin: "",
    budgetMax: "",
    moveInDate: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    client.get("/tenant/profile").then((res) => {
      const p = res.data.profile;
      if (p) {
        setForm({
          preferredLocation: p.preferredLocation,
          budgetMin: p.budgetMin,
          budgetMax: p.budgetMax,
          moveInDate: p.moveInDate.slice(0, 10),
        });
      }
    });
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");
    try {
      await client.put("/tenant/profile", form);
      setStatus("Profile saved. Your matches will now be scored against these preferences.");
    } catch (err) {
      setStatus(err.response?.data?.error || "Could not save profile");
    }
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h2>My tenant profile</h2>
      <p style={{ color: "var(--ink-soft)" }}>
        This is what the compatibility engine matches listings against.
      </p>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Preferred location</label>
            <input
              value={form.preferredLocation}
              onChange={(e) => update("preferredLocation", e.target.value)}
              placeholder="e.g. Gomti Nagar, Lucknow"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Min budget (₹/mo)</label>
              <input
                type="number"
                value={form.budgetMin}
                onChange={(e) => update("budgetMin", e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Max budget (₹/mo)</label>
              <input
                type="number"
                value={form.budgetMax}
                onChange={(e) => update("budgetMax", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Move-in date</label>
            <input
              type="date"
              value={form.moveInDate}
              onChange={(e) => update("moveInDate", e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Save profile
          </button>
          {status && <p style={{ marginTop: 12, fontSize: 14 }}>{status}</p>}
        </form>
      </div>
    </div>
  );
}
