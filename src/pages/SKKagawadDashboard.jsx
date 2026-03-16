import React from "react";
import "../styles/dashboard.css";

export default function SKKagawadDashboard() {
  return (
    <div className="dashboard">

      {/* HEADER */}

      <header className="dashboard-header">
        <h2>iSKan - SK Kagawad Dashboard</h2>

        <input
          type="text"
          placeholder="Search Youth by Name"
          className="search-bar"
        />

        <div className="profile">
          <span className="name">Mark Noe Mondejar</span>
          <span className="role">SK Kagawad</span>
        </div>
      </header>



      {/* STATS */}

      <div className="stats-container">

        <div className="card">
          <h3>789</h3>
          <p>Total Registered Youth</p>
        </div>

        <div className="card">
          <h3>4</h3>
          <p>Upcoming Programs</p>
        </div>

        <div className="card">
          <h3>5</h3>
          <p>Pending Transactions</p>
        </div>

        <div className="card">
          <h3>10</h3>
          <p>Overdue Equipment</p>
        </div>

        <div className="card">
          <h3>150</h3>
          <p>Beneficiaries this month</p>
        </div>

      </div>



      {/* QUICK ACTIONS */}

      <div className="quick-actions">

        <button>Scan QR</button>
        <button>Create Program</button>
        <button>View Programs</button>
        <button>Transactions</button>
        <button>Generate Report</button>

      </div>



      {/* PROGRAMS */}

      <div className="program-section">

        <div className="program-card">

          <h3>Ongoing Programs</h3>

          <div className="progress">
            <span>Educational Assistance</span>
            <progress value="120" max="200"></progress>
          </div>

          <div className="progress">
            <span>Sports League</span>
            <progress value="85" max="100"></progress>
          </div>

        </div>


        {/* UPCOMING PROGRAMS */}

        <div className="program-card">

          <h3>Upcoming Programs</h3>

          <ul>
            <li>Printing Support — Mar 5</li>
            <li>Career Seminar — Mar 10</li>
            <li>Sports Tournament — Mar 15</li>
          </ul>

        </div>

      </div>



      {/* QR SCANS TABLE */}

      <div className="table-section">

        <h3>Recent QR Scans</h3>

        <table>

          <thead>
            <tr>
              <th>Youth</th>
              <th>Program</th>
              <th>Time</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            <tr>
              <td>Juan Dela Cruz</td>
              <td>Educational Assistance</td>
              <td>10:12 AM</td>
              <td>QR Scan</td>
              <td className="approved">Approved</td>
            </tr>

            <tr>
              <td>Maria Garcia</td>
              <td>Educational Assistance</td>
              <td>10:13 AM</td>
              <td>QR Scan</td>
              <td className="approved">Approved</td>
            </tr>

            <tr>
              <td>Carlos Mendoza</td>
              <td>Sports League</td>
              <td>10:30 AM</td>
              <td>QR Scan</td>
              <td className="duplicate">Duplicate</td>
            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
}