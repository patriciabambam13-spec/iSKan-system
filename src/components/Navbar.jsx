import { FaBell, FaCog, FaSignOutAlt, FaSearch } from "react-icons/fa";
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

  return (

    <div className="navbar">

      {/* LEFT SIDE */}

      <div className="nav-left">

        <img src={skLogo} className="nav-logo" />

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

        <FaBell className="nav-icon"/>

        <FaCog className="nav-icon"/>

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
  );
}