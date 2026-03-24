import { FaBell, FaCog, FaSignOutAlt, FaSearch } from "react-icons/fa";
import React, { useState } from 'react';
import skLogo from "../assets/sk-logo.png";
import "../styles/navbar.css";

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem("user")) || {
    name: "User",
    role: "chairman"
  };

  function logout(){
    localStorage.removeItem("user");
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
              {user.name.charAt(0)}
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