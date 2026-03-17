import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import "../styles/dashboard.css";

export default function SKChairmanDashboard() {

  const [stats, setStats] = useState({
    youth: 0,
    programs: 0,
    transactions: 0,
    overrides: 0,
    beneficiaries: 0
  });

  useEffect(() => {

    const fetchStats = async () => {
      try {

        const { count: youthCount } = await supabase
          .from("youth")
          .select("*", { count: "exact", head: true });

        const { count: programCount } = await supabase
          .from("programs")
          .select("*", { count: "exact", head: true });

        setStats({
          youth: youthCount || 0,
          programs: programCount || 0,
          transactions: 35,
          overrides: 5,
          beneficiaries: 150
        });

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };

    fetchStats();

  }, []);

  return (
    <>
      <Navbar />

      <div className="dashboard-container">

        {/* STAT CARDS */}
        <div className="stats-grid">

          <div className="stat-card">
            <h2>{stats.youth}</h2>
            <p>Total Registered Youth</p>
          </div>

          <div className="stat-card">
            <h2>{stats.programs}</h2>
            <p>Active Programs</p>
          </div>

          <div className="stat-card">
            <h2>{stats.transactions}</h2>
            <p>Transactions Today</p>
          </div>

          <div className="stat-card">
            <h2>{stats.overrides}</h2>
            <p>Overrides Today</p>
          </div>

          <div className="stat-card">
            <h2>{stats.beneficiaries}</h2>
            <p>Beneficiaries This Month</p>
          </div>

        </div>

        {/* QUICK ACTIONS */}

        <h3>Quick Actions</h3>

        <div className="actions-grid">
          <button>Add Youth</button>
          <button>Create Program</button>
          <button>Manage Youth</button>
          <button>Generate Reports</button>
          <button>View Audit Logs</button>
        </div>

        {/* FOOTER */}
        <div className="dashboard-footer">
          iSKan v1.0 | Barangay Pinagkaisahan | For Authorized Users Only
        </div>

      </div>
    </>
  );
}