import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from "recharts";
import { format } from "date-fns";
import { FaFileCsv, FaCalendarAlt, FaChartBar, FaChartPie, FaFilter, FaUsers, FaCheckCircle, FaCalendarCheck, FaChartLine } from "react-icons/fa";
import "../styles/generateReports.css";

const CHART_COLORS = ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6"];

export default function GenerateReports() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [program, setProgram] = useState("");
  const [reportType, setReportType] = useState("summary");
  const [isLoading, setIsLoading] = useState(false);

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
      
      let filtered = youthData;
      if (program) {
        filtered = youthData.filter(y => y.program_id === program);
      }
      setFilteredYouths(filtered);

      const total = filtered.length;
      const active = filtered.filter(y => y.status === "Active" || !y.status).length;
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

      const months = {};
      filtered.forEach(y => {
        const month = format(new Date(y.created_at || Date.now()), "MMM");
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

      const genderArray = [
        { name: "Male", value: male },
        { name: "Female", value: female },
        { name: "Other", value: other }
      ].filter(g => g.value > 0);

      setGenderData(genderArray);

      const programStats = {};
      filtered.forEach(y => {
        if (y.program_id) {
          programStats[y.program_id] = (programStats[y.program_id] || 0) + 1;
        }
      });

      const programArray = Object.keys(programStats).map(pid => ({
        name: programs.find(p => p.id === pid)?.program_name || "Unknown",
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

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setProgram("");
    setReportType("summary");
  };

  return (
    <>
      <Navbar />
      <div className="reports-container">
        {/* Header Section */}
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            ←
          </button>
          <div className="header-text">
            <h2>Generate Reports</h2>
            <p>View and export youth participation analytics</p>
          </div>
        </div>

        {/* Filters Section - Simplified Single Row */}
        <div className="filter-section">
          <div className="filter-header">
            <FaFilter className="filter-icon" />
            <span>Filter Criteria</span>
          </div>
          
          <div className="filters-wrapper">
            <div className="filter-item">
              <label>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label>Program</label>
              <select 
                onChange={e => setProgram(e.target.value)} 
                value={program}
                className="filter-select"
              >
                <option value="">All Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.program_name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
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

            <div className="filter-item filter-buttons">
              <label>&nbsp;</label>
              <div className="button-group">
                <button onClick={clearFilters} className="btn-outline">
                  Clear Filters
                </button>
                <button onClick={exportCSV} className="btn-primary">
                  <FaFileCsv /> Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading reports...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-info">
                  <h3>{stats.total}</h3>
                  <p>Total Youth</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaCheckCircle />
                </div>
                <div className="stat-info">
                  <h3>{stats.active}</h3>
                  <p>Active Youth</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaCalendarCheck />
                </div>
                <div className="stat-info">
                  <h3>{stats.programs}</h3>
                  <p>Total Programs</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaChartLine />
                </div>
                <div className="stat-info">
                  <h3>{stats.participation}%</h3>
                  <p>Participation Rate</p>
                </div>
              </div>
            </div>

            {/* Charts Section - Side by Side */}
            <div className="charts-container">
              <div className="chart-card">
                <div className="chart-header">
                  <FaChartBar className="chart-icon" />
                  <h4>Monthly Participation Trends</h4>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <FaChartPie className="chart-icon" />
                  <h4>Gender Distribution</h4>
                </div>
                <div className="chart-wrapper">
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
                        labelLine={false}
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Program Participation Chart */}
            {programData.length > 0 && (
              <div className="chart-card full-width">
                <div className="chart-header">
                  <FaChartBar className="chart-icon" />
                  <h4>Program Participation Overview</h4>
                </div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={programData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" stroke="#888" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} width={150} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#F59E0B" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Detailed Report Table */}
            {reportType === "detailed" && filteredYouths.length > 0 && (
              <div className="detailed-report">
                <div className="detailed-header">
                  <h4>Youth Directory</h4>
                  <span className="record-count">{filteredYouths.length} records found</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
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
                            <span className={`status-badge ${(youth.status || "Active").toLowerCase()}`}>
                              {youth.status || "Active"}
                            </span>
                          </td>
                          <td>{youth.created_at ? format(new Date(youth.created_at), "yyyy-MM-dd") : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === "detailed" && filteredYouths.length === 0 && (
              <div className="empty-state">
                <p>No youth records found for the selected filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}