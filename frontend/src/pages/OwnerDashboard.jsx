import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

const emptyForm = {
  location: "",
  rent: "",
  availableFrom: "",
  roomType: "Private room",
  furnishing: "Furnished",
  photos: "",
};

export default function OwnerDashboard() {
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await client.get("/listings/mine");
    setListings(res.data.listings);
  }

  useEffect(() => {
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      const photos = form.photos ? form.photos.split(",").map((p) => p.trim()) : [];
      await client.post("/listings", { ...form, photos });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create listing");
    }
  }

  async function markFilled(id) {
    await client.patch(`/listings/${id}/fill`);
    load();
  }

  async function respond(interestId, decision) {
    await client.patch(`/interests/${interestId}/respond`, { decision });
    load();
  }

  return (
    <div className="container">
      <div className="section-title">
        <h2>My listings</h2>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New listing"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={(e) => update("location", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Rent (₹/mo)</label>
                <input type="number" value={form.rent} onChange={(e) => update("rent", e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Available from</label>
                <input
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) => update("availableFrom", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Room type</label>
                <select value={form.roomType} onChange={(e) => update("roomType", e.target.value)}>
                  <option>Private room</option>
                  <option>Shared room</option>
                  <option>Entire apartment</option>
                  <option>Studio</option>
                </select>
              </div>
              <div className="form-group">
                <label>Furnishing</label>
                <select value={form.furnishing} onChange={(e) => update("furnishing", e.target.value)}>
                  <option>Furnished</option>
                  <option>Semi-furnished</option>
                  <option>Unfurnished</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Photo URLs (comma separated, optional)</label>
              <input value={form.photos} onChange={(e) => update("photos", e.target.value)} />
            </div>
            {error && <div className="error-text">{error}</div>}
            <button className="btn btn-primary" type="submit">
              Publish listing
            </button>
          </form>
        </div>
      )}

      {listings.length === 0 && (
        <div className="empty-state">
          <h3>No listings yet</h3>
          <p>Create your first listing to start receiving tenant interest.</p>
        </div>
      )}

      {listings.map((listing) => (
        <div className="card" key={listing.id} style={{ marginBottom: 20 }}>
          <div className="section-title">
            <div>
              <h3 style={{ marginBottom: 4 }}>
                <Link to={`/listings/${listing.id}`}>{listing.location}</Link>
              </h3>
              <span className={`status-badge status-${listing.status.toLowerCase()}`}>{listing.status}</span>
            </div>
            <div>
              <span className="listing-rent">₹{listing.rent.toLocaleString()}/mo</span>
              {listing.status === "ACTIVE" && (
                <button className="btn btn-outline" style={{ marginLeft: 12 }} onClick={() => markFilled(listing.id)}>
                  Mark as filled
                </button>
              )}
            </div>
          </div>

          <h4>Interest requests ({listing.interests?.length || 0})</h4>
          {(!listing.interests || listing.interests.length === 0) && (
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>No interest yet.</p>
          )}
          {listing.interests?.map((interest) => (
            <div
              key={interest.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderTop: "1px solid var(--line)",
              }}
            >
              <div>
                <strong>{interest.tenant.name}</strong> ({interest.tenant.email}){" "}
                <span className={`status-badge status-${interest.status.toLowerCase()}`}>{interest.status}</span>
              </div>
              <div>
                {interest.status === "PENDING" && (
                  <>
                    <button className="btn btn-primary" onClick={() => respond(interest.id, "ACCEPTED")}>
                      Accept
                    </button>{" "}
                    <button className="btn btn-outline" onClick={() => respond(interest.id, "DECLINED")}>
                      Decline
                    </button>
                  </>
                )}
                {interest.status === "ACCEPTED" && (
                  <Link to={`/chat/${interest.id}`}>
                    <button className="btn btn-secondary">Open chat</button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
