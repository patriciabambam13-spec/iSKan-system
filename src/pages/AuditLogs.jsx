import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { format } from "date-fns";
import { 
  FaSearch, FaFilter, FaDownload, FaCalendarAlt, 
  FaUser, FaClock, FaDatabase, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaEye, FaSync
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
  const [userFilter, setUserFilter] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    uniqueUsers: 0
  });

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          users:user_id(email, role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setLogs(data || []);
      setFilteredLogs(data || []);
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const todayLogs = data?.filter(log => log.created_at?.split('T')[0] === today) || [];
      const weekLogs = data?.filter(log => new Date(log.created_at) >= weekAgo) || [];
      const uniqueUsers = new Set(data?.map(log => log.user_id)).size;
      
      setStats({
        total: data?.length || 0,
        today: todayLogs.length,
        thisWeek: weekLogs.length,
        uniqueUsers: uniqueUsers
      });
      
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...logs];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Action type filter
    if (actionType) {
      filtered = filtered.filter(log => log.action === actionType);
    }
    
    // Date range filter
    if (fromDate) {
      filtered = filtered.filter(log => log.created_at?.split('T')[0] >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(log => log.created_at?.split('T')[0] <= toDate);
    }
    
    // User filter
    if (userFilter) {
      filtered = filtered.filter(log => log.user_id === userFilter);
    }
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchTerm, actionType, fromDate, toDate, userFilter, logs]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const getActionBadge = (action) => {
    switch(action) {
      case 'CREATE':
        return <span className="badge-action create">CREATE</span>;
      case 'UPDATE':
        return <span className="badge-action update">UPDATE</span>;
      case 'DELETE':
        return <span className="badge-action delete">DELETE</span>;
      case 'OVERRIDE':
        return <span className="badge-action override">OVERRIDE</span>;
      default:
        return <span className="badge-action default">{action}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Table", "Record ID", "Details", "IP Address"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.users?.email || "Unknown",
      log.action || "",
      log.table_name || "",
      log.record_id || "",
      log.details || "",
      log.ip_address || ""
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell || ''}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `audit_logs_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setActionType("");
    setFromDate("");
    setToDate("");
    setUserFilter("");
  };

  return (
    <>
      <Navbar />
      <div className="audit-container">
        {/* Header */}
        <div className="audit-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-text">
            <h2>Audit Logs</h2>
            <p>Track all system activities and user actions</p>
          </div>
          <button className="refresh-btn" onClick={fetchAuditLogs}>
            <FaSync /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="audit-stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <FaDatabase />
            </div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Events</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <h3>{stats.today}</h3>
              <p>Today</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <FaClock />
            </div>
            <div className="stat-info">
              <h3>{stats.thisWeek}</h3>
              <p>This Week</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <FaUser />
            </div>
            <div className="stat-info">
              <h3>{stats.uniqueUsers}</h3>
              <p>Active Users</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-header">
            <FaFilter className="filter-icon" />
            <span>Filter Logs</span>
          </div>
          
          <div className="filters-row">
            <div className="filter-group">
              <label>Search</label>
              <div className="search-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search actions, tables, records..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="filter-input"
                />
              </div>
            </div>

            <div className="filter-group">
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
                <option value="OVERRIDE">OVERRIDE</option>
              </select>
            </div>

            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-actions">
              <button onClick={clearFilters} className="btn-outline">
                Clear
              </button>
              <button onClick={exportToCSV} className="btn-primary">
                <FaDownload /> Export
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : (
          <>
            <div className="logs-table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
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
                      <tr key={index}>
                        <td className="timestamp">
                          {log.created_at ? format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss") : "-"}
                        </td>
                        <td>
                          <div className="user-info">
                            <FaUser className="user-icon" />
                            <span>{log.users?.email?.split('@')[0] || "Unknown"}</span>
                          </div>
                        </td>
                        <td>{getActionBadge(log.action)}</td>
                        <td>
                          <span className="table-name">{log.table_name || "-"}</span>
                        </td>
                        <td>
                          <code className="record-id">{log.record_id || "-"}</code>
                        </td>
                        <td className="details-cell">
                          <div className="details-preview">
                            {log.details ? (
                              <>
                                <span>{log.details.substring(0, 50)}</span>
                                {log.details.length > 50 && <span>...</span>}
                              </>
                            ) : "-"}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <FaExclamationTriangle />
                        <p>No audit logs found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredLogs.length > 0 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  <FaChevronLeft />
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}