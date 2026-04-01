import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { format } from "date-fns";
import { 
  FaTachometerAlt, FaUsers, FaPlusCircle, FaQrcode, 
  FaList, FaExchangeAlt, FaChartLine, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaCalendarAlt, FaClock,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf
} from "react-icons/fa";
import "../styles/dashboard.css";

export default function SKKagawadDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    youth: 0,
    upcomingPrograms: 0,
    pendingTransactions: 0,
    overdueEquipment: 0,
    beneficiaries: 0
  });

  const [ongoingPrograms, setOngoingPrograms] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ========== FETCH FUNCTIONS ==========
  
  const fetchStats = async () => {
    try {
      // Total youth
      const { count: youthCount } = await supabase
        .from("youth")
        .select("*", { count: "exact", head: true });

      // Upcoming programs (start_date >= today)
      const today = new Date().toISOString().split('T')[0];
      const { count: upcomingCount } = await supabase
        .from("programs")
        .select("*", { count: "exact", head: true })
        .gte("start_date", today);

      // Pending transactions
      const { count: pendingCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Overdue equipment
      const { count: overdueCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .lt("due_date", today)
        .eq("status", "borrowed");

      // Beneficiaries this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: beneficiaries } = await supabase
        .from("transactions")
        .select("youth_id")
        .gte("created_at", startOfMonth.toISOString());

      const uniqueBeneficiaries = new Set(beneficiaries?.map(b => b.youth_id) || []);

      setStats({
        youth: youthCount || 0,
        upcomingPrograms: upcomingCount || 0,
        pendingTransactions: pendingCount || 0,
        overdueEquipment: overdueCount || 0,
        beneficiaries: uniqueBeneficiaries.size
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOngoingPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select(`
          program_name,
          transactions!inner(
            id,
            status,
            created_at,
            method,
            youth:youth_id(first_name, last_name)
          )
        `)
        .eq("status", "ongoing")
        .limit(10);

      if (error) throw error;

      // Transform data for display
      const formatted = [];
      data?.forEach(program => {
        program.transactions?.forEach(tx => {
          formatted.push({
            id: tx.id,
            youthName: `${tx.youth?.first_name || ''} ${tx.youth?.last_name || ''}`.trim(),
            programName: program.program_name,
            time: format(new Date(tx.created_at), "hh:mm a"),
            method: tx.method || "Manual",
            status: tx.status
          });
        });
      });

      setOngoingPrograms(formatted);
    } catch (error) {
      console.error("Error fetching ongoing programs:", error);
    }
  };

  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          status,
          created_at,
          method,
          youth:youth_id(first_name, last_name),
          program:program_id(program_name)
        `)
        .eq("method", "QR Scan")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = data?.map(scan => ({
        id: scan.id,
        youthName: `${scan.youth?.first_name || ''} ${scan.youth?.last_name || ''}`.trim(),
        programName: scan.program?.program_name,
        time: format(new Date(scan.created_at), "hh:mm a"),
        method: scan.method,
        status: scan.status
      })) || [];

      setRecentScans(formatted);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
    }
  };

  // ========== LOAD DATA ==========
  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchStats(),
        fetchOngoingPrograms(),
        fetchRecentScans()
      ]);
      setIsLoading(false);
    };
    
    loadDashboard();
  }, []);

  // ========== HELPER FUNCTIONS ==========
  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved':
        return <span className="status-badge approved"><FaCheckCircle /> Approved</span>;
      case 'pending':
        return <span className="status-badge pending"><FaHourglassHalf /> Pending</span>;
      case 'ineligible':
        return <span className="status-badge ineligible"><FaTimesCircle /> Ineligible</span>;
      default:
        return <span className="status-badge default">{status}</span>;
    }
  };

  // ========== MENU ITEMS ==========
  const menuItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/kagawad-dashboard" },
    { name: "Scan QR", icon: FaQrcode, path: "/scan" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs" },
    { name: "View Programs", icon: FaList, path: "/view-programs" },
    { name: "Transactions", icon: FaExchangeAlt, path: "/transactions" },
    { name: "Generate Report", icon: FaChartLine, path: "/generate-reports" },
  ];

  // ========== RENDER ==========
  return (
    <>
      <Navbar />
      <div className="kagawad-dashboard-layout">
        {/* Sidebar */}
        <div className={`kagawad-sidebar ${!isSidebarOpen ? "collapsed" : ""}`}>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
          <div className="sidebar-menu">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={index}
                  className="sidebar-item"
                  onClick={() => navigate(item.path)}
                >
                  <IconComponent className="sidebar-icon" />
                  {isSidebarOpen && <span className="sidebar-name">{item.name}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className={`kagawad-main-content ${!isSidebarOpen ? "expanded" : ""}`}>
          {/* Header */}
          <div className="page-header">
            <div className="header-text">
              <h2>SK Kagawad Dashboard</h2>
              <p>Manage youth programs, track transactions, and monitor QR scans</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <FaUsers />
              </div>
              <div className="stat-info">
                <h3>{stats.youth}</h3>
                <p>Total Registered Youth</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <FaCalendarAlt />
              </div>
              <div className="stat-info">
                <h3>{stats.upcomingPrograms}</h3>
                <p>Upcoming Programs</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">
                <FaExchangeAlt />
              </div>
              <div className="stat-info">
                <h3>{stats.pendingTransactions}</h3>
                <p>Pending Transactions</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">
                <FaExclamationTriangle />
              </div>
              <div className="stat-info">
                <h3>{stats.overdueEquipment}</h3>
                <p>Overdue Equipment</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <FaUsers />
              </div>
              <div className="stat-info">
                <h3>{stats.beneficiaries}</h3>
                <p>Beneficiaries This Month</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <button onClick={() => navigate('/scan')} className="action-btn">
                <FaQrcode className="action-icon-svg" />
                <span>Scan QR</span>
              </button>
              
              <button onClick={() => navigate('/create-programs')} className="action-btn">
                <FaPlusCircle className="action-icon-svg" />
                <span>Create Program</span>
              </button>
              
              <button onClick={() => navigate('/view-programs')} className="action-btn">
                <FaList className="action-icon-svg" />
                <span>View Programs</span>
              </button>
              
              <button onClick={() => navigate('/transactions')} className="action-btn">
                <FaExchangeAlt className="action-icon-svg" />
                <span>Transactions</span>
              </button>
              
              <button onClick={() => navigate('/generate-reports')} className="action-btn">
                <FaChartLine className="action-icon-svg" />
                <span>Generate Report</span>
              </button>
            </div>
          </div>

          {/* Tables Section */}
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <div className="tables-section">
              {/* Ongoing Programs Table */}
              <div className="info-card">
                <h3>Ongoing Programs</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Youth Name</th>
                        <th>Program</th>
                        <th>Time</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ongoingPrograms.length > 0 ? (
                        ongoingPrograms.map((program, index) => (
                          <tr key={index}>
                            <td>{program.youthName || "Unknown"}</td>
                            <td>{program.programName || "-"}</td>
                            <td><FaClock className="inline-icon" /> {program.time}</td>
                            <td>{program.method}</td>
                            <td>{getStatusBadge(program.status)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            No ongoing programs
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent QR Scans Table */}
              <div className="info-card">
                <h3>Recent QR Scans</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Youth Name</th>
                        <th>Program</th>
                        <th>Time</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans.length > 0 ? (
                        recentScans.map((scan, index) => (
                          <tr key={index}>
                            <td>{scan.youthName || "Unknown"}</td>
                            <td>{scan.programName || "-"}</td>
                            <td><FaClock className="inline-icon" /> {scan.time}</td>
                            <td><FaQrcode className="inline-icon" /> {scan.method}</td>
                            <td>{getStatusBadge(scan.status)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty-state">
                            No recent QR scans
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="dashboard-footer">
            iSKan v1.0 | Barangay Pinagkaisahan | For Authorized Users Only
          </div>
        </div>
      </div>
    </>
  );
}