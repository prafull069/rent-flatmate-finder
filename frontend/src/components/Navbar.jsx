import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="mark">⌁</span> Keyhold
      </Link>
      <div className="nav-links">
        {!user && (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">
              <button className="btn btn-primary">Get started</button>
            </Link>
          </>
        )}
        {user?.role === "TENANT" && (
          <>
            <Link to="/browse">Browse rooms</Link>
            <Link to="/my-interests">My interests</Link>
            <Link to="/profile">My profile</Link>
          </>
        )}
        {user?.role === "OWNER" && (
          <>
            <Link to="/owner">My listings</Link>
          </>
        )}
        {user?.role === "ADMIN" && <Link to="/admin">Admin</Link>}
        {user && <button className="btn btn-outline" onClick={handleLogout}>Log out</button>}
      </div>
    </nav>
  );
}
