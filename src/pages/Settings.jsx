import { useState } from "react";
import Navbar from "../components/Navbar";
import "../styles/settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("Information");

  return (
    <>
      <Navbar />

      <div className="settings-page">
        {/* HEADER */}
        <div className="settings-header">
          <button className="back-button" aria-label="Go back">
            &#8592;
          </button>
          <div className="header-titles">
            <h1>Settings</h1>
            <p>Manage your account setting and preferences</p>
          </div>
        </div>

        {/* MAIN CONTAINER */}
        <div className="settings-container">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="settings-sidebar">
            <ul>
              <li 
                className={activeTab === "Information" ? "active" : ""} 
                onClick={() => setActiveTab("Information")}
              >
                Information
              </li>
              <li 
                className={activeTab === "Privacy" ? "active" : ""} 
                onClick={() => setActiveTab("Privacy")}
              >
                Privacy
              </li>
              <li 
                className={activeTab === "Notification" ? "active" : ""} 
                onClick={() => setActiveTab("Notification")}
              >
                Notification
              </li>
              <li 
                className={activeTab === "Display" ? "active" : ""} 
                onClick={() => setActiveTab("Display")}
              >
                Display
              </li>
            </ul>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="settings-content">
            {activeTab === "Information" && (
              <div className="tab-pane">
                <h2>Barangay Information</h2>

                {/* GOOGLE MAPS EMBED */}
                <div className="map-container">
                  <iframe
                    title="Barangay Location Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1462.8565399113274!2d121.04567541444673!3d14.62745994754203!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b7ba205e3a81%3A0xa655d85a65abd893!2sBarangay%20Pinagkaisahan%20Hall%20(Quezon%20City)!5e0!3m2!1sen!2sus!4v1774216849397!5m2!1sen!2sus"
                    width="100%"
                    height="280"
                    style={{ border: 0, borderRadius: "8px" }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>

                {/* CONTACT DETAILS */}
                <div className="contact-info">
                  <div className="info-row">
                    {/* Placeholder for location icon - using an SVG */}
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>193 Ermin Garcia Street, Cubao, Quezon City, Metro Manila</span>
                  </div>
                  
                  <div className="info-row">
                    {/* Placeholder for phone icon - using an SVG */}
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>0967123456</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* You can add content for other tabs here later */}
            {activeTab !== "Information" && (
              <div className="tab-pane">
                <h2>{activeTab} Settings</h2>
                <p>Configuration options for {activeTab.toLowerCase()} will go here.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </>
  );
}