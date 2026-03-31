import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { format, subDays, startOfMonth } from "date-fns";
import { 
  FaTachometerAlt, FaUsers, FaPlusCircle, FaChartLine, 
  FaHistory, FaExclamationTriangle, FaChevronLeft, FaChevronRight 
} from "react-icons/fa";
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

const CHART_COLORS = ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6", "#06B6D4"];

export default function SKChairmanDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    youth: 0,
    programs: 0,
    transactions: 0,
    overrides: 0,
    beneficiaries: 0
  });

  const [chartData, setChartData] = useState({
    registrationTrend: [],
    genderDistribution: [],
    programDistribution: [],
    monthlyOverrides: []
  });

  const [recentOverrides, setRecentOverrides] = useState([]);
  const [activePrograms, setActivePrograms] = useState([]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const { count: youthCount } = await supabase
        .from("youth")
        .select("*", { count: "exact", head: true });

      const { count: programCount } = await supabase
        .from("programs")
        .select("*", { count: "exact", head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: overrideCount } = await supabase
        .from("overrides")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      const { data: beneficiaries } = await supabase
        .from("transactions")
        .select("youth_id")
        .gte("created_at", startOfMonth(new Date()).toISOString());

      const uniqueBeneficiaries = new Set(beneficiaries?.map(b => b.youth_id) || []);

      setStats({
        youth: youthCount || 0,
        programs: programCount || 0,
        transactions: 35,
        overrides: overrideCount || 0,
        beneficiaries: uniqueBeneficiaries.size
      });

    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      const { data: registrations } = await supabase
        .from("youth")
        .select("created_at")
        .gte("created_at", subDays(new Date(), 180).toISOString());

      const monthlyReg = {};
      registrations?.forEach(reg => {
        const month = format(new Date(reg.created_at), "MMM");
        monthlyReg[month] = (monthlyReg[month] || 0) + 1;
      });

      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const registrationTrend = monthOrder
        .filter(m => monthlyReg[m])
        .map(m => ({ month: m, count: monthlyReg[m] }));

      const { data: genderData } = await supabase
        .from("youth")
        .select("gender");

      const genderDist = { Male: 0, Female: 0, Other: 0 };
      genderData?.forEach(y => {
        if (y.gender === "Male") genderDist.Male++;
        else if (y.gender === "Female") genderDist.Female++;
        else genderDist.Other++;
      });

      const genderDistribution = [
        { name: "Male", value: genderDist.Male },
        { name: "Female", value: genderDist.Female },
        { name: "Other", value: genderDist.Other }
      ].filter(g => g.value > 0);

      const { data: youthPrograms } = await supabase
        .from("youth")
        .select("program_id, programs(program_name)");

      const programDist = {};
      youthPrograms?.forEach(y => {
        if (y.program_id) {
          const progName = y.programs?.program_name || "Unknown";
          programDist[progName] = (programDist[progName] || 0) + 1;
        }
      });

      const programDistribution = Object.entries(programDist)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const { data: overrides } = await supabase
        .from("overrides")
        .select("created_at")
        .gte("created_at", subDays(new Date(), 90).toISOString());

      const monthlyOver = {};
      overrides?.forEach(ov => {
        const month = format(new Date(ov.created_at), "MMM");
        monthlyOver[month] = (monthlyOver[month] || 0) + 1;
      });

      const monthlyOverrides = monthOrder
        .filter(m => monthlyOver[m])
        .map(m => ({ month: m, count: monthlyOver[m] }));

      setChartData({
        registrationTrend,
        genderDistribution,
        programDistribution,
        monthlyOverrides
      });

    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  // Fetch recent overrides
  const fetchRecentOverrides = async () => {
    try {
      const { data } = await supabase
        .from("overrides")
        .select(`
          *,
          youth:youth_id(first_name, last_name),
          programs:program_id(program_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentOverrides(data || []);
    } catch (error) {
      console.error("Error fetching overrides:", error);
    }
  };

  // Fetch active programs
  const fetchActivePrograms = async () => {
    try {
      const { data } = await supabase
        .from("programs")
        .select("*")
        .eq("status", "Active")
        .limit(5);

      setActivePrograms(data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  // Load all data
  useEffect(() => {
    const loadDashboard = async () => {
      await Promise.all([
        fetchStats(),
        fetchChartData(),
        fetchRecentOverrides(),
        fetchActivePrograms()
      ]);
    };
    loadDashboard();
  }, []);

  const handleOverride = () => {
    navigate('/override-youth');
  };

  const menuItems = [
    { name: "Dashboard", icon: FaTachometerAlt, path: "/dashboard" },
    { name: "Manage Youth", icon: FaUsers, path: "/manage-youth" },
    { name: "Create Program", icon: FaPlusCircle, path: "/create-programs" },
    { name: "Generate Reports", icon: FaChartLine, path: "/generate-reports" },
    { name: "Audit Logs", icon: FaHistory, path: "/audit-logs" },
    { name: "Override Youth", icon: FaExclamationTriangle, path: "/override-youth" },
  ];

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
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

          {/* Charts */}
          <div className="charts-section">
            <div className="chart-row">
              <div className="chart-card">
                <h3>Youth Registration Trend</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.registrationTrend}>
                      <XAxis dataKey="month" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <h3>Gender Distribution</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.genderDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.genderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-card">
                <h3>Program Participation</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.programDistribution} layout="vertical">
                      <XAxis type="number" stroke="#888" />
                      <YAxis type="category" dataKey="name" stroke="#888" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F59E0B" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <h3>Monthly Overrides Trend</h3>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData.monthlyOverrides}>
                      <XAxis dataKey="month" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        dot={{ fill: "#EF4444", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
        <div className="quick-actions-section">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button onClick={() => navigate('/manage-youth')} className="action-btn">
              <img src={icon_manageyouth} alt="Manage Youth" className="action-icon" />
              <span>Manage Youth</span>
            </button>
            
            <button onClick={() => navigate('/create-programs')} className="action-btn">
              <img src={icon_createprogram} alt="Create Program" className="action-icon" />
              <span>Create Program</span>
            </button>
            
            <button onClick={() => navigate('/generate-reports')} className="action-btn">
              <img src={icon_report} alt="Generate Reports" className="action-icon" />
              <span>Generate Reports</span>
            </button>
            
            <button onClick={handleOverride} className="action-btn">
              <img src={icon_overrides} alt="Override" className="action-icon" />
              <span>Override</span>
            </button>
            
            <button onClick={() => navigate('/audit-logs')} className="action-btn">
              <img src={icon_audit} alt="Audit Logs" className="action-icon" />
              <span>View Audit Logs</span>
            </button>
          </div>
        </div>

          {/* Recent Data */}
          <div className="bottom-section">
            <div className="info-card">
              <h3>Recent Overrides</h3>
              <div className="info-list">
                {recentOverrides.length > 0 ? (
                  recentOverrides.map((override, index) => (
                    <div key={index} className="info-item">
                      <div className="info-details">
                        <span className="info-name">
                          {override.youth?.first_name} {override.youth?.last_name}
                        </span>
                        <span className="info-program">{override.programs?.program_name}</span>
                      </div>
                      <span className="badge urgent">Override</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No recent overrides</p>
                )}
              </div>
            </div>

            <div className="info-card">
              <h3>Active Programs</h3>
              <div className="info-list">
                {activePrograms.length > 0 ? (
                  activePrograms.map((program, index) => (
                    <div key={index} className="info-item">
                      <div className="info-details">
                        <span className="info-name">{program.program_name}</span>
                        <span className="info-date">
                          Started: {format(new Date(program.start_date), "MMM dd, yyyy")}
                        </span>
                      </div>
                      <span className="badge active">Active</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No active programs</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="dashboard-footer">
            iSKan v1.0 | Barangay Pinagkaisahan | For Authorized Users Only
          </div>
        </div>
      </div>
    </>
  );
}