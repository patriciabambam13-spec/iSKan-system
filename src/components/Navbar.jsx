import { FaBell, FaCog, FaSignOutAlt, FaSearch } from "react-icons/fa";
import React, { useState, useEffect } from 'react';
import skLogo from "../assets/sk-logo.png";
import "../styles/navbar.css";
import { supabase } from "../services/supabaseClient";

export default function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user;
        if (currentUser) {
          // The user object from Supabase has `user_metadata` which is where you'd store custom fields like name and role.
          setUser({
            name: currentUser.user_metadata?.name || currentUser.email, // Fallback to email if name is not in metadata
            role: currentUser.user_metadata?.role || "kagawad", // Default to 'kagawad' if role is not set
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      // Cleanup the subscription when the component unmounts
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    }
    // Redirect to home/login page. The onAuthStateChange listener will handle clearing user state.
    window.location.href = "/";
  }

  function Settings(){
    window.location.href = "/settings";
  }
  // State to track if the drawer is visible
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Function to toggle the state
  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  // If there's no user, don't render the navbar.
  // This is useful to prevent showing the navbar on login/signup pages.
  if (!user) {
    return null;
  }

  // Notice we wrap the whole return in empty tags <> ... </> 
  // because React requires a single parent element when returning siblings
  return (
    <>
      <div className="navbar">

        {/* LEFT SIDE */}
        <div className="nav-left">
          <img src={skLogo} className="nav-logo" alt="SK Logo" />

          <div className="nav-title">
            <span className="system-name">iSKan</span>
            <span className="system-role">
              {user.role === "chairman"
                ? "SK Chairman Dashboard"
                : "SK Kagawad Dashboard"}
            </span>
          </div>
        </div>

        {/* CENTER SEARCH */}
        <div className="nav-search">
          <FaSearch className="search-icon"/>
          <input
            type="text"
            placeholder="Search Youth by Name"
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="nav-right">

          {/* ADDED: Click event and button wrapper for the Bell */}
          <button className="nav-btn" onClick={toggleNotifications}>
            <FaBell className="nav-icon"/>
          </button>

          <button className="nav-btn" onClick={Settings}> 
            <FaCog className="nav-icon"/> 
          </button>

          <div className="user-section">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">
                {user.role === "chairman"
                  ? "SK Chairman"
                  : "SK Kagawad"}
              </span>
            </div>
          </div>

          <button className="logout-btn" onClick={logout}>
            <FaSignOutAlt/>
          </button>

        </div>
      </div>

      {/* --- NOTIFICATION DRAWER SECTION --- */}

      {/* 1. Dark Overlay (Clicks here close the drawer) */}
      {isNotificationOpen && (
        <div 
          className="drawer-overlay" 
          onClick={() => setIsNotificationOpen(false)}
        ></div>
      )}

      {/* 2. The Sliding Drawer */}
      <div className={`notification-drawer ${isNotificationOpen ? 'open' : ''}`}>
        
        <div className="drawer-header">
          <h3>Notifications</h3>
          <button className="close-button" onClick={() => setIsNotificationOpen(false)}>
            ✖
          </button>
        </div>

        <div className="drawer-content">
          {/* Example Notifications */}
          <div className="notification-card">
            <p>New youth registration awaiting approval.</p>
            <span className="time-stamp">5 mins ago</span>
          </div>
          <div className="notification-card">
            <p>System maintenance completed.</p>
            <span className="time-stamp">1 hour ago</span>
          </div>
        </div>

      </div>
    </>
  );
}