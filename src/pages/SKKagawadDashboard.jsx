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
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);

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

  // Fetch stats - FIXED
  const fetchStats = async () => {
    try {
      // Total Youth
      const { count: youthCount } = await supabase
        .from("youth")
        .select("*", { count: "exact", head: true });

      // Upcoming Programs
      const today = new Date().toISOString().split('T')[0];
      const { count: upcomingCount } = await supabase
        .from("programs")
        .select("*", { count: "exact", head: true })
        .gte("start_date", today)
        .eq("program_status", "upcoming");

      // Pending Transactions - FIXED: use 'transaction' table
      const { count: pendingCount } = await supabase
        .from("transaction")
        .select("*", { count: "exact", head: true })
        .eq("transaction_status", "Pending");

      // Overdue Equipment
      let overdueCount = 0;
      const { data: overdueTransactions } = await supabase
        .from("transaction")
        .select("id")
        .eq("service_type", "borrow")
        .eq("transaction_status", "Approved")
        .lt("return_date", today);
      overdueCount = overdueTransactions?.length || 0;

      // Beneficiaries This Month - FIXED
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: beneficiaries } = await supabase
        .from("transaction")
        .select("youth_id")
        .gte("created_at", startOfMonth.toISOString())
        .eq("transaction_status", "Completed");

      const uniqueBeneficiaries = new Set(beneficiaries?.map(b => b.youth_id).filter(id => id) || []);

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

  // Fetch weekly chart data
  const fetchWeeklyData = async () => {
    try {
      const weeklyCounts = [0, 0, 0, 0, 0, 0, 0];
      
      const { data: transactions } = await supabase
        .from("transaction")
        .select("created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      transactions?.forEach(tx => {
        const day = new Date(tx.created_at).getDay();
        weeklyCounts[day]++;
      });

      setWeeklyData(weeklyCounts);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    }
  };

  // Fetch ongoing programs - FIXED
  const fetchOngoingPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("program_name, start_date, end_date, program_status")
        .eq("program_status", "ongoing")
        .limit(5);

      if (error) throw error;
      setOngoingPrograms(data || []);
    } catch (error) {
      console.error("Error fetching ongoing programs:", error);
    }
  };

  // Fetch recent scans - FIXED
  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from("transaction")
        .select(`
          id,
          transaction_status,
          created_at,
          service_type,
          youth:youth_id(first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = data?.map(scan => ({
        id: scan.id,
        youthName: scan.youth ? `${scan.youth.first_name || ''} ${scan.youth.last_name || ''}`.trim() : "Unknown",
        serviceType: scan.service_type || "attendance",
        status: scan.transaction_status,
        time: format(new Date(scan.created_at), "hh:mm a"),
        date: format(new Date(scan.created_at), "MMM dd")
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
        fetchRecentScans(),
        fetchWeeklyData()
      ]);
      setIsLoading(false);
    };
    
    if (isAuthorized) {
      loadDashboard();
    }
  }, [isAuthorized]);

  // Status badge helper
  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return <span className="status-badge completed"><FaCheckCircle /> Completed</span>;
      case 'approved':
        return <span className="status-badge approved"><FaCheckCircle /> Approved</span>;
      case 'pending':
        return <span className="status-badge pending"><FaHourglassHalf /> Pending</span>;
      case 'rejected':
        return <span className="status-badge rejected"><FaTimesCircle /> Rejected</span>;
      default:
        return <span className="status-badge default">{status || "Pending"}</span>;
    }
  };

  // Menu items for Kagawad
  const menuItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/kagawad-dashboard" },
    { name: "Scan QR", icon: FaQrcode, path: "/scan" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs" },
    { name: "View Programs", icon: FaList, path: "/view-programs" },
    { name: "Transactions", icon: FaExchangeAlt, path: "/transaction" },
    { name: "Generate Report", icon: FaChartLine, path: "/generate-reports" },
  ];

  const quickActions = [
    { name: "Scan QR", icon: FaQrcode, path: "/scan", color: "#10B981" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs", color: "#F59E0B" },
    { name: "View Programs", icon: FaList, path: "/view-programs", color: "#8B5CF6" },
    { name: "Transactions", icon: FaExchangeAlt, path: "/transaction", color: "#EF4444" },
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

  const maxValue = Math.max(...weeklyData, 1);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

          {/* Weekly Chart */}
          <div className="weekly-chart">
            <h3>Weekly Transactions</h3>
            <div className="chart-bars">
              {weeklyData.map((value, index) => (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar" 
                    style={{ 
                      height: `${(value / maxValue) * 100}%`,
                      backgroundColor: "#f2b705"
                    }}
                  ></div>
                  <span className="chart-value">{value}</span>
                  <span className="chart-label">{days[index]}</span>
                </div>
              ))}
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
                          <span className="info-name">{program.program_name}</span>
                          <span className="info-time">
                            <FaCalendarAlt className="inline-icon" /> 
                            {program.start_date}
                          </span>
                        </div>
                        <div className="info-meta">
                          {getStatusBadge(program.program_status)}
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
                <h3><FaQrcode className="card-icon" /> Recent Transactions</h3>
                <div className="info-list">
                  {recentScans.length > 0 ? (
                    recentScans.map((scan, index) => (
                      <div key={index} className="info-item">
                        <div className="info-details">
                          <span className="info-name">{scan.youthName}</span>
                          <span className="info-type">{scan.serviceType}</span>
                          <span className="info-time">
                            <FaClock className="inline-icon" /> {scan.time}
                          </span>
                        </div>
                        <div className="info-meta">
                          {getStatusBadge(scan.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No recent transactions</p>
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