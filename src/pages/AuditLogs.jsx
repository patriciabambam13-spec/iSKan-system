import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { format } from "date-fns";
import {
  FaSearch, FaFilter, FaDownload, FaCalendarAlt,
  FaUser, FaClock, FaDatabase, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaSync
} from "react-icons/fa";
import "../styles/auditLogs.css";

export default function AuditLogs() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionType, setActionType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    uniqueUsers: 0
  });

  // fetch audit logs from supabase
  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          users:user_id(email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const logsData = data || [];
      setLogs(logsData);
      setFilteredLogs(logsData);

      // calculate stats
      const today = format(new Date(), "yyyy-MM-dd");
      const todayLogs = logsData.filter(l => l.created_at?.startsWith(today));
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekLogs = logsData.filter(l => new Date(l.created_at) >= weekAgo);
      
      const uniqueUsers = new Set(logsData.map(l => l.user_id)).size;

      setStats({
        total: logsData.length,
        today: todayLogs.length,
        thisWeek: weekLogs.length,
        uniqueUsers: uniqueUsers
      });

    } catch (error) {
      console.error("Fetch error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    
    // real-time subscription for new logs
    const subscription = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs(prev => [payload.new, ...prev]);
          setFilteredLogs(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // filter logic
  useEffect(() => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.table_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.record_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        // FIXED: Use users.email instead of non-existent user_email
        (log.users?.email || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionType) {
      filtered = filtered.filter(log => log.action === actionType);
    }

    if (fromDate) {
      filtered = filtered.filter(log => log.created_at?.slice(0, 10) >= fromDate);
    }

    if (toDate) {
      filtered = filtered.filter(log => log.created_at?.slice(0, 10) <= toDate);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchTerm, actionType, fromDate, toDate, logs]);

  // pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // action badge styling
  const getActionBadge = (action) => {
    const actionLower = action?.toLowerCase();
    let badgeClass = "badge-action ";
    
    if (actionLower === "create") badgeClass += "create";
    else if (actionLower === "update") badgeClass += "update";
    else if (actionLower === "delete") badgeClass += "delete";
    else badgeClass += "default";
    
    return <span className={badgeClass}>{action}</span>;
  };

  // export to csv
  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Timestamp", "User", "Action", "Table", "Record ID", "Details"];

    const rows = filteredLogs.map(log => [
      log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      // FIXED: Use users.email instead of user_email
      log.users?.email || "Unknown",
      log.action || "",
      log.table_name || "",
      log.record_id || "",
      log.details || ""
    ]);

    let csv = headers.join(",") + "\n";

    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;

    link.click();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setActionType("");
    setFromDate("");
    setToDate("");
  };

  return (
    <>
      <Navbar />

      <div className="audit-container">
        {/* FIXED: Header with white rectangular background and inline layout */}
        <div className="audit-page-header clean-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ←
          </button>

          <div className="header-inline">
            <h2>Audit Logs</h2>
          </div>

          <button className="refresh-btn" onClick={fetchAuditLogs}>
            <FaSync /> Refresh
          </button>
        </div>

        {/* stats cards */}
        <div className="audit-stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><FaDatabase /></div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Logs</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaCalendarAlt /></div>
            <div className="stat-info">
              <h3>{stats.today}</h3>
              <p>Today</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaClock /></div>
            <div className="stat-info">
              <h3>{stats.thisWeek}</h3>
              <p>This Week</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><FaUser /></div>
            <div className="stat-info">
              <h3>{stats.uniqueUsers}</h3>
              <p>Unique Users</p>
            </div>
          </div>
        </div>

        {/* filters section */}
        <div className="filter-section">
          <div className="filter-header">
            <FaFilter className="filter-icon" />
            <span>Filter Criteria</span>
          </div>

          <div className="filters-wrapper">
            <div className="filter-item">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-item">
              <label>Action Type</label>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                className="filter-select"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

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

            <div className="filter-item filter-buttons">
              <label>&nbsp;</label>
              <div className="button-group">
                <button onClick={clearFilters} className="btn-outline">
                  Clear Filters
                </button>
                <button onClick={exportToCSV} className="btn-primary">
                  <FaDownload /> Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* logs table */}
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.length > 0 ? (
                  currentLogs.map((log, index) => (
                    <tr key={log.id || index}>
                      <td>
                        {log.created_at
                          ? format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")
                          : "-"}
                      </td>
                      {/* FIXED: Use users.email instead of user_email */}
                      <td>{log.users?.email || "Unknown"}</td>
                      <td>{getActionBadge(log.action)}</td>
                      <td>{log.table_name || "-"}</td>
                      <td><code>{log.record_id || "-"}</code></td>
                      <td className="details-cell">{log.details || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-row">
                      <FaExclamationTriangle />
                      <p>No audit logs found</p>
                      <small>Logs will appear here when users perform actions</small>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <FaChevronLeft /> Previous
            </button>
            
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </>
  );
}