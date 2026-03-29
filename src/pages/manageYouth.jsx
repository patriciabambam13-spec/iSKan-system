import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import "../styles/manageYouth.css";

import { 
  FaSearch, FaEye, FaEdit, FaUserPlus, FaFileCsv, FaFilePdf, 
  FaTimesCircle, FaUser, FaMoneyBillWave, FaCalendarCheck, 
  FaChartLine, FaTimes 
} from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

export default function ManageYouth() {
  const [youths, setYouths] = useState([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ✅ PAGINATION STATE (FIXED)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  const [selectedYouth, setSelectedYouth] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("details");

  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // ✅ DEBOUNCE TIMER REF
  const debounceTimer = useRef(null);

  const navigate = useNavigate();

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showView || showEdit || showDelete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showView, showEdit, showDelete]);

  // ✅ HELPER: FORMAT DATE (REUSABLE)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : "-";

  // ✅ FETCH YOUTH WITH PROPER ORDER AND PAGINATION (FIXED)
  const fetchYouth = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // First, get total count for pagination
      let countQuery = supabase
        .from("youth")
        .select("*", { count: "exact", head: true });

      // ✅ FIXED SEARCH - removed youth_id column
      if (search) {
        countQuery = countQuery.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,qr_code.ilike.%${search}%`
        );
      }
      if (genderFilter) countQuery = countQuery.eq("gender", genderFilter);
      if (statusFilter) countQuery = countQuery.eq("status", statusFilter);

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / limit));

      // Then fetch paginated data with ✅ ORDER BY created_at
      let query = supabase
        .from("youth")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      // ✅ FIXED SEARCH - removed youth_id column
      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,qr_code.ilike.%${search}%`
        );
      }
      if (genderFilter) query = query.eq("gender", genderFilter);
      if (statusFilter) query = query.eq("status", statusFilter);

      const { data, error } = await query;

      if (error) throw error;

      setYouths(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load youth");
    } finally {
      setIsLoading(false);
    }
  }, [search, genderFilter, statusFilter, page, limit]);

  // ✅ DEBOUNCED FETCH (FIXED - prevents too many refetches)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(() => {
      fetchYouth();
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, genderFilter, statusFilter, page, fetchYouth]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, genderFilter, statusFilter]);

  // FETCH ALL TRANSACTIONS FOR SELECTED YOUTH
  const fetchTransactions = async (youthId) => {
    try {
      const { data, error } = await supabase
        .from("transaction")
        .select(`
          *,
          programs:program_id (
            program_name,
            start_date,
            program_type
          )
        `)
        .eq("youth_id", youthId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    }
  };

  // ✅ DELETE YOUTH (FIXED - added error handling)
  const deleteYouth = async () => {
    try {
      const { error } = await supabase
        .from("youth")
        .delete()
        .eq("id", selectedYouth.id);

      if (error) throw error;

      toast.success("Youth deleted successfully");
      setShowDelete(false);
      setSelectedYouth(null);
      fetchYouth();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Delete failed - check RLS policies");
    }
  };

  // UPDATE YOUTH
  const updateYouth = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from("youth")
        .update({
          first_name: selectedYouth.first_name,
          last_name: selectedYouth.last_name,
          gender: selectedYouth.gender,
          status: selectedYouth.status,
          contact: selectedYouth.contact,
          email: selectedYouth.email,
          address: selectedYouth.address
        })
        .eq("id", selectedYouth.id);

      if (error) throw error;

      toast.success("Youth updated successfully");
      setShowEdit(false);
      fetchYouth();
      
      // Update selected youth data
      if (showView) {
        setSelectedYouth(prev => ({ ...prev, ...selectedYouth }));
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Update failed");
    }
  };

  // Handle view youth details
  const handleViewYouth = async (youth) => {
    setSelectedYouth(youth);
    setActiveTab("details");
    await fetchTransactions(youth.id);
    setShowView(true);
  };

  // ✅ CLEAN FILTERED DATA (FIXED)
  const attendance = transactions.filter(t => t.type === "Attendance");
  const requests = transactions.filter(t => t.type !== "Attendance");

  const stats = {
    total: transactions.length,
    attendance: attendance.length,
    requests: requests.length
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ["Full Name", "Youth ID", "Age", "Gender", "Status", "Contact", "Email", "Date Registered"];
    const rows = youths.map(y => [
      `${y.first_name || ''} ${y.last_name || ''}`.trim(),
      y.qr_code || "-",
      y.age || "-",
      y.gender || "-",
      y.status || "Active",
      y.contact || "-",
      y.email || "-",
      formatDate(y.created_at)
    ]);

    let csvContent = headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell || ''}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `youth_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  // Export to PDF
  const exportPDF = () => {
    window.print();
  };

  // ✅ HANDLE PAGE CHANGE (FIXED)
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Modal Components using Portal
  const ViewModal = () => {
    if (!(showView && selectedYouth)) return null;
    
    return createPortal(
      <div className="modal-overlay" onClick={() => setShowView(false)}>
        <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Youth Profile</h2>
            <button className="modal-close" onClick={() => setShowView(false)}>
              <FaTimes />
            </button>
          </div>

          {/* Youth Summary Card */}
          <div className="youth-summary">
            <div className="youth-avatar-large">
              {selectedYouth.photo_url ? (
                <img src={selectedYouth.photo_url} alt={selectedYouth.first_name} />
              ) : (
                <div className="avatar-placeholder-large">
                  <FaUser />
                </div>
              )}
            </div>
            <div className="youth-basic-info">
              <h3>{`${selectedYouth.first_name || ''} ${selectedYouth.last_name || ''}`.trim()}</h3>
              <p className="youth-id">ID: {selectedYouth.qr_code || '-'}</p>
              <span className={`status-badge ${(selectedYouth.status || "Active").toLowerCase()}`}>
                {selectedYouth.status || "Active"}
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="modal-stats">
            <div className="stat-card-mini">
              <FaChartLine />
              <div>
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Total Activities</span>
              </div>
            </div>
            <div className="stat-card-mini">
              <FaCalendarCheck />
              <div>
                <span className="stat-number">{stats.attendance}</span>
                <span className="stat-label">Programs Attended</span>
              </div>
            </div>
            <div className="stat-card-mini">
              <FaMoneyBillWave />
              <div>
                <span className="stat-number">{stats.requests}</span>
                <span className="stat-label">Requests Made</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="modal-tabs">
            <button 
              className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              <FaUser /> Personal Info
            </button>
            <button 
              className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`}
              onClick={() => setActiveTab("transactions")}
            >
              <FaMoneyBillWave /> All Transactions ({stats.total})
            </button>
            <button 
              className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`}
              onClick={() => setActiveTab("attendance")}
            >
              <FaCalendarCheck /> Program Attendance ({stats.attendance})
            </button>
          </div>

          <div className="modal-body">
            {/* Personal Info Tab */}
            {activeTab === "details" && (
              <div className="personal-info-grid">
                <div className="info-group">
                  <label>Full Name</label>
                  <p>{`${selectedYouth.first_name || ''} ${selectedYouth.last_name || ''}`.trim()}</p>
                </div>
                <div className="info-group">
                  <label>Youth ID</label>
                  <p>{selectedYouth.qr_code || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Age</label>
                  <p>{selectedYouth.age || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Gender</label>
                  <p>{selectedYouth.gender || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Contact Number</label>
                  <p>{selectedYouth.contact || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Email Address</label>
                  <p>{selectedYouth.email || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Address</label>
                  <p>{selectedYouth.address || '-'}</p>
                </div>
                <div className="info-group">
                  <label>Barangay</label>
                  <p>{selectedYouth.barangay || 'Barangay Pinagkaisahan'}</p>
                </div>
                <div className="info-group">
                  <label>Date Registered</label>
                  <p>{formatDate(selectedYouth.created_at)}</p>
                </div>
              </div>
            )}

            {/* All Transactions Tab */}
            {activeTab === "transactions" && (
              <div className="transactions-list">
                {transactions.length === 0 ? (
                  <div className="empty-transactions">
                    <FaMoneyBillWave />
                    <p>No transactions yet for this youth</p>
                    <small>Transactions will appear when youth participates in programs</small>
                  </div>
                ) : (
                  transactions.map((transaction, idx) => (
                    <div key={idx} className="transaction-card">
                      <div className="transaction-icon">
                        {transaction.type === "Attendance" ? <FaCalendarCheck /> : <FaMoneyBillWave />}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-header">
                          <span className="transaction-type">{transaction.type || 'Transaction'}</span>
                          <span className="transaction-date">
                            {formatDate(transaction.created_at)}
                          </span>
                        </div>
                        {transaction.type === "Attendance" ? (
                          <p className="transaction-program">
                            Program: {transaction.programs?.program_name || 'Unknown Program'}
                          </p>
                        ) : (
                          <p className="transaction-amount">Amount: ₱{transaction.amount || '0.00'}</p>
                        )}
                        <span className={`status-badge ${(transaction.transaction_status || "completed").toLowerCase()}`}>
                          {transaction.transaction_status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Program Attendance Tab */}
            {activeTab === "attendance" && (
              <div className="attendance-list">
                {attendance.length === 0 ? (
                  <div className="empty-attendance">
                    <FaCalendarCheck />
                    <p>No program attendance records</p>
                    <small>Scan youth QR code at programs to record attendance</small>
                  </div>
                ) : (
                  attendance.map((record, idx) => (
                    <div key={idx} className="attendance-card">
                      <div className="attendance-icon">
                        <FaCalendarCheck />
                      </div>
                      <div className="attendance-details">
                        <div className="attendance-header">
                          <span className="program-name">{record.programs?.program_name || 'Unknown Program'}</span>
                          <span className="attendance-date">
                            {record.programs?.start_date ? formatDate(record.programs.start_date) : '-'}
                          </span>
                        </div>
                        <div className="attendance-meta">
                          <span className="program-type">{record.programs?.program_type || 'General'}</span>
                          <span className={`status-badge ${(record.transaction_status || "completed").toLowerCase()}`}>
                            {record.transaction_status || "Present"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowView(false)}>Close</button>
            <button className="btn-primary" onClick={() => {
              setShowView(false);
              setShowEdit(true);
            }}>Edit Profile</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const EditModal = () => {
    if (!(showEdit && selectedYouth)) return null;
    
    return createPortal(
      <div className="modal-overlay" onClick={() => setShowEdit(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit Youth Profile</h2>
            <button className="modal-close" onClick={() => setShowEdit(false)}>
              <FaTimes />
            </button>
          </div>
          <form onSubmit={updateYouth}>
            <div className="form-group">
              <label>First Name <span className="req">*</span></label>
              <input
                value={selectedYouth.first_name || ''}
                onChange={(e) => setSelectedYouth({ ...selectedYouth, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name <span className="req">*</span></label>
              <input
                value={selectedYouth.last_name || ''}
                onChange={(e) => setSelectedYouth({ ...selectedYouth, last_name: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={selectedYouth.gender || "Male"}
                  onChange={(e) => setSelectedYouth({ ...selectedYouth, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={selectedYouth.status || "Active"}
                  onChange={(e) => setSelectedYouth({ ...selectedYouth, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input
                value={selectedYouth.contact || ''}
                onChange={(e) => setSelectedYouth({ ...selectedYouth, contact: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={selectedYouth.email || ''}
                onChange={(e) => setSelectedYouth({ ...selectedYouth, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea
                value={selectedYouth.address || ''}
                onChange={(e) => setSelectedYouth({ ...selectedYouth, address: e.target.value })}
                rows="3"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowEdit(false)}>Cancel</button>
              <button type="submit" className="save-btn">Save Changes</button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  const DeleteModal = () => {
    if (!(showDelete && selectedYouth)) return null;
    
    return createPortal(
      <div className="modal-overlay" onClick={() => setShowDelete(false)}>
        <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Delete Youth Record</h2>
            <button className="modal-close" onClick={() => setShowDelete(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="delete-warning">
            <FaTimesCircle />
            <p>Are you sure you want to delete <strong>{`${selectedYouth.first_name || ''} ${selectedYouth.last_name || ''}`.trim()}</strong>?</p>
            <small>This action cannot be undone.</small>
          </div>
          <div className="modal-actions">
            <button className="cancel-btn" onClick={() => setShowDelete(false)}>Cancel</button>
            <button className="delete-confirm-btn" onClick={deleteYouth}>Delete Permanently</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // ✅ PAGINATION BUTTONS GENERATOR
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`page-btn ${page === i ? "active" : ""}`}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <>
      <Navbar />
      <Toaster position="top-center" />

      <div className="manage-youth-container">
        {/* PAGE HEADER */}
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <div className="header-text">
            <h2>Manage Youth</h2>
            <p>View, edit, and manage registered youth records</p>
          </div>
          <button className="register-btn" onClick={() => navigate('/register-youth')}>
            <FaUserPlus /> Register New Youth
          </button>
        </div>

        {/* FILTER SECTION */}
        <div className="filter-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              placeholder="Search by name or QR code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
            <option value="">All Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button className="clear-filters-btn" onClick={() => {
            setSearch("");
            setGenderFilter("");
            setStatusFilter("");
            setPage(1);
          }}>
            Clear Filters
          </button>
        </div>

        {/* RECORD BAR */}
        <div className="record-bar">
          <div className="record-info">
            <span className="record-count">{totalCount}</span>
            <span>youth records found</span>
          </div>
          <div className="export-buttons">
            <button className="export-btn csv" onClick={exportCSV}>
              <FaFileCsv /> CSV
            </button>
            <button className="export-btn pdf" onClick={exportPDF}>
              <FaFilePdf /> PDF
            </button>
          </div>
        </div>

        {/* YOUTH TABLE */}
        <div className="table-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading youth records...</p>
            </div>
          ) : youths.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No youth records found</h3>
              <p>Click "Register New Youth" to add your first youth member</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="youth-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Full Name</th>
                    <th>QR Code</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Date Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {youths.map((youth) => (
                    <tr key={youth.id}>
                      <td className="photo-cell">
                        {youth.photo_url ? (
                          <img src={youth.photo_url} alt={youth.first_name} className="youth-photo" />
                        ) : (
                          <div className="photo-placeholder">
                            <FaUser />
                          </div>
                        )}
                      </td>
                      <td className="name-cell">
                        <div className="youth-name">
                          {`${youth.first_name || ''} ${youth.last_name || ''}`.trim()}
                        </div>
                      </td>
                      <td className="id-cell">{youth.qr_code || '-'}</td>
                      <td className="age-cell">{youth.age || '-'}</td>
                      <td className="gender-cell">{youth.gender || '-'}</td>
                      <td className="status-cell">
                        <span className={`status-badge ${(youth.status || "Active").toLowerCase()}`}>
                          {youth.status || "Active"}
                        </span>
                      </td>
                      <td className="date-cell">
                        {formatDate(youth.created_at)}
                      </td>
                      <td className="actions-cell">
                        <button className="action-btn view" onClick={() => handleViewYouth(youth)} title="View Details">
                          <FaEye />
                        </button>
                        <button className="action-btn edit" onClick={() => {
                          setSelectedYouth(youth);
                          setShowEdit(true);
                        }} title="Edit Youth">
                          <FaEdit />
                        </button>
                        <button className="action-btn delete" onClick={() => {
                          setSelectedYouth(youth);
                          setShowDelete(true);
                        }} title="Delete Youth">
                          <FaTimesCircle />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ✅ REAL PAGINATION (FIXED) */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="page-btn" 
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            {renderPaginationButtons()}
            <button 
              className="page-btn" 
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals rendered via Portal */}
      <ViewModal />
      <EditModal />
      <DeleteModal />
    </>
  );
}