import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BrowseListings from "./pages/BrowseListings";
import ListingDetail from "./pages/ListingDetail";
import TenantProfile from "./pages/TenantProfile";
import MyInterests from "./pages/MyInterests";
import OwnerDashboard from "./pages/OwnerDashboard";
import Chat from "./pages/Chat";
import AdminPanel from "./pages/AdminPanel";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/listings/:id" element={<ListingDetail />} />

        <Route
          path="/browse"
          element={
            <ProtectedRoute roles={["TENANT"]}>
              <BrowseListings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={["TENANT"]}>
              <TenantProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-interests"
          element={
            <ProtectedRoute roles={["TENANT"]}>
              <MyInterests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner"
          element={
            <ProtectedRoute roles={["OWNER"]}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:interestId"
          element={
            <ProtectedRoute roles={["TENANT", "OWNER"]}>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
