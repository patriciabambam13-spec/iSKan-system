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
import "../styles/SKKagawad.css";

// Use the SAME images that Chairman dashboard uses (these should exist)
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

  // ========== ROLE PROTECTION ==========
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: userData, error } = await supabase
          .from("users")
          .select("role_id")
          .eq("user_id", user.id)
          .single();

        if (error || !userData) {
          console.error("Error fetching user role:", error);
          navigate("/login");
          return;
        }

        // Check if role is Chairman (role_id = 1)
        if (userData.role_id !== 1) {
          navigate("/unauthorized");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAccess();
  }, [navigate]);

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
    if (isAuthorized) {
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
    }
  }, [isAuthorized]);

  // ========== HELPER FUNCTIONS ==========
  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved':
        return <span className="badge approved"><FaCheckCircle /> Approved</span>;
      case 'pending':
        return <span className="badge pending"><FaHourglassHalf /> Pending</span>;
      case 'ineligible':
        return <span className="badge ineligible"><FaTimesCircle /> Ineligible</span>;
      default:
        return <span className="badge default">{status}</span>;
    }
  };

  // ========== MENU ITEMS (Kagawad specific) ==========
  const menuItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/kagawad-dashboard" },
    { name: "Scan QR", icon: FaQrcode, path: "/scan" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs" },
    { name: "View Programs", icon: FaList, path: "/view-programs" },
    { name: "Transactions", icon: FaExchangeAlt, path: "/transactions" },
    { name: "Generate Report", icon: FaChartLine, path: "/generate-reports" },
  ];

  // Show loading while checking authorization
  if (!isAuthorized) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying access...</p>
      </div>
    );
  }

  // ========== RENDER WITH CHAIRMAN'S LAYOUT ==========
  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        {/* Sidebar - using same class as chairman */}
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

        {/* Main Content - using same class as chairman */}
        <div className={`main-content ${!isSidebarOpen ? "expanded" : ""}`}>
          {/* Stats Cards - matching chairman layout */}
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

          {/* Quick Actions Section - matching chairman layout but with Kagawad actions */}
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

          {/* Bottom Section - Two tables side by side like chairman */}
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <div className="bottom-section">
              {/* Ongoing Programs Table */}
              <div className="info-card">
                <h3>Ongoing Programs</h3>
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
                    <p className="no-data">No ongoing programs</p>
                  )}
                </div>
              </div>

              {/* Recent QR Scans Table */}
              <div className="info-card">
                <h3>Recent QR Scans</h3>
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
                    <p className="no-data">No recent QR scans</p>
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