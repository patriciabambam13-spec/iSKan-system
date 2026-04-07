import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { logActivity } from "../utils/logActivity";
import "../styles/settings.css";
import toast, { Toaster } from "react-hot-toast";

// Constants
const STORAGE_KEYS = {
  BARANGAY_INFO: "barangayInfo",
  PRIVACY_SETTINGS: "privacySettings",
  NOTIFICATION_SETTINGS: "notificationSettings",
  DISPLAY_SETTINGS: "displaySettings"
};

const DEFAULT_SETTINGS = {
  privacy: {
    dataRetention: "12 months",
    shareAnalytics: false,
    allowPublicProfile: true,
    twoFactorAuth: false
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    programUpdates: true,
    paymentReminders: true,
    eventReminders: true
  },
  display: {
    theme: "light",
    fontSize: "medium",
    compactView: false,
    animations: true
  }
};

const DEFAULT_BARANGAY_INFO = {
  name: "Barangay Pinagkaisahan",
  address: "193 Ermin Garcia Street, Cubao, Quezon City, Metro Manila",
  contact: "0967123456",
  email: "sk.pinagkaisahan@gmail.com",
  captain: "Hon. Juan Dela Cruz",
  skChairperson: "Hon. Maria Santos"
};

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Information");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // State for all settings
  const [barangayInfo, setBarangayInfo] = useState(DEFAULT_BARANGAY_INFO);
  const [editFormData, setEditFormData] = useState(DEFAULT_BARANGAY_INFO);
  const [privacySettings, setPrivacySettings] = useState(DEFAULT_SETTINGS.privacy);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_SETTINGS.notifications);
  const [displaySettings, setDisplaySettings] = useState(DEFAULT_SETTINGS.display);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedBarangay = localStorage.getItem(STORAGE_KEYS.BARANGAY_INFO);
        if (savedBarangay) {
          setBarangayInfo(JSON.parse(savedBarangay));
          setEditFormData(JSON.parse(savedBarangay));
        }

        const savedPrivacy = localStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
        if (savedPrivacy) {
          setPrivacySettings(JSON.parse(savedPrivacy));
        }

        const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
        if (savedNotifications) {
          setNotificationSettings(JSON.parse(savedNotifications));
        }

        const savedDisplay = localStorage.getItem(STORAGE_KEYS.DISPLAY_SETTINGS);
        if (savedDisplay) {
          const parsedDisplay = JSON.parse(savedDisplay);
          setDisplaySettings(parsedDisplay);
          applyTheme(parsedDisplay.theme);
          applyFontSize(parsedDisplay.fontSize);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      }
    };
    
    loadSettings();
    
    logActivity({
      action: "VIEW",
      table: "settings",
      recordId: null,
      details: "User viewed settings page"
    });
  }, []);

  // Apply theme to document
  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  };

  // Apply font size to document
  const applyFontSize = (fontSize) => {
    const root = document.documentElement;
    const sizes = {
      small: "14px",
      medium: "16px",
      large: "18px"
    };
    root.style.fontSize = sizes[fontSize] || sizes.medium;
  };

  // Navigation handlers
  const handleGoBack = () => {
    logActivity({
      action: "NAVIGATE",
      table: "settings",
      recordId: null,
      details: "User navigated back from settings"
    });
    navigate(-1);
  };

  // Barangay Information handlers
  const handleEditToggle = () => {
    if (isEditing) {
      setEditFormData(barangayInfo);
    }
    setIsEditing(!isEditing);
    
    logActivity({
      action: isEditing ? "CANCEL_EDIT" : "START_EDIT",
      table: "barangay_info",
      recordId: null,
      details: isEditing ? "Cancelled editing barangay information" : "Started editing barangay information"
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBarangayInfo = async () => {
    setIsLoading(true);
    
    try {
      localStorage.setItem(STORAGE_KEYS.BARANGAY_INFO, JSON.stringify(editFormData));
      setBarangayInfo(editFormData);
      setIsEditing(false);
      
      await logActivity({
        action: "UPDATE",
        table: "barangay_info",
        recordId: null,
        details: `Updated barangay information: ${editFormData.name}`
      });
      
      toast.success("Barangay information updated successfully");
    } catch (error) {
      console.error("Failed to save barangay info:", error);
      toast.error("Failed to save information");
    } finally {
      setIsLoading(false);
    }
  };

  // Generic setting update handler
  const updateSetting = async (type, key, value, storageKey) => {
    const updateFunctions = {
      privacy: setPrivacySettings,
      notifications: setNotificationSettings,
      display: setDisplaySettings
    };
    
    const setState = updateFunctions[type];
    if (!setState) return;
    
    setState(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(storageKey, JSON.stringify({ ...getCurrentSettings(type), [key]: value }));
    
    await logActivity({
      action: "UPDATE",
      table: `${type}_settings`,
      recordId: null,
      details: `Updated ${type} setting: ${key} to ${value}`
    });
    
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} updated`);
  };

  const getCurrentSettings = (type) => {
    const settings = {
      privacy: privacySettings,
      notifications: notificationSettings,
      display: displaySettings
    };
    return settings[type];
  };

  // Specific setting handlers
  const handlePrivacyChange = (key, value) => {
    updateSetting("privacy", key, value, STORAGE_KEYS.PRIVACY_SETTINGS);
  };

  const handleNotificationChange = (key, value) => {
    updateSetting("notifications", key, value, STORAGE_KEYS.NOTIFICATION_SETTINGS);
  };

  const handleDisplayChange = (key, value) => {
    updateSetting("display", key, value, STORAGE_KEYS.DISPLAY_SETTINGS);
    
    if (key === "theme") {
      applyTheme(value);
    }
    if (key === "fontSize") {
      applyFontSize(value);
    }
  };

  // Reset all settings
  const handleResetAll = async () => {
    const confirmed = window.confirm("Are you sure you want to reset all settings to default values?");
    if (!confirmed) return;
    
    try {
      setPrivacySettings(DEFAULT_SETTINGS.privacy);
      setNotificationSettings(DEFAULT_SETTINGS.notifications);
      setDisplaySettings(DEFAULT_SETTINGS.display);
      setBarangayInfo(DEFAULT_BARANGAY_INFO);
      setEditFormData(DEFAULT_BARANGAY_INFO);
      
      localStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS.privacy));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(DEFAULT_SETTINGS.notifications));
      localStorage.setItem(STORAGE_KEYS.DISPLAY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS.display));
      localStorage.setItem(STORAGE_KEYS.BARANGAY_INFO, JSON.stringify(DEFAULT_BARANGAY_INFO));
      
      applyTheme(DEFAULT_SETTINGS.display.theme);
      applyFontSize(DEFAULT_SETTINGS.display.fontSize);
      
      await logActivity({
        action: "RESET",
        table: "settings",
        recordId: null,
        details: "Reset all settings to default values"
      });
      
      toast.success("All settings have been reset to default");
    } catch (error) {
      console.error("Failed to reset settings:", error);
      toast.error("Failed to reset settings");
    }
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    logActivity({
      action: "TAB_CHANGE",
      table: "settings",
      recordId: null,
      details: `Switched to ${tab} tab`
    });
  };

  // Render components
  const renderInformationTab = () => (
    <div className="tab-pane">
      <div className="tab-header">
        <h2>Barangay Information</h2>
        <div className="tab-actions">
          {!isEditing ? (
            <button className="edit-btn" onClick={handleEditToggle}>
              Edit Information
            </button>
          ) : (
            <div className="edit-actions">
              <button className="cancel-btn" onClick={handleEditToggle}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveBarangayInfo} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="map-container">
        <iframe
          title="Barangay Location Map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1462.8565399113274!2d121.04567541444673!3d14.62745994754203!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b7ba205e3a81%3A0xa655d85a65abd893!2sBarangay%20Pinagkaisahan%20Hall%20(Quezon%20City)!5e0!3m2!1sen!2sus!4v1774216849397!5m2!1sen!2sus"
          width="100%"
          height="280"
          style={{ border: 0, borderRadius: "8px" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="contact-info">
        {isEditing ? (
          <div className="edit-form">
            <div className="form-group">
              <label>Barangay Name</label>
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={editFormData.address}
                onChange={handleInputChange}
                className="form-textarea"
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input
                type="text"
                name="contact"
                value={editFormData.contact}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={editFormData.email}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Barangay Captain</label>
              <input
                type="text"
                name="captain"
                value={editFormData.captain}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>SK Chairperson</label>
              <input
                type="text"
                name="skChairperson"
                value={editFormData.skChairperson}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="info-row">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{barangayInfo.address}</span>
            </div>
            
            <div className="info-row">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{barangayInfo.contact}</span>
            </div>
            
            <div className="info-row">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{barangayInfo.email}</span>
            </div>
            
            <div className="info-row">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Captain: {barangayInfo.captain}</span>
            </div>
            
            <div className="info-row">
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span>SK Chairperson: {barangayInfo.skChairperson}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="tab-pane">
      <div className="tab-header">
        <h2>Privacy Settings</h2>
      </div>
      
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <label>Data Retention Period</label>
            <p>How long we keep your activity data</p>
          </div>
          <select 
            value={privacySettings.dataRetention}
            onChange={(event) => handlePrivacyChange("dataRetention", event.target.value)}
            className="setting-select"
          >
            <option value="6 months">6 months</option>
            <option value="12 months">12 months</option>
            <option value="24 months">24 months</option>
            <option value="indefinite">Indefinite</option>
          </select>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Share Analytics</label>
            <p>Help improve the system by sharing anonymous usage data</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={privacySettings.shareAnalytics}
              onChange={(event) => handlePrivacyChange("shareAnalytics", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Allow Public Profile</label>
            <p>Allow other users to view your basic profile information</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={privacySettings.allowPublicProfile}
              onChange={(event) => handlePrivacyChange("allowPublicProfile", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Two-Factor Authentication</label>
            <p>Add an extra layer of security to your account</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={privacySettings.twoFactorAuth}
              onChange={(event) => handlePrivacyChange("twoFactorAuth", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  );

  const renderNotificationTab = () => (
    <div className="tab-pane">
      <div className="tab-header">
        <h2>Notification Preferences</h2>
      </div>
      
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <label>Email Notifications</label>
            <p>Receive notifications via email</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.emailNotifications}
              onChange={(event) => handleNotificationChange("emailNotifications", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>SMS Notifications</label>
            <p>Receive text message alerts</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.smsNotifications}
              onChange={(event) => handleNotificationChange("smsNotifications", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Program Updates</label>
            <p>Get notified about new programs and events</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.programUpdates}
              onChange={(event) => handleNotificationChange("programUpdates", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Payment Reminders</label>
            <p>Receive reminders for upcoming payments</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.paymentReminders}
              onChange={(event) => handleNotificationChange("paymentReminders", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Event Reminders</label>
            <p>Get reminded about upcoming events</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.eventReminders}
              onChange={(event) => handleNotificationChange("eventReminders", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  );

  const renderDisplayTab = () => (
    <div className="tab-pane">
      <div className="tab-header">
        <h2>Display Settings</h2>
      </div>
      
      <div className="settings-list">
        <div className="setting-item">
          <div className="setting-info">
            <label>Theme</label>
            <p>Choose light or dark mode</p>
          </div>
          <select 
            value={displaySettings.theme}
            onChange={(event) => handleDisplayChange("theme", event.target.value)}
            className="setting-select"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Font Size</label>
            <p>Adjust text size for better readability</p>
          </div>
          <select 
            value={displaySettings.fontSize}
            onChange={(event) => handleDisplayChange("fontSize", event.target.value)}
            className="setting-select"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Compact View</label>
            <p>Show more content by reducing spacing</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={displaySettings.compactView}
              onChange={(event) => handleDisplayChange("compactView", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Animations</label>
            <p>Enable smooth transitions and animations</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={displaySettings.animations}
              onChange={(event) => handleDisplayChange("animations", event.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <Toaster position="top-center" />
      
      <div className="settings-page">
        <div className="settings-header">
          <button className="back-button" onClick={handleGoBack} aria-label="Go back">
            ←
          </button>
          <div className="header-titles">
            <h1>Settings</h1>
            <p>Manage your account settings and preferences</p>
          </div>
        </div>

        <div className="settings-container">
          <div className="settings-sidebar">
            <ul>
              <li 
                className={activeTab === "Information" ? "active" : ""} 
                onClick={() => handleTabChange("Information")}
              >
                Information
              </li>
              <li 
                className={activeTab === "Privacy" ? "active" : ""} 
                onClick={() => handleTabChange("Privacy")}
              >
                Privacy
              </li>
              <li 
                className={activeTab === "Notification" ? "active" : ""} 
                onClick={() => handleTabChange("Notification")}
              >
                Notification
              </li>
              <li 
                className={activeTab === "Display" ? "active" : ""} 
                onClick={() => handleTabChange("Display")}
              >
                Display
              </li>
            </ul>
          </div>

          <div className="settings-content">
            {activeTab === "Information" && renderInformationTab()}
            {activeTab === "Privacy" && renderPrivacyTab()}
            {activeTab === "Notification" && renderNotificationTab()}
            {activeTab === "Display" && renderDisplayTab()}
            
            <div className="reset-section">
              <button className="reset-btn" onClick={handleResetAll}>
                Reset All Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}