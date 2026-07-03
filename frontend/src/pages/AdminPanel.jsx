import { useEffect, useState } from "react";
import client from "../api/client";

export default function AdminPanel() {
  const [tab, setTab] = useState("activity");
  const [activity, setActivity] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    client.get("/admin/activity").then((res) => setActivity(res.data));
    client.get("/admin/users").then((res) => setUsers(res.data.users));
    client.get("/admin/listings").then((res) => setListings(res.data.listings));
  }, []);

  async function toggleBan(user) {
    await client.patch(`/admin/users/${user.id}/ban`, { isBanned: !user.isBanned });
    const res = await client.get("/admin/users");
    setUsers(res.data.users);
  }

  async function removeListing(id) {
    await client.delete(`/admin/listings/${id}`);
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="container">
      <h2>Admin</h2>
      <div className="nav-links" style={{ marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={() => setTab("activity")}>Activity</button>
        <button className="btn btn-outline" onClick={() => setTab("users")}>Users</button>
        <button className="btn btn-outline" onClick={() => setTab("listings")}>Listings</button>
      </div>

      {tab === "activity" && activity && (
        <div className="grid">
          <div className="card"><h3>{activity.userCount}</h3>Total users</div>
          <div className="card"><h3>{activity.listingCount}</h3>Total listings</div>
          <div className="card"><h3>{activity.activeListingCount}</h3>Active listings</div>
          <div className="card"><h3>{activity.interestCount}</h3>Interest requests</div>
          <div className="card"><h3>{activity.messageCount}</h3>Chat messages</div>
        </div>
      )}

      {tab === "users" && (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.isBanned ? "Banned" : "Active"}</td>
                <td>
                  <button className="btn btn-outline" onClick={() => toggleBan(u)}>
                    {u.isBanned ? "Unban" : "Ban"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "listings" && (
        <table>
          <thead>
            <tr><th>Location</th><th>Rent</th><th>Owner</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td>{l.location}</td>
                <td>₹{l.rent.toLocaleString()}</td>
                <td>{l.owner.name}</td>
                <td>{l.status}</td>
                <td>
                  <button className="btn btn-danger" onClick={() => removeListing(l.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
