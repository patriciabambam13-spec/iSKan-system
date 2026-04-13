import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import Navbar from "../components/Navbar";
import { 
  FaSearch, FaFilter, FaPlus, FaEye, FaCheckCircle, 
  FaClock, FaCalendarAlt, FaMapMarkerAlt, FaUser, 
  FaArrowLeft, FaSpinner, FaExclamationTriangle,
  FaDollarSign, FaUsers, FaVenusMars, FaIdCard,
  FaSort, FaSortUp, FaSortDown, FaTimes
} from "react-icons/fa";
import "../styles/viewprograms.css";

export default function ViewPrograms() {
  const navigate = useNavigate();
  
  // State management
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("start_date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Form state for adding program - MATCHES YOUR DATABASE
  const [newProgram, setNewProgram] = useState({
    program_name: "",
    program_type: "",
    description: "",
    start_date: "",
    end_date: "",
    allocated_budget: "",
    cost_per_beneficiary: "",
    estimated_beneficiaries: "",
    min_age: "",
    max_age: "",
    gender: "all",
    residency: "",
    require_id: false,
    require_school_id: false
  });

  // ========== AUTHENTICATION CHECK ==========
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        const { data: userData, error } = await supabase
          .from("users")
          .select("role_id, first_name, last_name")
          .eq("user_id", user.id)
          .single();

        if (error || !userData) {
          navigate("/");
          return;
        }

        // Check if SK Kagawad (role_id 2) or Admin (role_id 1)
        if (userData.role_id !== 1 && userData.role_id !== 2) {
          navigate("/");
          return;
        }

        setUserRole(userData.role_id);
        setIsAuthorized(true);
        fetchPrograms();
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/");
      }
    };

    checkAccess();
  }, [navigate]);

  // ========== FETCH PROGRAMS - MATCHES YOUR DB SCHEMA ==========
  const fetchPrograms = async () => {
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;

      // Map database columns to frontend-friendly format
      const formattedPrograms = data.map(program => ({
        id: program.id,
        program_id: program.program_id,
        name: program.program_name,
        type: program.program_type,
        description: program.description,
        start_date: program.start_date,
        end_date: program.end_date,
        status: program.program_status || "upcoming",
        allocated_budget: program.allocated_budget,
        cost_per_beneficiary: program.cost_per_beneficiary,
        estimated_beneficiaries: program.estimated_beneficiaries,
        min_age: program.min_age,
        max_age: program.max_age,
        gender: program.gender,
        residency: program.residency,
        require_id: program.require_id,
        require_school_id: program.require_school_id,
        created_at: program.created_at
      }));

      setPrograms(formattedPrograms);
      applyFiltersAndSort(formattedPrograms, searchTerm, statusFilter, sortBy, sortOrder);
    } catch (error) {
      console.error("Error fetching programs:", error);
      setErrorMessage("Failed to load programs. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  // ========== APPLY FILTERS AND SORT ==========
  const applyFiltersAndSort = (programsList, search, status, sort, order) => {
    let filtered = [...programsList];
    
    // Apply status filter
    if (status !== "all") {
      filtered = filtered.filter(p => p.status === status);
    }
    
    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.type?.toLowerCase().includes(search.toLowerCase()) ||
        p.residency?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      switch(sort) {
        case "name":
          valueA = a.name || "";
          valueB = b.name || "";
          break;
        case "start_date":
          valueA = a.start_date || "";
          valueB = b.start_date || "";
          break;
        case "status":
          { const statusOrder = { "upcoming": 1, "ongoing": 2, "completed": 3 };
          valueA = statusOrder[a.status] || 0;
          valueB = statusOrder[b.status] || 0;
          break; }
        case "budget":
          valueA = a.allocated_budget || 0;
          valueB = b.allocated_budget || 0;
          break;
        case "beneficiaries":
          valueA = a.estimated_beneficiaries || 0;
          valueB = b.estimated_beneficiaries || 0;
          break;
        default:
          valueA = a.start_date || "";
          valueB = b.start_date || "";
      }
      
      if (order === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredPrograms(filtered);
  };

  // Handle search input
  useEffect(() => {
    applyFiltersAndSort(programs, searchTerm, statusFilter, sortBy, sortOrder);
  }, [searchTerm, statusFilter, sortBy, sortOrder, programs]);

  // ========== CLEAR ALL FILTERS ==========
  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("start_date");
    setSortOrder("asc");
    setErrorMessage("");
  };

  // ========== HANDLE SORT CHANGE ==========
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  // ========== ADD NEW PROGRAM - MATCHES YOUR DB ==========
  const handleAddProgram = async (e) => {
    e.preventDefault();
    
    if (!newProgram.program_name || !newProgram.start_date) {
      setErrorMessage("Please fill in program name and start date");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generate program_id
      const programId = `PROG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const { error } = await supabase
        .from("programs")
        .insert([{
          program_id: programId,
          program_name: newProgram.program_name,
          program_type: newProgram.program_type || null,
          description: newProgram.description || null,
          start_date: newProgram.start_date,
          end_date: newProgram.end_date || newProgram.start_date,
          allocated_budget: newProgram.allocated_budget ? parseFloat(newProgram.allocated_budget) : null,
          cost_per_beneficiary: newProgram.cost_per_beneficiary ? parseFloat(newProgram.cost_per_beneficiary) : null,
          estimated_beneficiaries: newProgram.estimated_beneficiaries ? parseInt(newProgram.estimated_beneficiaries) : null,
          min_age: newProgram.min_age ? parseInt(newProgram.min_age) : null,
          max_age: newProgram.max_age ? parseInt(newProgram.max_age) : null,
          gender: newProgram.gender || "all",
          residency: newProgram.residency || null,
          require_id: newProgram.require_id,
          require_school_id: newProgram.require_school_id,
          program_status: "upcoming",
          status: "active"
        }]);

      if (error) throw error;
      
      // Reset form and refresh programs
      setNewProgram({
        program_name: "",
        program_type: "",
        description: "",
        start_date: "",
        end_date: "",
        allocated_budget: "",
        cost_per_beneficiary: "",
        estimated_beneficiaries: "",
        min_age: "",
        max_age: "",
        gender: "all",
        residency: "",
        require_id: false,
        require_school_id: false
      });
      setShowAddModal(false);
      await fetchPrograms();
      
    } catch (error) {
      console.error("Error adding program:", error);
      setErrorMessage("Failed to add program. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ========== UPDATE PROGRAM STATUS ==========
  const updateProgramStatus = async (programId, newStatus) => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from("programs")
        .update({ program_status: newStatus })
        .eq("id", programId);

      if (error) throw error;
      
      await fetchPrograms();
      
    } catch (error) {
      console.error("Error updating status:", error);
      setErrorMessage("Failed to update program status.");
    } finally {
      setIsLoading(false);
    }
  };

  // ========== GET STATUS STYLES ==========
  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
      case "upcoming":
        return { class: "status-upcoming", icon: <FaClock />, text: "Upcoming" };
      case "ongoing":
        return { class: "status-ongoing", icon: <FaSpinner />, text: "Ongoing" };
      case "completed":
        return { class: "status-completed", icon: <FaCheckCircle />, text: "Completed" };
      default:
        return { class: "status-upcoming", icon: <FaClock />, text: "Upcoming" };
    }
  };

  // ========== GET TODAY'S PROGRAMS ==========
  const getTodayPrograms = () => {
    const today = new Date().toISOString().split('T')[0];
    return programs.filter(p => p.start_date === today && p.status !== "completed");
  };

  // ========== GET SORT ICON ==========
  const getSortIcon = (column) => {
    if (sortBy !== column) return <FaSort />;
    return sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  if (!isAuthorized) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Verifying access...</p>
      </div>
    );
  }

  const todayPrograms = getTodayPrograms();
  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || sortBy !== "start_date" || sortOrder !== "asc";

  return (
    <>
     <Navbar />
<div className="programs-page">
  <div className="programs-container">
    {/* Header */}
    <div className="page-header">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <div className="header-text">
        <h2>Programs Overview</h2>
        <p>View and manage SK programs</p>
      </div>
    </div>

          {/* Today's Programs Banner */}
          {todayPrograms.length > 0 && (
            <div className="today-tasks-banner">
              <div className="banner-icon">
                <FaExclamationTriangle />
              </div>
              <div className="banner-content">
                <h3>📅 Programs Happening Today</h3>
                <ul>
                  {todayPrograms.map((program, idx) => (
                    <li key={idx}>
                      <strong>{program.name}</strong> - {program.residency || "Barangay"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="error-message">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage("")}>Dismiss</button>
            </div>
          )}

          {/* Controls */}
          <div className="controls">
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm("")}>
                  <FaTimes />
                </button>
              )}
            </div>
            
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Programs</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="sort-group">
              <FaSort className="sort-icon" />
              <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
                <option value="start_date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by Status</option>
                <option value="budget">Sort by Budget</option>
                <option value="beneficiaries">Sort by Beneficiaries</option>
              </select>
              <button 
                className="sort-order-btn"
                onClick={() => handleSortChange(sortBy)}
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
              >
                {getSortIcon(sortBy)}
              </button>
            </div>

            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                <FaTimes /> Clear Filters
              </button>
            )}

            {(userRole === 1) && (
              <button className="add-btn" onClick={() => setShowAddModal(true)}>
                <FaPlus /> Add Program
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="results-count">
            Showing {filteredPrograms.length} of {programs.length} programs
          </div>

          {/* Programs Grid */}
          {isLoading ? (
            <div className="loading-state">
              <FaSpinner className="spinner" />
              <p>Loading programs...</p>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="empty-state">
              <p>No programs found</p>
              <button onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="programs-grid">
              {filteredPrograms.map((program) => {
                const statusStyle = getStatusStyle(program.status);
                return (
                  <div className="program-card" key={program.id}>
                    <div className="card-header">
                      <h3>{program.name}</h3>
                      <span className={`status-badge ${statusStyle.class}`}>
                        {statusStyle.icon} {statusStyle.text}
                      </span>
                    </div>
                    
                    {program.type && (
                      <div className="program-type-badge">
                        {program.type}
                      </div>
                    )}
                    
                    <p className="program-description">
                      {program.description || "No description provided"}
                    </p>
                    
                    <div className="program-details">
                      <div className="detail-item">
                        <FaCalendarAlt />
                        <span>
                          {program.start_date && new Date(program.start_date).toLocaleDateString()}
                          {program.end_date && program.end_date !== program.start_date && 
                            ` - ${new Date(program.end_date).toLocaleDateString()}`
                          }
                        </span>
                      </div>
                      
                      {program.residency && (
                        <div className="detail-item">
                          <FaMapMarkerAlt />
                          <span>{program.residency}</span>
                        </div>
                      )}
                      
                      {program.allocated_budget && (
                        <div className="detail-item">
                          <FaDollarSign />
                          <span>₱{parseFloat(program.allocated_budget).toLocaleString()}</span>
                        </div>
                      )}
                      
                      {program.estimated_beneficiaries && (
                        <div className="detail-item">
                          <FaUsers />
                          <span>{program.estimated_beneficiaries} beneficiaries</span>
                        </div>
                      )}
                      
                      {(program.min_age || program.max_age) && (
                        <div className="detail-item">
                          <FaUser />
                          <span>Ages {program.min_age || 0}-{program.max_age || 99}</span>
                        </div>
                      )}
                      
                      {program.gender && program.gender !== "all" && (
                        <div className="detail-item">
                          <FaVenusMars />
                          <span>{program.gender === "male" ? "Male Only" : "Female Only"}</span>
                        </div>
                      )}
                      
                      {(program.require_id || program.require_school_id) && (
                        <div className="detail-item">
                          <FaIdCard />
                          <span>
                            {program.require_id && "Valid ID "}
                            {program.require_school_id && "School ID"}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="card-actions">
                      <button 
                        className="view-btn"
                        onClick={() => {
                          setSelectedProgram(program);
                          setShowDetailsModal(true);
                        }}
                      >
                        <FaEye /> View Details
                      </button>
                      
                      {program.status !== "completed" && userRole === 1 && (
                        <button 
                          className="complete-btn"
                          onClick={() => updateProgramStatus(program.id, "completed")}
                        >
                          <FaCheckCircle /> Mark Complete
                        </button>
                      )}
                      
                      {program.status === "upcoming" && userRole === 1 && (
                        <button 
                          className="start-btn"
                          onClick={() => updateProgramStatus(program.id, "ongoing")}
                        >
                          Start Program
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Program Modal - MATCHES YOUR DB SCHEMA */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Program</h3>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
              </div>
              
              <form onSubmit={handleAddProgram}>
                <div className="form-group">
                  <label>Program Name *</label>
                  <input
                    type="text"
                    required
                    value={newProgram.program_name}
                    onChange={(e) => setNewProgram({...newProgram, program_name: e.target.value})}
                    placeholder="e.g., Youth Leadership Summit"
                  />
                </div>
                
                <div className="form-group">
                  <label>Program Type</label>
                  <input
                    type="text"
                    value={newProgram.program_type}
                    onChange={(e) => setNewProgram({...newProgram, program_type: e.target.value})}
                    placeholder="e.g., Seminar, Sports, Workshop"
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows="3"
                    value={newProgram.description}
                    onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                    placeholder="Describe the program objectives and activities"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      required
                      value={newProgram.start_date}
                      onChange={(e) => setNewProgram({...newProgram, start_date: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={newProgram.end_date}
                      onChange={(e) => setNewProgram({...newProgram, end_date: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Allocated Budget (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProgram.allocated_budget}
                      onChange={(e) => setNewProgram({...newProgram, allocated_budget: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Cost per Beneficiary (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProgram.cost_per_beneficiary}
                      onChange={(e) => setNewProgram({...newProgram, cost_per_beneficiary: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Estimated Beneficiaries</label>
                    <input
                      type="number"
                      value={newProgram.estimated_beneficiaries}
                      onChange={(e) => setNewProgram({...newProgram, estimated_beneficiaries: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Location/Residency</label>
                    <input
                      type="text"
                      value={newProgram.residency}
                      onChange={(e) => setNewProgram({...newProgram, residency: e.target.value})}
                      placeholder="e.g., Barangay Hall"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Minimum Age</label>
                    <input
                      type="number"
                      value={newProgram.min_age}
                      onChange={(e) => setNewProgram({...newProgram, min_age: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Maximum Age</label>
                    <input
                      type="number"
                      value={newProgram.max_age}
                      onChange={(e) => setNewProgram({...newProgram, max_age: e.target.value})}
                      placeholder="99"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Gender Restriction</label>
                  <select
                    value={newProgram.gender}
                    onChange={(e) => setNewProgram({...newProgram, gender: e.target.value})}
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male Only</option>
                    <option value="female">Female Only</option>
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={newProgram.require_id}
                        onChange={(e) => setNewProgram({...newProgram, require_id: e.target.checked})}
                      />
                      Require Valid ID
                    </label>
                  </div>
                  
                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={newProgram.require_school_id}
                        onChange={(e) => setNewProgram({...newProgram, require_school_id: e.target.checked})}
                      />
                      Require School ID
                    </label>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" disabled={isLoading}>
                    {isLoading ? <FaSpinner className="spinner-small" /> : "Add Program"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Program Details Modal */}
        {showDetailsModal && selectedProgram && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedProgram.name}</h3>
                <button className="close-btn" onClick={() => setShowDetailsModal(false)}>&times;</button>
              </div>
              
              <div className="program-details-modal">
                <div className="details-section">
                  <h4>Program Information</h4>
                  <p><strong>Program ID:</strong> {selectedProgram.program_id || "N/A"}</p>
                  <p><strong>Type:</strong> {selectedProgram.type || "N/A"}</p>
                  <p><strong>Start Date:</strong> {selectedProgram.start_date && new Date(selectedProgram.start_date).toLocaleDateString()}</p>
                  <p><strong>End Date:</strong> {selectedProgram.end_date && new Date(selectedProgram.end_date).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {selectedProgram.residency || "Barangay"}</p>
                  <p><strong>Status:</strong> {selectedProgram.status}</p>
                  <p><strong>Description:</strong> {selectedProgram.description || "No description provided"}</p>
                </div>
                
                <div className="details-section">
                  <h4>Budget & Beneficiaries</h4>
                  <p><strong>Allocated Budget:</strong> ₱{selectedProgram.allocated_budget ? parseFloat(selectedProgram.allocated_budget).toLocaleString() : "0"}</p>
                  <p><strong>Cost per Beneficiary:</strong> ₱{selectedProgram.cost_per_beneficiary ? parseFloat(selectedProgram.cost_per_beneficiary).toLocaleString() : "0"}</p>
                  <p><strong>Estimated Beneficiaries:</strong> {selectedProgram.estimated_beneficiaries || "0"}</p>
                </div>
                
                <div className="details-section">
                  <h4>Requirements</h4>
                  <p><strong>Age Range:</strong> {selectedProgram.min_age || 0} - {selectedProgram.max_age || 99} years old</p>
                  <p><strong>Gender:</strong> {selectedProgram.gender === "all" ? "All Genders" : selectedProgram.gender === "male" ? "Male Only" : "Female Only"}</p>
                  <p><strong>Valid ID Required:</strong> {selectedProgram.require_id ? "Yes" : "No"}</p>
                  <p><strong>School ID Required:</strong> {selectedProgram.require_school_id ? "Yes" : "No"}</p>
                </div>
              </div>
              
              <div className="modal-footer">
                <button onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}