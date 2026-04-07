import { useState, useEffect, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { logActivity } from "../utils/logActivity";
import "../styles/manageYouth.css";

import { 
  FaSearch, FaEye, FaEdit, FaUserPlus, FaFileCsv, FaFilePdf, 
  FaTimesCircle, FaUser, FaMoneyBillWave, FaCalendarCheck, 
  FaChartLine, FaTimes 
} from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";

const PAGE_SIZE = 8;

// Edit Modal Component
const EditModal = memo(({ show, youth, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: null,
    first_name: "",
    last_name: "",
    gender: "Male",
    status: "Active",
    contact: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    if (show && youth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        id: youth.id,
        first_name: youth.first_name || "",
        last_name: youth.last_name || "",
        gender: youth.gender || "Male",
        status: youth.status || "Active",
        contact: youth.contact || "",
        email: youth.email || "",
        address: youth.address || ""
      });
    }
  }, [show, youth?.id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.id && onSave) {
      onSave(formData);
    }
  };

  if (!show || !youth) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Youth Profile</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name <span className="req">*</span></label>
            <input 
              value={formData.first_name} 
              onChange={(e) => handleChange("first_name", e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Last Name <span className="req">*</span></label>
            <input 
              value={formData.last_name} 
              onChange={(e) => handleChange("last_name", e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Gender</label>
              <select 
                value={formData.gender} 
                onChange={(e) => handleChange("gender", e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select 
                value={formData.status} 
                onChange={(e) => handleChange("status", e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Contact Number</label>
            <input 
              value={formData.contact} 
              onChange={(e) => handleChange("contact", e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => handleChange("email", e.target.value)} 
            />
          </div>
          
          <div className="form-group">
            <label>Address</label>
            <textarea 
              value={formData.address} 
              onChange={(e) => handleChange("address", e.target.value)} 
              rows="3" 
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
});

// Delete Modal Component
const DeleteModal = memo(({ show, name, onClose, onConfirm }) => {
  if (!show) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Youth Record</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        
        <div className="delete-warning">
          <FaTimesCircle />
          <p>Are you sure you want to delete <strong>{name}</strong>?</p>
          <small>This action cannot be undone.</small>
        </div>
        
        <div className="modal-actions delete-modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="delete-confirm-btn" onClick={onConfirm}>Delete Permanently</button>
        </div>
      </div>
    </div>,
    document.body
  );
});

// Main Component
export default function ManageYouth() {
  // State
  const [youths, setYouths] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  
  // Modals
  const [selectedYouth, setSelectedYouth] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const navigate = useNavigate();
  const debounceTimer = useRef(null);
  
  // Helpers
  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : "-";
  const getFullName = (youth) => `${youth?.first_name || ''} ${youth?.last_name || ''}`.trim();
  
  // Fetch youth
  const fetchYouth = useCallback(async () => {
    setIsLoading(true);
    
    try {
      let query = supabase.from("youth").select("*", { count: "exact" });
      
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,qr_code.ilike.%${searchTerm}%`);
      }
      if (genderFilter) {
        query = query.eq("gender", genderFilter);
      }
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      
      const { count, error: countError } = await query;
      if (countError) throw countError;
      setTotalCount(count || 0);
      
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let dataQuery = supabase
        .from("youth")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (searchTerm) {
        dataQuery = dataQuery.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,qr_code.ilike.%${searchTerm}%`);
      }
      if (genderFilter) {
        dataQuery = dataQuery.eq("gender", genderFilter);
      }
      if (statusFilter) {
        dataQuery = dataQuery.eq("status", statusFilter);
      }
      
      const { data, error } = await dataQuery;
      if (error) throw error;
      
      setYouths(data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load youth records");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, genderFilter, statusFilter, page]);
  
  // Fetch transactions
  const fetchTransactions = async (youthId) => {
    try {
      const { data, error } = await supabase
        .from("transaction")
        .select(`*, programs:program_id (program_name, start_date, program_type)`)
        .eq("youth_id", youthId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Transactions error:", error);
      setTransactions([]);
    }
  };
  
  // Delete youth with audit log
  const handleDelete = async () => {
    if (!deleteTarget) {
      toast.error("No record selected");
      return;
    }
    
    const deleteId = Number(deleteTarget.id);
    const deleteName = getFullName(deleteTarget);
    const loadingToast = toast.loading(`Deleting ${deleteName}...`);
    
    try {
      const { data, error } = await supabase
        .from("youth")
        .delete()
        .eq("id", deleteId)
        .select();
      
      console.log("DELETE RESULT:", data, error);
      
      if (error) {
        console.error("Delete error:", error);
        toast.error(`Delete failed: ${error.message}`, { id: loadingToast });
        return;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No row deleted. Check RLS policy or ID.");
      }
      
      // Log the delete activity
      await logActivity({
        action: "DELETE",
        table: "youth",
        recordId: deleteId,
        details: `Deleted youth record: ${deleteName}`,
        oldData: deleteTarget
      });
      
      toast.success(`${deleteName} deleted successfully`, { id: loadingToast });
      
      setYouths(prev => {
        const updated = prev.filter(y => y.id !== deleteId);
        if (updated.length === 0 && page > 1) {
          setPage(prevPage => prevPage - 1);
        }
        return updated;
      });
      
      setTotalCount(prev => prev - 1);
      setShowDelete(false);
      setDeleteTarget(null);
      
      setTimeout(() => fetchYouth(), 500);
      
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(`Delete failed: ${error.message}`, { id: loadingToast });
    }
  };
  
  // Update youth with audit log
  const handleUpdate = async (formData) => {
    const oldData = editTarget;
    const loadingToast = toast.loading("Updating youth record...");
    
    try {
      const { error } = await supabase
        .from("youth")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          gender: formData.gender,
          status: formData.status,
          contact: formData.contact,
          email: formData.email,
          address: formData.address
        })
        .eq("id", formData.id)
        .select();
      
      if (error) throw error;
      
      // Log the update activity
      await logActivity({
        action: "UPDATE",
        table: "youth",
        recordId: formData.id,
        details: `Updated youth record: ${getFullName(formData)}`,
        oldData: oldData,
        newData: formData
      });
      
      toast.success("Youth updated successfully", { id: loadingToast });
      setShowEdit(false);
      setEditTarget(null);
      await fetchYouth();
      
      if (showView && selectedYouth?.id === formData.id) {
        setSelectedYouth(prev => ({ ...prev, ...formData }));
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error(`Update failed: ${error.message}`, { id: loadingToast });
    }
  };
  
  // Handlers
  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };
  
  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setGenderFilter("");
    setStatusFilter("");
    setPage(1);
  };
  
  const handleOpenEdit = (youth) => {
    setEditTarget(youth);
    setShowEdit(true);
  };
  
  const handleOpenDelete = (youth) => {
    setDeleteTarget(youth);
    setShowDelete(true);
  };
  
  const handleOpenView = async (youth) => {
    setSelectedYouth(youth);
    setActiveTab("details");
    await fetchTransactions(youth.id);
    setShowView(true);
    
    // Log view activity (optional - can be commented out if too many logs)
    await logActivity({
      action: "VIEW",
      table: "youth",
      recordId: youth.id,
      details: `Viewed youth profile: ${getFullName(youth)}`
    });
  };
  
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  // Stats
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const attendance = transactions.filter(t => t.type === "Attendance");
  const stats = {
    total: transactions.length,
    attendance: attendance.length,
    requests: transactions.filter(t => t.type !== "Attendance").length
  };
  
  // Effects
  useEffect(() => {
    fetchYouth();
  }, [fetchYouth]);
  
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (genderFilter || statusFilter) setPage(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [genderFilter, statusFilter]);
  
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  
  useEffect(() => {
    document.body.style.overflow = (showView || showEdit || showDelete) ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [showView, showEdit, showDelete]);
  
  // Export
  const exportCSV = () => {
    const headers = ["Full Name", "QR Code", "Age", "Gender", "Status", "Contact", "Email", "Date Registered"];
    const rows = youths.map(y => [
      getFullName(y), y.qr_code || "-", y.age || "-", y.gender || "-",
      y.status || "Active", y.contact || "-", y.email || "-", formatDate(y.created_at)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `youth_records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV exported!");
    
    // Log export activity
    logActivity({
      action: "EXPORT",
      table: "youth",
      recordId: null,
      details: `Exported ${youths.length} youth records to CSV`
    });
  };
  
  const exportPDF = () => {
    window.print();
    
    // Log export activity
    logActivity({
      action: "EXPORT",
      table: "youth",
      recordId: null,
      details: `Printed ${youths.length} youth records`
    });
  };
  
  // Pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(
        <button key={i} className={`page-btn ${page === i ? "active" : ""}`} onClick={() => handlePageChange(i)}>
          {i}
        </button>
      );
    }
    
    return (
      <div className="pagination">
        <button className="page-btn" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>Previous</button>
        {pages}
        <button className="page-btn" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>Next</button>
      </div>
    );
  };
  
  // View Modal
  const ViewModal = () => {
    if (!showView || !selectedYouth) return null;
    
    return createPortal(
      <div className="modal-overlay" onClick={() => setShowView(false)}>
        <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Youth Profile</h2>
            <button className="modal-close" onClick={() => setShowView(false)}><FaTimes /></button>
          </div>
          
          <div className="youth-summary">
            <div className="youth-avatar-large">
              {selectedYouth.photo_url ? (
                <img src={selectedYouth.photo_url} alt={selectedYouth.first_name} />
              ) : (
                <div className="avatar-placeholder-large"><FaUser /></div>
              )}
            </div>
            <div className="youth-basic-info">
              <h3>{getFullName(selectedYouth)}</h3>
              <p className="youth-id">ID: {selectedYouth.qr_code || '-'}</p>
              <span className={`status-badge ${(selectedYouth.status || "Active").toLowerCase()}`}>
                {selectedYouth.status || "Active"}
              </span>
            </div>
          </div>
          
          <div className="modal-stats">
            <div className="stat-card-mini"><FaChartLine /><div><span className="stat-number">{stats.total}</span><span className="stat-label">Total Activities</span></div></div>
            <div className="stat-card-mini"><FaCalendarCheck /><div><span className="stat-number">{stats.attendance}</span><span className="stat-label">Programs Attended</span></div></div>
            <div className="stat-card-mini"><FaMoneyBillWave /><div><span className="stat-number">{stats.requests}</span><span className="stat-label">Requests Made</span></div></div>
          </div>
          
          <div className="modal-tabs">
            <button className={`tab-btn ${activeTab === "details" ? "active" : ""}`} onClick={() => setActiveTab("details")}><FaUser /> Personal Info</button>
            <button className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`} onClick={() => setActiveTab("transactions")}><FaMoneyBillWave /> All Transactions ({stats.total})</button>
            <button className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`} onClick={() => setActiveTab("attendance")}><FaCalendarCheck /> Program Attendance ({stats.attendance})</button>
          </div>
          
          <div className="modal-body">
            {activeTab === "details" && (
              <div className="personal-info-grid">
                <div className="info-group"><label>Full Name</label><p>{getFullName(selectedYouth)}</p></div>
                <div className="info-group"><label>Youth ID</label><p>{selectedYouth.qr_code || '-'}</p></div>
                <div className="info-group"><label>Age</label><p>{selectedYouth.age || '-'}</p></div>
                <div className="info-group"><label>Gender</label><p>{selectedYouth.gender || '-'}</p></div>
                <div className="info-group"><label>Contact Number</label><p>{selectedYouth.contact || '-'}</p></div>
                <div className="info-group"><label>Email Address</label><p>{selectedYouth.email || '-'}</p></div>
                <div className="info-group"><label>Address</label><p>{selectedYouth.address || '-'}</p></div>
                <div className="info-group"><label>Barangay</label><p>{selectedYouth.barangay || 'Barangay Pinagkaisahan'}</p></div>
                <div className="info-group"><label>Date Registered</label><p>{formatDate(selectedYouth.created_at)}</p></div>
              </div>
            )}
            
            {(activeTab === "transactions" || activeTab === "attendance") && (
              <div className="transactions-list">
                {(activeTab === "attendance" ? attendance : transactions).length === 0 ? (
                  <div className="empty-transactions"><FaCalendarCheck /><p>No records found</p></div>
                ) : (
                  (activeTab === "attendance" ? attendance : transactions).map((record, idx) => (
                    <div key={idx} className="transaction-card">
                      <div className="transaction-icon">{record.type === "Attendance" ? <FaCalendarCheck /> : <FaMoneyBillWave />}</div>
                      <div className="transaction-details">
                        <div className="transaction-header">
                          <span className="transaction-type">{record.type || 'Transaction'}</span>
                          <span className="transaction-date">{formatDate(record.created_at)}</span>
                        </div>
                        {record.type === "Attendance" ? (
                          <p className="transaction-program">Program: {record.programs?.program_name || 'Unknown'}</p>
                        ) : (
                          <p className="transaction-amount">Amount: ₱{record.amount || '0.00'}</p>
                        )}
                        <span className={`status-badge ${(record.transaction_status || "completed").toLowerCase()}`}>
                          {record.transaction_status || "Completed"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setShowView(false)}>Close</button>
            <button className="btn-primary" onClick={() => { setShowView(false); handleOpenEdit(selectedYouth); }}>Edit Profile</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };
  
  // Main render
  return (
    <>
      <Navbar />
      <Toaster position="top-center" />
      
      <div className="manage-youth-container">
        {/* Header */}
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
        
        {/* Filters */}
        <div className="filter-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              placeholder="Search by name or QR code..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
            />
            <button type="button" className="search-submit" onClick={handleSearch}>Search</button>
          </div>
          
          <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
            <option value="">All Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          
          <button className="clear-filters-btn" onClick={handleClearFilters}>Clear Filters</button>
        </div>
        
        {/* Record bar */}
        <div className="record-bar">
          <div className="record-info">
            <span className="record-count">{totalCount}</span>
            <span>youth records found</span>
          </div>
          <div className="export-buttons">
            <button className="export-btn csv" onClick={exportCSV}><FaFileCsv /> CSV</button>
            <button className="export-btn pdf" onClick={exportPDF}><FaFilePdf /> PDF</button>
          </div>
        </div>
        
        {/* Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
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
                  <tr><th>Photo</th><th>Full Name</th><th>QR Code</th><th>Age</th><th>Gender</th><th>Status</th><th>Date Registered</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {youths.map(youth => (
                    <tr key={youth.id}>
                      <td className="photo-cell">
                        {youth.photo_url ? (
                          <img src={youth.photo_url} alt={youth.first_name} className="youth-photo" />
                        ) : (
                          <div className="photo-placeholder"><FaUser /></div>
                        )}
                       </td>
                      <td className="name-cell"><div className="youth-name">{getFullName(youth)}</div></td>
                      <td className="id-cell">{youth.qr_code || '-'}</td>
                      <td className="age-cell">{youth.age || '-'}</td>
                      <td className="gender-cell">{youth.gender || '-'}</td>
                      <td className="status-cell">
                        <span className={`status-badge ${(youth.status || "Active").toLowerCase()}`}>
                          {youth.status || "Active"}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(youth.created_at)}</td>
                      <td className="actions-cell">
                        <button className="action-btn view" onClick={() => handleOpenView(youth)}><FaEye /></button>
                        <button className="action-btn edit" onClick={() => handleOpenEdit(youth)}><FaEdit /></button>
                        <button className="action-btn delete" onClick={() => handleOpenDelete(youth)}><FaTimesCircle /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {renderPagination()}
      </div>
      
      {/* Modals */}
      <ViewModal />
      <EditModal 
        show={showEdit} 
        youth={editTarget} 
        onClose={() => {
          setShowEdit(false);
          setEditTarget(null);
        }} 
        onSave={handleUpdate} 
      />
      <DeleteModal 
        show={showDelete} 
        name={deleteTarget ? getFullName(deleteTarget) : ""} 
        onClose={() => {
          setShowDelete(false);
          setDeleteTarget(null);
        }} 
        onConfirm={handleDelete} 
      />
    </>
  );
}