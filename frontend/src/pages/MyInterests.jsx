import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function MyInterests() {
  const [interests, setInterests] = useState([]);

  useEffect(() => {
    client.get("/interests/mine").then((res) => setInterests(res.data.interests));
  }, []);

  return (
    <div className="container">
      <h2>My interest requests</h2>

      {interests.length === 0 && (
        <div className="empty-state">
          <h3>No interests sent yet</h3>
          <p>Browse listings and express interest to get started.</p>
        </div>
      )}

      {interests.map((interest) => (
        <div className="card" key={interest.id} style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>
              <Link to={`/listings/${interest.listing.id}`}>{interest.listing.location}</Link>
            </h3>
            <span className="listing-meta">₹{interest.listing.rent.toLocaleString()}/mo</span>{" "}
            <span className={`status-badge status-${interest.status.toLowerCase()}`}>{interest.status}</span>
          </div>
          {interest.status === "ACCEPTED" && (
            <Link to={`/chat/${interest.id}`}>
              <button className="btn btn-secondary">Open chat</button>
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
