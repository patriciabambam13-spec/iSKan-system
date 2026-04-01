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

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [actionType, setActionType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    uniqueUsers: 0
  });

  // 🔥 FETCH DATA FROM SUPABASE
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

      // 📊 Stats
      const today = format(new Date(), "yyyy-MM-dd");

      const todayLogs = logsData.filter(
        l => l.created_at?.startsWith(today)
      );

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekLogs = logsData.filter(
        l => new Date(l.created_at) >= weekAgo
      );

      const uniqueUsers = new Set(logsData.map(l => l.user_id)).size;

      setStats({
        total: logsData.length,
        today: todayLogs.length,
        thisWeek: weekLogs.length,
        uniqueUsers
      });

    } catch (error) {
      console.error("Fetch error:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // 🔍 FILTERING LOGIC
  useEffect(() => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.table_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.record_id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionType) {
      filtered = filtered.filter(log => log.action === actionType);
    }

    if (fromDate) {
      filtered = filtered.filter(
        log => log.created_at?.slice(0, 10) >= fromDate
      );
    }

    if (toDate) {
      filtered = filtered.filter(
        log => log.created_at?.slice(0, 10) <= toDate
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchTerm, actionType, fromDate, toDate, logs]);

  // 📄 PAGINATION
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 🎨 BADGE
  const getActionBadge = (action) => {
    return <span className={`badge-action ${action?.toLowerCase()}`}>{action}</span>;
  };

  // 📥 EXPORT CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Timestamp", "User", "Action", "Table", "Record ID", "Details"];

    const rows = filteredLogs.map(log => [
      log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "",
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
        {/* HEADER */}
        <div className="audit-header">
          <button onClick={() => navigate(-1)}>←</button>
          <h2>Audit Logs</h2>
          <button onClick={fetchAuditLogs}>
            <FaSync /> Refresh
          </button>
        </div>

        {/* STATS */}
        <div className="audit-stats-grid">
          <div className="stat-card">
            <FaDatabase /> {stats.total} Total
          </div>
          <div className="stat-card">
            <FaCalendarAlt /> {stats.today} Today
          </div>
          <div className="stat-card">
            <FaClock /> {stats.thisWeek} Week
          </div>
          <div className="stat-card">
            <FaUser /> {stats.uniqueUsers} Users
          </div>
        </div>

        {/* FILTERS */}
        <div className="filters-section">
          <input
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select value={actionType} onChange={e => setActionType(e.target.value)}>
            <option value="">All</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />

          <button onClick={clearFilters}>Clear</button>
          <button onClick={exportToCSV}>
            <FaDownload /> Export
          </button>
        </div>

        {/* TABLE */}
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>ID</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map((log, i) => (
                  <tr key={i}>
                    <td>
                      {log.created_at
                        ? format(new Date(log.created_at), "MMM dd, yyyy HH:mm")
                        : "-"}
                    </td>
                    <td>{log.users?.email || "Unknown"}</td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>{log.table_name}</td>
                    <td>{log.record_id}</td>
                    <td>{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <FaExclamationTriangle /> No logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <FaChevronLeft />
            </button>

            <span>{currentPage} / {totalPages}</span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>
    </>
  );
}