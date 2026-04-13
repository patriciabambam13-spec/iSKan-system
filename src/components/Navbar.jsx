import { FaBell, FaCog, FaSignOutAlt, FaSearch } from "react-icons/fa";
import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import skLogo from "../assets/sk-logo.png";
import "../styles/navbar.css";

export default function Navbar() {
  const role = Number(localStorage.getItem("userRole"));
  const name = localStorage.getItem("userName") || "User";
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Get user initials for avatar
  const getUserInitials = () => {
    const nameParts = name.trim().split(" ");
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return nameParts[0][0].toUpperCase();
  };

  // Fetch notifications and setup real-time listener
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("role_target", role)
        .order("created_at", { ascending: false });

      setNotifications(data || []);
    };

    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.new.role_target === role) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  function logout() {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    window.location.href = "/";
  }

  function Settings() {
    window.location.href = "/settings";
  }

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const unreadCount = notifications.length;

  if (!role) {
    return null;
  }

  return (
    <>
      <div className="navbar">
        {/* LEFT SIDE */}
        <div className="navbar-left">
          <img src={skLogo} className="navbar-logo" alt="SK Logo" />
          <div className="navbar-title">
            <span className="navbar-system-name">iSKan</span>
            <span className="navbar-system-role">
              {role === 1 ? "SK Chairman Dashboard" : "SK Kagawad Dashboard"}
            </span>
          </div>
        </div>

        {/* CENTER SEARCH */}
        <div className="navbar-search">
          <FaSearch className="navbar-search-icon" />
          <input type="text" placeholder="Search Youth by Name" />
        </div>

        {/* RIGHT SIDE */}
        <div className="navbar-right">
          <button className="navbar-btn" onClick={toggleNotifications}>
            <FaBell className="navbar-icon" />
            {unreadCount > 0 && (
              <span className="navbar-notification-badge">{unreadCount}</span>
            )}
          </button>

          <button className="navbar-btn" onClick={Settings}>
            <FaCog className="navbar-icon" />
          </button>

          <div className="navbar-user-section">
            <div className="navbar-avatar">{getUserInitials()}</div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{name}</span>
              <span className="navbar-user-role">
                {role === 1 ? "SK Chairman" : "SK Kagawad"}
              </span>
            </div>
          </div>

          <button className="navbar-logout-btn" onClick={logout}>
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* NOTIFICATION DRAWER */}
      {isNotificationOpen && (
        <div className="navbar-drawer-overlay" onClick={() => setIsNotificationOpen(false)}></div>
      )}

      <div className={`navbar-notification-drawer ${isNotificationOpen ? "open" : ""}`}>
        <div className="navbar-drawer-header">
          <h3>Notifications</h3>
          <button className="navbar-close-button" onClick={() => setIsNotificationOpen(false)}>
            ✖
          </button>
        </div>
        <div className="navbar-drawer-content">
          {notifications.length > 0 ? (
            notifications.map((notif, index) => (
              <div key={index} className="navbar-notification-card">
                <p>{notif.message}</p>
                <span className="navbar-time-stamp">
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="navbar-empty-notifications">
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}