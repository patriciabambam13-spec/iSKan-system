import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format } from "date-fns";
import { FaFileCsv, FaCalendarAlt, FaChartBar, FaChartPie } from "react-icons/fa";
import "../styles/generateReports.css";

const COLORS = ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6"];

export default function GenerateReports() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [program, setProgram] = useState("");
  const [reportType, setReportType] = useState("summary");
  const [isLoading, setIsLoading] = useState(false);

  const [youths, setYouths] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [filteredYouths, setFilteredYouths] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    programs: 0,
    participation: 0,
    male: 0,
    female: 0,
    other: 0
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [programData, setProgramData] = useState([]);

  // Fetch programs
  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*");

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  // Fetch youth data
  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from("youth").select("*");

      if (fromDate && toDate) {
        query = query.gte("created_at", fromDate).lte("created_at", toDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const youthData = data || [];
      setYouths(youthData);
      
      // Filter by program if selected
      let filtered = youthData;
      if (program) {
        // You might need to adjust this based on your actual data structure
        // This assumes you have a program_id field in youth table
        filtered = youthData.filter(y => y.program_id === program);
      }
      setFilteredYouths(filtered);

      // Calculate Stats
      const total = filtered.length;
      const active = filtered.filter(y => y.status === "active" || !y.status).length;
      const male = filtered.filter(y => y.gender === "Male").length;
      const female = filtered.filter(y => y.gender === "Female").length;
      const other = filtered.filter(y => y.gender === "Other" || (y.gender !== "Male" && y.gender !== "Female")).length;

      setStats({
        total,
        active,
        programs: programs.length,
        participation: total ? Math.round((active / total) * 100) : 0,
        male,
        female,
        other
      });

      // Monthly Participation
      const months = {};
      filtered.forEach(y => {
        const month = format(new Date(y.created_at || y.birthdate || Date.now()), "MMM");
        months[month] = (months[month] || 0) + 1;
      });

      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyArray = monthOrder
        .filter(m => months[m])
        .map(m => ({
          name: m,
          value: months[m]
        }));

      setMonthlyData(monthlyArray);

      // Gender Distribution
      const genderArray = [
        { name: "Male", value: male },
        { name: "Female", value: female },
        { name: "Other", value: other }
      ].filter(g => g.value > 0);

      setGenderData(genderArray);

      // Program Participation (if you have program data)
      const programStats = {};
      filtered.forEach(y => {
        if (y.program_id) {
          programStats[y.program_id] = (programStats[y.program_id] || 0) + 1;
        }
      });

      const programArray = Object.keys(programStats).map(pid => ({
        name: programs.find(p => p.id === pid)?.name || "Unknown",
        value: programStats[pid]
      }));

      setProgramData(programArray);

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate, program]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Name", "Gender", "Age", "Contact", "Email", "Status", "Registration Date"];
    const rows = filteredYouths.map(y => [
      `${y.first_name || ''} ${y.last_name || ''}`.trim(),
      y.gender || "",
      y.age || "",
      y.contact || "",
      y.email || "",
      y.status || "Active",
      y.created_at ? format(new Date(y.created_at), "yyyy-MM-dd") : ""
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell || ''}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `youth_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear filters
  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setProgram("");
    setReportType("summary");
  };

  return (
    <>
      <Navbar />
      <div className="reports-page">
        <div className="reports-header">
          <h2>Generate Reports</h2>
          <p>View and export youth participation analytics</p>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>From Date</label>
              <div className="date-input-wrapper">
                <FaCalendarAlt className="date-icon" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <div className="date-input-wrapper">
                <FaCalendarAlt className="date-icon" />
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Program</label>
              <select 
                onChange={e => setProgram(e.target.value)} 
                value={program}
                className="filter-select"
              >
                <option value="">All Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Report Type</label>
              <select 
                onChange={e => setReportType(e.target.value)}
                value={reportType}
                className="filter-select"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={clearFilters} className="clear-btn">
              Clear Filters
            </button>
            <button onClick={exportCSV} className="export-btn">
              <FaFileCsv /> Export CSV
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">👥</div>
                <div className="stat-info">
                  <h3>{stats.total}</h3>
                  <p>Total Youth</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">✅</div>
                <div className="stat-info">
                  <h3>{stats.active}</h3>
                  <p>Active Youth</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">📊</div>
                <div className="stat-info">
                  <h3>{stats.programs}</h3>
                  <p>Total Programs</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">📈</div>
                <div className="stat-info">
                  <h3>{stats.participation}%</h3>
                  <p>Participation Rate</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-card">
                <div className="chart-header">
                  <FaChartBar className="chart-icon" />
                  <h4>Monthly Participation</h4>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e0e0e0" }}
                    />
                    <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <FaChartPie className="chart-icon" />
                  <h4>Gender Distribution</h4>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Program Participation Chart (if data exists) */}
            {programData.length > 0 && (
              <div className="chart-card full-width">
                <div className="chart-header">
                  <FaChartBar className="chart-icon" />
                  <h4>Program Participation</h4>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={programData} layout="vertical">
                    <XAxis type="number" stroke="#666" />
                    <YAxis type="category" dataKey="name" stroke="#666" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#F59E0B" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detailed Report Table */}
            {reportType === "detailed" && (
              <div className="detailed-report">
                <h4>Detailed Youth List</h4>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Age</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Registration Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredYouths.map((youth, index) => (
                        <tr key={index}>
                          <td>{`${youth.first_name || ''} ${youth.last_name || ''}`.trim()}</td>
                          <td>{youth.gender || "-"}</td>
                          <td>{youth.age || "-"}</td>
                          <td>{youth.contact || "-"}</td>
                          <td>{youth.email || "-"}</td>
                          <td>
                            <span className={`status-badge ${(youth.status || "active").toLowerCase()}`}>
                              {youth.status || "Active"}
                            </span>
                          </td>
                          <td>{youth.created_at ? format(new Date(youth.created_at), "yyyy-MM-dd") : "-"}</td>
                        </tr>
                      ))}
                      {filteredYouths.length === 0 && (
                        <tr>
                          <td colSpan="7" className="no-data">No youth data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}