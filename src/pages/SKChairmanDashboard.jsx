import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { Link, useNavigate } from 'react-router-dom';
import icon_youth from "../assets/totalyouth_ca.png";
import icon_programs from "../assets/activeprograms_ca.png";
import icon_transactions from "../assets/transactions_ca.png";
import icon_overrides from "../assets/overrides_ca.png";
import icon_benefeciaries from "../assets/beneficiaries_ca.png";
import icon_createprogram from "../assets/create_qa.png";
import icon_manageyouth from "../assets/manageyouth_qa.png";
import icon_report from "../assets/report_qa.png";
import icon_audit from "../assets/audit_qa.png";
import "../styles/dashboard.css";

export default function SKChairmanDashboard() {

  const navigate = useNavigate(); 

  const handleClick = (routePath) => {
    navigate(routePath);
  };

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

        // Fetch overrides count (adjust based on your actual override data structure)
        const { count: overrideCount } = await supabase
          .from("overrides") // Assuming you have an overrides table
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date().toISOString().split('T')[0]); // Today's overrides

        setStats({
          youth: youthCount || 0,
          programs: programCount || 0,
          transactions: 35,
          overrides: overrideCount || 5,
          beneficiaries: 190
        });

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };

    fetchStats();

  }, []);

  // Handle Override functionality
  const handleOverride = () => {
    // Navigate to override page or open override modal
    navigate('/override-youth');
    // OR if you want to open a modal, you can add state for that
  };

  return (
    <>
      <Navbar />

      <div className="dashboard-container">

        {/* STAT CARDS */}
        <div className="stats-grid">

          <div className="stat-card">
            <img src={icon_youth} alt="Youth Icon" className="stat-icon-placeholder" />
            <h2>{stats.youth}</h2>
            <p>Total Registered Youth</p>
          </div>

          <div className="stat-card">
            <img src={icon_programs} alt="Programs Icon" className="stat-icon-placeholder" />
            <h2>{stats.programs}</h2>
            <p>Active Programs</p>
          </div>

          <div className="stat-card">
            <img src={icon_transactions} alt="Transactions Icon" className="stat-icon-placeholder" />
            <h2>{stats.transactions}</h2>
            <p>Transactions Today</p>
          </div>

          <div className="stat-card">
            <img src={icon_overrides} alt="Overrides Icon" className="stat-icon-placeholder" />
            <h2>{stats.overrides}</h2>
            <p>Overrides Today</p>
          </div>

          <div className="stat-card">
            <img src={icon_benefeciaries} alt="Beneficiaries Icon" className="stat-icon-placeholder" />
            <h2>{stats.beneficiaries}</h2>
            <p>Beneficiaries This Month</p>
          </div>

        </div>

        {/* QUICK ACTIONS */}
        <h3>Quick Actions</h3>

        <div className="actions-grid">
          {/* Changed from Register Youth to Override */}
          <button onClick={handleOverride}>
            <img src={icon_overrides} alt="Override Icon" className="action-icon-placeholder" />
            Override
          </button>
          
          <button onClick={() => handleClick('/create-program')}>
            <img src={icon_createprogram} alt="Create Program Icon" className="action-icon-placeholder" />
            Create Program
          </button>
          
          <button onClick={() => handleClick('/manage-youth')}>
            <img src={icon_manageyouth} alt="Manage Youth Icon" className="action-icon-placeholder" />
            Manage Youth
          </button>  
          
          <button onClick={() => handleClick('/generate-reports')}>
            <img src={icon_report} alt="Generate Reports Icon" className="action-icon-placeholder" />
            Generate Reports
          </button>
          
          <button onClick={() => handleClick('/audit-logs')}>
            <img src={icon_audit} alt="Audit Logs Icon" className="action-icon-placeholder" />
            View Audit Logs
          </button>
        </div>

        {/* FOOTER */}
        <div className="dashboard-footer">
          iSKan v1.0 | Barangay Pinagkaisahan | For Authorized Users Only
        </div>

      </div>
    </>
  );
}