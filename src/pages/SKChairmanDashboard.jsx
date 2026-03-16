import React from "react";
import "../styles/dashboard.css";

export default function SKChairmanDashboard() {
  return (
    <div className="dashboard">

      {/* HEADER */}
      <header className="dashboard-header">
        <h2>iSKan - SK Chairman Dashboard</h2>

        <input
          type="text"
          placeholder="Search Youth by Name"
          className="search-bar"
        />

        <div className="profile">
          <span className="name">Patricia Joy Martin</span>
          <span className="role">SK Chairman</span>
        </div>
      </header>


      {/* STATS */}
      <div className="stats-container">

        <div className="card">
          <h3>789</h3>
          <p>Total Registered Youth</p>
        </div>

        <div className="card">
          <h3>10</h3>
          <p>Active Programs</p>
        </div>

        <div className="card">
          <h3>35</h3>
          <p>Transactions Today</p>
        </div>

        <div className="card">
          <h3>5</h3>
          <p>Overrides Today</p>
        </div>

        <div className="card">
          <h3>150</h3>
          <p>Beneficiaries this month</p>
        </div>

      </div>


      {/* QUICK ACTIONS */}

      <div className="quick-actions">

        <button>Add Youth</button>
        <button>Create Program</button>
        <button>Manage Youth</button>
        <button>Generate Reports</button>
        <button>View Audit Logs</button>

      </div>


      {/* PROGRAM STATUS */}

      <div className="program-section">

        <div className="program-card">

          <h3>Program Status Overview</h3>

          <div className="progress">
            <span>Educational Assistance</span>
            <progress value="120" max="200"></progress>
          </div>

          <div className="progress">
            <span>Sports League</span>
            <progress value="85" max="100"></progress>
          </div>

          <div className="progress">
            <span>Printing Support</span>
            <progress value="45" max="60"></progress>
          </div>

          <div className="progress">
            <span>Health & Wellness</span>
            <progress value="30" max="80"></progress>
          </div>

          <div className="progress">
            <span>Skills Training</span>
            <progress value="55" max="75"></progress>
          </div>

        </div>


        {/* OVERRIDE MONITORING */}

        <div className="program-card">

          <h3>Override Monitoring</h3>

          <p className="warning">
            ⚠ 5 overrides detected today. Programs with high override counts may require review.
          </p>

          <ul>
            <li>Educational Assistance — 4 overrides</li>
            <li>Seminar — 1 override</li>
          </ul>

        </div>

      </div>


      {/* CHARTS */}

      <div className="chart-section">

        <div className="chart-card">
          <h3>Monthly Participation</h3>
          <div className="chart-placeholder">Chart Here</div>
        </div>

        <div className="chart-card">
          <h3>Gender Distribution</h3>
          <div className="chart-placeholder">Pie Chart Here</div>
        </div>

      </div>

    </div>
  );
}