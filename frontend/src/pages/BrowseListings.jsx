import { useEffect, useState } from "react";
import client from "../api/client";
import ListingCard from "../components/ListingCard";

export default function BrowseListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ location: "", budgetMin: "", budgetMax: "" });

  async function fetchListings() {
    setLoading(true);
    const params = {};
    if (filters.location) params.location = filters.location;
    if (filters.budgetMin) params.budgetMin = filters.budgetMin;
    if (filters.budgetMax) params.budgetMax = filters.budgetMax;
    const res = await client.get("/listings", { params });
    setListings(res.data.listings);
    setLoading(false);
  }

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilter(e) {
    e.preventDefault();
    fetchListings();
  }

  return (
    <div className="container">
      <div className="section-title">
        <h2>Browse rooms</h2>
      </div>

      <form className="filters-bar" onSubmit={handleFilter}>
        <div className="form-group">
          <label>Location</label>
          <input
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Hazratganj"
          />
        </div>
        <div className="form-group">
          <label>Min rent</label>
          <input
            type="number"
            value={filters.budgetMin}
            onChange={(e) => setFilters((f) => ({ ...f, budgetMin: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Max rent</label>
          <input
            type="number"
            value={filters.budgetMax}
            onChange={(e) => setFilters((f) => ({ ...f, budgetMax: e.target.value }))}
          />
        </div>
        <button className="btn btn-secondary" type="submit">Apply filters</button>
      </form>

      {loading && <p>Loading listings…</p>}

      {!loading && listings.length === 0 && (
        <div className="empty-state">
          <h3>No listings match yet</h3>
          <p>Try widening your location or budget filters.</p>
        </div>
      )}

      <div className="grid">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
