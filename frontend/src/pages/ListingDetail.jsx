import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client";
import CompatibilityBadge from "../components/CompatibilityBadge";
import { useAuth } from "../context/AuthContext";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [interestStatus, setInterestStatus] = useState("");

  useEffect(() => {
    client.get(`/listings/${id}`).then((res) => {
      setListing(res.data.listing);
      setCompatibility(res.data.compatibility);
    });
  }, [id]);

  async function expressInterest() {
    setInterestStatus("Sending...");
    try {
      await client.post("/interests", { listingId: id });
      setInterestStatus("Interest sent! The owner will be notified.");
    } catch (err) {
      setInterestStatus(err.response?.data?.error || "Could not send interest");
    }
  }

  if (!listing) return <div className="container">Loading…</div>;

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      {listing.photos?.[0] && (
        <img className="listing-photo" style={{ height: 280 }} src={listing.photos[0]} alt={listing.location} />
      )}
      <h2 style={{ marginTop: 16 }}>{listing.location}</h2>
      <div className="listing-rent">₹{listing.rent.toLocaleString()}/mo</div>
      <p className="listing-meta">
        {listing.roomType} · {listing.furnishing} · Available{" "}
        {new Date(listing.availableFrom).toLocaleDateString()}
      </p>
      <p>Listed by {listing.owner?.name}</p>

      {compatibility && (
        <div style={{ margin: "16px 0" }}>
          <CompatibilityBadge compatibility={compatibility} />
        </div>
      )}

      {user?.role === "TENANT" && listing.status === "ACTIVE" && (
        <>
          <button className="btn btn-primary" onClick={expressInterest}>
            Express interest
          </button>
          {interestStatus && <p style={{ marginTop: 10, fontSize: 14 }}>{interestStatus}</p>}
        </>
      )}
      {listing.status === "FILLED" && <p>This room has already been filled.</p>}
    </div>
  );
}
