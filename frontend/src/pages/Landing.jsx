import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="container" style={{ textAlign: "center", paddingTop: 80 }}>
      <h1 style={{ fontSize: 42 }}>Find the room. Find the fit.</h1>
      <p style={{ fontSize: 18, color: "var(--ink-soft)", maxWidth: 520, margin: "0 auto 32px" }}>
        Keyhold scores every listing against your budget and location preferences,
        so you only chat with matches worth your time.
      </p>
      {!user && (
        <Link to="/register">
          <button className="btn btn-primary" style={{ fontSize: 16, padding: "12px 28px" }}>
            Get started
          </button>
        </Link>
      )}
      {user?.role === "TENANT" && (
        <Link to="/browse">
          <button className="btn btn-primary" style={{ fontSize: 16, padding: "12px 28px" }}>
            Browse rooms
          </button>
        </Link>
      )}
      {user?.role === "OWNER" && (
        <Link to="/owner">
          <button className="btn btn-primary" style={{ fontSize: 16, padding: "12px 28px" }}>
            Go to my listings
          </button>
        </Link>
      )}
    </div>
  );
}
