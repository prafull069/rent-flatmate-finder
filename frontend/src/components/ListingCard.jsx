import { Link } from "react-router-dom";
import CompatibilityBadge from "./CompatibilityBadge";

export default function ListingCard({ listing }) {
  const photo = listing.photos?.[0];

  return (
    <div className="card listing-card">
      {photo && <img className="listing-photo" src={photo} alt={listing.location} />}
      <div>
        <span className={`status-badge status-${listing.status?.toLowerCase()}`}>
          {listing.status}
        </span>
      </div>
      <h3>{listing.location}</h3>
      <div className="listing-rent">₹{listing.rent.toLocaleString()}/mo</div>
      <div className="listing-meta">
        {listing.roomType} · {listing.furnishing} · Available{" "}
        {new Date(listing.availableFrom).toLocaleDateString()}
      </div>
      {listing.compatibility && <CompatibilityBadge compatibility={listing.compatibility} />}
      <Link to={`/listings/${listing.id}`}>
        <button className="btn btn-secondary" style={{ width: "100%" }}>
          View details
        </button>
      </Link>
    </div>
  );
}
