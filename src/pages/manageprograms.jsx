import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { logActivity } from "../utils/logActivity";
import toast, { Toaster } from "react-hot-toast";

import { 
  FaSearch, FaEye, FaEdit, FaTrash, FaPlus, 
  FaTimes, FaCalendarAlt, FaMoneyBillWave,
  FaUsers, FaTag, FaCheckCircle, FaClock, FaArchive
} from "react-icons/fa";

import "../styles/ManagePrograms.css";

const PAGE_SIZE = 10;

export default function ManagePrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  
  const debounceTimer = useRef(null);
  
  // Status badge colors
  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return <span className="status-badge active"><FaCheckCircle /> Active</span>;
      case 'upcoming':
        return <span className="status-badge upcoming"><FaClock /> Upcoming</span>;
      case 'completed':
        return <span className="status-badge completed"><FaArchive /> Completed</span>;
      case 'draft':
        return <span className="status-badge draft"><FaTag /> Draft</span>;
      default:
        return <span className="status-badge default">{status}</span>;
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "₱ 0.00";
    return `₱ ${amount.toLocaleString()}`;
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };
  
  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);

    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("programs")
        .select("*", { count: "exact" })
        .order("id", { ascending: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(
          `program_name.ilike.%${searchTerm}%,program_id.ilike.%${searchTerm}%`
        );
      }

      if (typeFilter) {
        query = query.eq("program_type", typeFilter);
      }

      if (statusFilter) {
        query = query.eq("program_status", statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setPrograms(data || []);
      setTotalCount(count || 0);

    } catch (error) {
      console.error("Fetch error:", error.message, error.details);
      toast.error("Failed to load programs");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, typeFilter, statusFilter, page]);
  
  // Delete program
  const handleDelete = async () => {
    if (!selectedProgram) return;
    
    const loadingToast = toast.loading(`Deleting ${selectedProgram.program_name}...`);
    
    try {
      const { error } = await supabase
        .from("programs")
        .delete()
        .eq("id", selectedProgram.id);
      
      if (error) throw error;
      
      await logActivity({
        action: "DELETE",
        table: "programs",
        recordId: selectedProgram.id,
        details: `Deleted program: ${selectedProgram.program_name}`
      });
      
      toast.success("Program deleted successfully", { id: loadingToast });
      setShowDeleteModal(false);
      setSelectedProgram(null);
      fetchPrograms();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(`Delete failed: ${error.message}`, { id: loadingToast });
    }
  };
  
  // Update program status
  const handleStatusUpdate = async (program, newStatus) => {
    const loadingToast = toast.loading(`Updating status to ${newStatus}...`);
    
    try {
      const { error } = await supabase
        .from("programs")
        .update({ program_status: newStatus })
        .eq("id", program.id);
      
      if (error) throw error;
      
      await logActivity({
        action: "UPDATE",
        table: "programs",
        recordId: program.id,
        details: `Updated program status from ${program.program_status} to ${newStatus}`
      });
      
      toast.success(`Status updated to ${newStatus}`, { id: loadingToast });
      fetchPrograms();
      
      if (showViewModal) {
        setSelectedProgram(prev => ({ ...prev, program_status: newStatus }));
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast.error(`Update failed: ${error.message}`, { id: loadingToast });
    }
  };
  
  // Update program
  const handleUpdate = async (formData) => {
    const loadingToast = toast.loading("Updating program...");
    
    try {
      const { error } = await supabase
        .from("programs")
        .update({
          program_name: formData.program_name,
          program_type: formData.program_type,
          program_status: formData.program_status,
          description: formData.description,
          start_date: formData.start_date,
          end_date: formData.end_date,
          allocated_budget: formData.allocated_budget,
          cost_per_beneficiary: formData.cost_per_beneficiary,
          min_age: formData.min_age,
          max_age: formData.max_age,
          gender: formData.gender,
          residency: formData.residency,
          require_id: formData.require_id,
          require_school_id: formData.require_school_id
        })
        .eq("id", formData.id);
      
      if (error) throw error;
      
      await logActivity({
        action: "UPDATE",
        table: "programs",
        recordId: formData.id,
        details: `Updated program: ${formData.program_name}`
      });
      
      toast.success("Program updated successfully", { id: loadingToast });
      setShowEditModal(false);
      fetchPrograms();
      
      if (showViewModal && selectedProgram?.id === formData.id) {
        setSelectedProgram(prev => ({ ...prev, ...formData }));
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
    setTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };
  
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  
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
        <button className="page-btn" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
          Previous
        </button>
        {pages}
        <button className="page-btn" onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
          Next
        </button>
      </div>
    );
  };
  
  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);
  
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (typeFilter || statusFilter) setPage(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [typeFilter, statusFilter]);
  
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  
  useEffect(() => {
    document.body.style.overflow = (showViewModal || showEditModal || showDeleteModal) ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [showViewModal, showEditModal, showDeleteModal]);
  
  // View Modal Component
  const ViewModal = () => {
    if (!showViewModal || !selectedProgram) return null;
    
    const totalBeneficiaries = selectedProgram.allocated_budget && selectedProgram.cost_per_beneficiary
      ? Math.floor(selectedProgram.allocated_budget / selectedProgram.cost_per_beneficiary)
      : 0;
    
    return (
      <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
        <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Program Details</h2>
            <button className="modal-close" onClick={() => setShowViewModal(false)}><FaTimes /></button>
          </div>
          
          <div className="program-header">
            <div className="program-title">
              <h3>{selectedProgram.program_name}</h3>
              <p className="program-id">ID: {selectedProgram.program_id || `PRG-${String(selectedProgram.id).padStart(4, '0')}`}</p>
            </div>
            {getStatusBadge(selectedProgram.program_status)}
          </div>
          
          <div className="program-stats">
            <div className="stat-card">
              <FaMoneyBillWave />
              <div>
                <span className="stat-value">{formatCurrency(selectedProgram.allocated_budget)}</span>
                <span className="stat-label">Total Budget</span>
              </div>
            </div>
            <div className="stat-card">
              <FaUsers />
              <div>
                <span className="stat-value">{totalBeneficiaries}</span>
                <span className="stat-label">Est. Beneficiaries</span>
              </div>
            </div>
            <div className="stat-card">
              <FaCalendarAlt />
              <div>
                <span className="stat-value">{formatDate(selectedProgram.start_date)}</span>
                <span className="stat-label">Start Date</span>
              </div>
            </div>
            <div className="stat-card">
              <FaTag />
              <div>
                <span className="stat-value">{selectedProgram.program_type || "-"}</span>
                <span className="stat-label">Program Type</span>
              </div>
            </div>
          </div>
          
          <div className="program-details">
            <div className="detail-section">
              <h4>Description</h4>
              <p>{selectedProgram.description || "No description provided."}</p>
            </div>
            
            <div className="detail-section">
              <h4>Eligibility Requirements</h4>
              <div className="eligibility-grid">
                <div><strong>Age Range:</strong> {selectedProgram.min_age || "Any"} - {selectedProgram.max_age || "Any"}</div>
                <div><strong>Gender:</strong> {selectedProgram.gender || "All Genders"}</div>
                <div><strong>Residency:</strong> {selectedProgram.residency || "No Restriction"}</div>
                <div><strong>ID Required:</strong> {selectedProgram.require_id ? "Yes" : "No"}</div>
                <div><strong>School ID Required:</strong> {selectedProgram.require_school_id ? "Yes" : "No"}</div>
              </div>
            </div>
            
            <div className="detail-section">
              <h4>Budget Breakdown</h4>
              <div className="budget-breakdown">
                <div><strong>Allocated Budget:</strong> {formatCurrency(selectedProgram.allocated_budget)}</div>
                <div><strong>Cost per Beneficiary:</strong> {formatCurrency(selectedProgram.cost_per_beneficiary)}</div>
                <div><strong>Estimated Beneficiaries:</strong> {totalBeneficiaries}</div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <div className="status-actions">
              {selectedProgram.program_status === "Draft" && (
                <button className="btn btn-accent" onClick={() => handleStatusUpdate(selectedProgram, "Upcoming")}>
                  <FaClock /> Publish as Upcoming
                </button>
              )}
              {selectedProgram.program_status === "Upcoming" && (
                <button className="btn btn-primary" onClick={() => handleStatusUpdate(selectedProgram, "Active")}>
                  <FaCheckCircle /> Start Program
                </button>
              )}
              {selectedProgram.program_status === "Active" && (
                <button className="btn" onClick={() => handleStatusUpdate(selectedProgram, "Completed")}>
                  <FaArchive /> Mark as Completed
                </button>
              )}
            </div>
            <div className="action-buttons">
              <button className="btn" onClick={() => setShowViewModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => {
                setShowViewModal(false);
                setSelectedProgram(selectedProgram);
                setShowEditModal(true);
              }}>Edit Program</button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Edit Modal Component
  const EditModal = () => {
    const [formData, setFormData] = useState({
      id: null,
      program_name: "",
      program_type: "",
      program_status: "",
      description: "",
      start_date: "",
      end_date: "",
      allocated_budget: "",
      cost_per_beneficiary: "",
      min_age: "",
      max_age: "",
      gender: "",
      residency: "",
      require_id: false,
      require_school_id: false
    });
    
    useEffect(() => {
      if (selectedProgram) {
        setFormData({
          id: selectedProgram.id,
          program_name: selectedProgram.program_name || "",
          program_type: selectedProgram.program_type || "",
          program_status: selectedProgram.program_status || "",
          description: selectedProgram.description || "",
          start_date: selectedProgram.start_date || "",
          end_date: selectedProgram.end_date || "",
          allocated_budget: selectedProgram.allocated_budget || "",
          cost_per_beneficiary: selectedProgram.cost_per_beneficiary || "",
          min_age: selectedProgram.min_age || "",
          max_age: selectedProgram.max_age || "",
          gender: selectedProgram.gender || "",
          residency: selectedProgram.residency || "",
          require_id: selectedProgram.require_id || false,
          require_school_id: selectedProgram.require_school_id || false
        });
      }
    }, [selectedProgram]);
    
    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value
      }));
    };
    
    const handleSubmit = (e) => {
      e.preventDefault();
      handleUpdate(formData);
    };
    
    if (!showEditModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
        <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit Program</h2>
            <button className="modal-close" onClick={() => setShowEditModal(false)}><FaTimes /></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Program Name <span className="req">*</span></label>
              <input className="input" name="program_name" value={formData.program_name} onChange={handleChange} required />
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label>Program Type</label>
                <select className="input" name="program_type" value={formData.program_type} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>Seminar</option>
                  <option>Training</option>
                  <option>Sports</option>
                  <option>Financial Aid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Program Status</label>
                <select className="input" name="program_status" value={formData.program_status} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>Draft</option>
                  <option>Upcoming</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea className="input" name="description" value={formData.description} onChange={handleChange} rows="3" />
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label>Start Date</label>
                <input className="input" type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input className="input" type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label>Allocated Budget</label>
                <input className="input" type="number" name="allocated_budget" value={formData.allocated_budget} onChange={handleChange} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Cost per Beneficiary</label>
                <input className="input" type="number" name="cost_per_beneficiary" value={formData.cost_per_beneficiary} onChange={handleChange} placeholder="0" />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label>Minimum Age</label>
                <input className="input" type="number" name="min_age" value={formData.min_age} onChange={handleChange} placeholder="e.g., 15" />
              </div>
              <div className="form-group">
                <label>Maximum Age</label>
                <input className="input" type="number" name="max_age" value={formData.max_age} onChange={handleChange} placeholder="e.g., 30" />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label>Gender Restriction</label>
                <select className="input" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">All Genders</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Residency Requirement</label>
                <select className="input" name="residency" value={formData.residency} onChange={handleChange}>
                  <option value="">No Restriction</option>
                  <option>Barangay Pinagkaisahan</option>
                  <option>Within City</option>
                </select>
              </div>
            </div>
            
            <div className="checkbox-group">
              <label className="checkbox-row">
                <input type="checkbox" name="require_id" checked={formData.require_id} onChange={handleChange} />
                <span>Require ID Verification</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" name="require_school_id" checked={formData.require_school_id} onChange={handleChange} />
                <span>Require School ID</span>
              </label>
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Delete Modal Component
  const DeleteModal = () => {
    if (!showDeleteModal || !selectedProgram) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
        <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Delete Program</h2>
            <button className="modal-close" onClick={() => setShowDeleteModal(false)}><FaTimes /></button>
          </div>
          
          <div className="delete-warning">
            <FaTrash />
            <p>Are you sure you want to delete <strong>{selectedProgram.program_name}</strong>?</p>
            <small>This action cannot be undone. All program data will be permanently removed.</small>
          </div>
          
          <div className="modal-actions delete-modal-actions">
            <button type="button" className="btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete Program</button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      <Navbar />
      <Toaster position="top-center" />
      
      <div className="manage-programs-container">
        {/* Header */}
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <div className="header-text">
            <h2>Manage Programs</h2>
            <p>View, edit, and manage all SK programs</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/create-programs")}>
            <FaPlus /> Create New Program
          </button>
        </div>
        
        {/* Filters */}
        <div className="filter-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              className="input"
              placeholder="Search by program name or ID..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
            />
            <button type="button" className="btn btn-accent" onClick={handleSearch}>Search</button>
          </div>
          
          <select className="input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option>Seminar</option>
            <option>Training</option>
            <option>Sports</option>
            <option>Financial Aid</option>
          </select>
          
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option>Draft</option>
            <option>Upcoming</option>
            <option>Active</option>
            <option>Completed</option>
          </select>
          
          <button className="btn" onClick={handleClearFilters}>Clear Filters</button>
        </div>
        
        {/* Record bar */}
        <div className="record-bar">
          <div className="record-info">
            <span className="record-count">{totalCount}</span>
            <span>programs found</span>
          </div>
        </div>
        
        {/* Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="loading-state"><div className="spinner"></div><p>Loading programs...</p></div>
          ) : programs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No programs found</h3>
              <p>Click "Create New Program" to add your first program</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="programs-table">
                <thead>
                  <tr>
                    <th>Program ID</th>
                    <th>Program Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>Budget</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(program => (
                    <tr key={program.id}>
                      <td className="id-cell">
                        {program.program_id || `PRG-${String(program.id).padStart(4, '0')}`}
                      </td>
                      <td className="name-cell">
                        <div className="program-name">{program.program_name}</div>
                      </td>
                      <td className="type-cell">{program.program_type || "-"}</td>
                      <td className="status-cell">{getStatusBadge(program.program_status)}</td>
                      <td className="date-cell">{formatDate(program.start_date)}</td>
                      <td className="budget-cell">{formatCurrency(program.allocated_budget)}</td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn view" 
                          onClick={() => {
                            setSelectedProgram(program);
                            setShowViewModal(true);
                          }}
                        >
                          <FaEye />
                        </button>
                        <button 
                          className="action-btn edit" 
                          onClick={() => {
                            setSelectedProgram(program);
                            setShowEditModal(true);
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => {
                            setSelectedProgram(program);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FaTrash />
                        </button>
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
      <EditModal />
      <DeleteModal />
    </>
  );
} // ✅ IMPORTANT: This closing brace was missing