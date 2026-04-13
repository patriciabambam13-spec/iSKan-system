import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { format } from "date-fns";
import { 
  FaTachometerAlt, FaUsers, FaPlusCircle, FaQrcode, 
  FaList, FaExchangeAlt, FaChartLine, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaCalendarAlt, FaClock,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaFileAlt,
  FaUserCheck, FaCalendarCheck, FaHandHoldingHeart
} from "react-icons/fa";
import "../styles/SKkagawad.css";

import icon_youth from "../assets/totalyouth_ca.png";
import icon_programs from "../assets/activeprograms_ca.png";
import icon_transactions from "../assets/transactions_ca.png";
import icon_overrides from "../assets/overrides_ca.png";
import icon_benefeciaries from "../assets/beneficiaries_ca.png";

export default function SKKagawadDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
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

  // Role protection
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/");
          return;
        }

        const { data: userData, error } = await supabase
          .from("users")
          .select("role_id")
          .eq("user_id", user.id)
          .single();

        if (error || !userData) {
          console.error("Error fetching user role:", error);
          navigate("/");
          return;
        }

        if (userData.role_id !== 2) {
          navigate("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/");
      }
    };

    checkAccess();
  }, [navigate]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const { count: youthCount } = await supabase
        .from("youth")
        .select("*", { count: "exact", head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: upcomingCount } = await supabase
        .from("programs")
        .select("*", { count: "exact", head: true })
        .gte("start_date", today);

      const { count: pendingCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: overdueCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .lt("due_date", today)
        .eq("status", "borrowed");

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

  // Load dashboard data
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

  // Status badge helper
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

  // Menu items for Kagawad
  const menuItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/kagawad-dashboard" },
    { name: "Scan QR", icon: FaQrcode, path: "/scan" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs" },
    { name: "View Programs", icon: FaList, path: "/view-programs" },
    { name: "Transactions", icon: FaExchangeAlt, path: "/transactions" },
    { name: "Generate Report", icon: FaChartLine, path: "/generate-reports" },
  ];

  // Quick actions with icons
  const quickActions = [
    { name: "Scan QR", icon: FaQrcode, path: "/scan", color: "#10B981" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs", color: "#F59E0B" },
    { name: "View Programs", icon: FaList, path: "/view-programs", color: "#8B5CF6" },
    { name: "Transactions", icon: FaExchangeAlt, path: "/transactions", color: "#EF4444" },
    { name: "Generate Report", icon: FaChartLine, path: "/generate-reports", color: "#EC4899" },
  ];

  // Loading guard
  if (!isAuthorized) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Checking access...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="kagawad-dashboard-layout">
        {/* Sidebar */}
        <div className={`sidebar ${!isSidebarOpen ? "collapsed" : ""}`}>
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
        <div className={`main-content ${!isSidebarOpen ? "expanded" : ""}`}>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <img src={icon_youth} alt="Youth Icon" className="stat-icon-placeholder" />
              <h2>{stats.youth}</h2>
              <p>Total Registered Youth</p>
            </div>

            <div className="stat-card">
              <img src={icon_programs} alt="Programs Icon" className="stat-icon-placeholder" />
              <h2>{stats.upcomingPrograms}</h2>
              <p>Upcoming Programs</p>
            </div>

            <div className="stat-card">
              <img src={icon_transactions} alt="Transactions Icon" className="stat-icon-placeholder" />
              <h2>{stats.pendingTransactions}</h2>
              <p>Pending Transactions</p>
            </div>

            <div className="stat-card">
              <img src={icon_overrides} alt="Overdue Icon" className="stat-icon-placeholder" />
              <h2>{stats.overdueEquipment}</h2>
              <p>Overdue Equipment</p>
            </div>

            <div className="stat-card">
              <img src={icon_benefeciaries} alt="Beneficiaries Icon" className="stat-icon-placeholder" />
              <h2>{stats.beneficiaries}</h2>
              <p>Beneficiaries This Month</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <button 
                    key={index} 
                    onClick={() => navigate(action.path)} 
                    className="action-btn"
                    style={{ borderTopColor: action.color }}
                  >
                    <IconComponent className="action-icon-svg" style={{ color: action.color }} />
                    <span>{action.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Section */}
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <div className="bottom-section">
              {/* Ongoing Programs Card */}
              <div className="info-card">
                <h3><FaCalendarCheck className="card-icon" /> Ongoing Programs</h3>
                <div className="info-list">
                  {ongoingPrograms.length > 0 ? (
                    ongoingPrograms.map((program, index) => (
                      <div key={index} className="info-item">
                        <div className="info-details">
                          <span className="info-name">{program.youthName || "Unknown"}</span>
                          <span className="info-program">{program.programName || "-"}</span>
                          <span className="info-time">
                            <FaClock className="inline-icon" /> {program.time}
                          </span>
                        </div>
                        <div className="info-meta">
                          <span className="badge-method">{program.method}</span>
                          {getStatusBadge(program.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No ongoing programs</p>
                  )}
                </div>
              </div>

              {/* Recent QR Scans Card */}
              <div className="info-card">
                <h3><FaQrcode className="card-icon" /> Recent QR Scans</h3>
                <div className="info-list">
                  {recentScans.length > 0 ? (
                    recentScans.map((scan, index) => (
                      <div key={index} className="info-item">
                        <div className="info-details">
                          <span className="info-name">{scan.youthName || "Unknown"}</span>
                          <span className="info-program">{scan.programName || "-"}</span>
                          <span className="info-time">
                            <FaClock className="inline-icon" /> {scan.time}
                          </span>
                        </div>
                        <div className="info-meta">
                          <span className="badge-method">
                            <FaQrcode className="inline-icon" /> {scan.method}
                          </span>
                          {getStatusBadge(scan.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No recent QR scans</p>
                  )}
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