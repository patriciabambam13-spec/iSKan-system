import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import { 
  FaArrowLeft, FaSpinner, FaCheckCircle, FaTimesCircle, 
  FaClock, FaToolbox, FaPrint, FaUser, FaCalendarAlt, 
  FaBoxes, FaFileAlt, FaCopy, FaRuler, FaFilter, FaSearch,
  FaEye, FaHourglassHalf, FaUndo, FaPlus, FaUsers
} from "react-icons/fa";
import "../styles/transaction.css";

export default function Transaction() {
  const navigate = useNavigate();
  
  // State management
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Create Transaction Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("borrow");
  const [youthList, setYouthList] = useState([]);
  const [selectedYouthId, setSelectedYouthId] = useState("");
  const [searchYouth, setSearchYouth] = useState("");
  
  // Borrow Form State
  const [borrowData, setBorrowData] = useState({
    item: "",
    quantity: 1,
    return_date: ""
  });
  
  // Print Form State
  const [printData, setPrintData] = useState({
    document: "",
    copies: 1,
    paper_size: "A4"
  });

  // ========== AUTHENTICATION CHECK - KAGAWAD ONLY ==========
  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true);
      setErrorMessage("");
      
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("No user found:", userError);
          setErrorMessage("Please login to continue");
          setTimeout(() => navigate("/"), 2000);
          return;
        }

        setUser(user);
        console.log("✅ Auth User ID:", user.id);

        const { data: userData, error: roleError } = await supabase
          .from("users")
          .select("role_id, first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Error fetching role:", roleError);
          setErrorMessage("Database error. Please try again.");
          return;
        }

        if (!userData) {
          console.error("No user record found for user_id:", user.id);
          setErrorMessage("User record not found. Please contact admin.");
          return;
        }

        console.log("✅ User role_id:", userData.role_id);

        if (userData.role_id !== 1 && userData.role_id !== 2) {
          console.error("❌ Unauthorized role:", userData.role_id);
          setErrorMessage("Access denied. SK Kagawad privileges required.");
          return;
        }

        setIsAuthorized(true);
        await fetchTransactions();
        await fetchYouthList();

      } catch (error) {
        console.error("❌ Auth error:", error);
        setErrorMessage("Authentication error. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  // ========== FETCH ALL TRANSACTIONS ==========
  const fetchTransactions = async () => {
    try {
      console.log("📦 Fetching transactions from 'transaction' table...");
      
      const { data, error } = await supabase
        .from("transaction")
        .select(`
          *,
          youth:youth_id(id, first_name, last_name, barangay)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching transactions:", error);
        setErrorMessage("Failed to load transactions: " + error.message);
        return;
      }

      console.log(`✅ Loaded ${data?.length || 0} transactions`);

      const formattedTransactions = data?.map(tx => ({
        ...tx,
        youth_name: tx.youth ? `${tx.youth.first_name} ${tx.youth.last_name}` : "Unknown",
        youth_barangay: tx.youth?.barangay || "N/A",
        created_at_formatted: format(new Date(tx.created_at), "MMM dd, yyyy hh:mm a")
      })) || [];

      setTransactions(formattedTransactions);
      applyFilters(formattedTransactions, searchTerm, statusFilter, typeFilter);
    } catch (error) {
      console.error("❌ Unexpected error:", error);
      setErrorMessage("Failed to load transactions. Please refresh the page.");
    }
  };

  // ========== FETCH YOUTH LIST FOR CREATE MODAL ==========
  const fetchYouthList = async () => {
    try {
      const { data, error } = await supabase
        .from("youth")
        .select("id, first_name, last_name, barangay")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setYouthList(data || []);
    } catch (error) {
      console.error("Error fetching youth list:", error);
    }
  };

  // ========== APPLY FILTERS ==========
  const applyFilters = (transactionsList, search, status, type) => {
    let filtered = [...transactionsList];
    
    if (status !== "all") {
      filtered = filtered.filter(t => 
        t.transaction_status?.toLowerCase() === status.toLowerCase()
      );
    }
    
    if (type !== "all") {
      filtered = filtered.filter(t => t.service_type === type);
    }
    
    if (search.trim()) {
      filtered = filtered.filter(t => 
        t.youth_name?.toLowerCase().includes(search.toLowerCase()) ||
        t.item?.toLowerCase().includes(search.toLowerCase()) ||
        t.document?.toLowerCase().includes(search.toLowerCase()) ||
        t.remarks?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredTransactions(filtered);
  };

  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters(transactions, searchTerm, statusFilter, typeFilter);
    }
  }, [searchTerm, statusFilter, typeFilter, transactions]);

  // ========== CREATE NEW TRANSACTION ==========
  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    
    if (!selectedYouthId) {
      setErrorMessage("Please select a youth");
      return;
    }
    
    setActionLoading(true);
    
    try {
      let transactionData = {
        youth_id: parseInt(selectedYouthId),
        type: "Service",
        service_type: createType,
        transaction_status: "Pending",
        created_at: new Date().toISOString()
      };
      
      if (createType === "borrow") {
        if (!borrowData.item) {
          setErrorMessage("Please enter item name");
          return;
        }
        transactionData = {
          ...transactionData,
          item: borrowData.item,
          quantity: parseInt(borrowData.quantity),
          return_date: borrowData.return_date
        };
      } else {
        if (!printData.document) {
          setErrorMessage("Please enter document name");
          return;
        }
        transactionData = {
          ...transactionData,
          document: printData.document,
          copies: parseInt(printData.copies),
          paper_size: printData.paper_size
        };
      }
      
      const { error } = await supabase
        .from("transaction")
        .insert([transactionData]);
        
      if (error) throw error;
      
      setSuccessMessage("Transaction created successfully!");
      setShowCreateModal(false);
      resetCreateForm();
      await fetchTransactions();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error creating transaction:", error);
      setErrorMessage("Failed to create transaction.");
    } finally {
      setActionLoading(false);
    }
  };
  
  // ========== RESET CREATE FORM ==========
  const resetCreateForm = () => {
    setSelectedYouthId("");
    setSearchYouth("");
    setBorrowData({ item: "", quantity: 1, return_date: "" });
    setPrintData({ document: "", copies: 1, paper_size: "A4" });
    setCreateType("borrow");
  };

  // ========== UPDATE TRANSACTION STATUS - FIXED ==========
  const updateTransactionStatus = async (id, newStatus, reason = null) => {
    if (actionLoading) return;
    
    setActionLoading(true);
    
    try {
      // ✅ FIXED: Using 'transaction_status' column (NOT 'status')
      const updateData = { 
        transaction_status: newStatus,  // ← This is the correct column name
        processed_at: new Date().toISOString()
      };
      
      if (user) {
        updateData.processed_by = user.id;
      }
      
      if (reason) {
        updateData.remarks = reason;
      }
      
      console.log(`Updating transaction ${id} to status: ${newStatus}`);
      
      const { error } = await supabase
        .from("transaction")
        .update(updateData)
        .eq("id", id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      setSuccessMessage(`Transaction ${newStatus.toLowerCase()} successfully!`);
      await fetchTransactions();
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating status:", error);
      setErrorMessage(`Failed to update transaction status: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ========== CLEAR FILTERS ==========
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  // ========== GET STATUS STYLES ==========
  const getStatusStyle = (status) => {
    const statusLower = status?.toLowerCase();
    switch(statusLower) {
      case "pending":
        return { class: "status-pending", icon: <FaHourglassHalf />, text: "Pending" };
      case "approved":
        return { class: "status-approved", icon: <FaCheckCircle />, text: "Approved" };
      case "rejected":
        return { class: "status-rejected", icon: <FaTimesCircle />, text: "Rejected" };
      case "released":
        return { class: "status-released", icon: <FaCheckCircle />, text: "Released" };
      case "returned":
        return { class: "status-returned", icon: <FaUndo />, text: "Returned" };
      default:
        return { class: "status-pending", icon: <FaClock />, text: status || "Pending" };
    }
  };

  const getServiceIcon = (serviceType) => {
    return serviceType === "borrow" ? <FaToolbox /> : <FaPrint />;
  };

  const getServiceLabel = (serviceType) => {
    return serviceType === "borrow" ? "Equipment Borrowing" : "Printing Service";
  };

  const canActOnTransaction = (status) => {
    return status?.toLowerCase() === "pending";
  };

  // Filter youth list based on search
  const filteredYouth = youthList.filter(youth => 
    `${youth.first_name} ${youth.last_name}`.toLowerCase().includes(searchYouth.toLowerCase()) ||
    youth.barangay?.toLowerCase().includes(searchYouth.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>{errorMessage || "Access denied..."}</p>
      </div>
    );
  }

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || typeFilter !== "all";

  return (
    <>
      <Navbar />
      <div className="transaction-page">
        <div className="transaction-container">
          {/* Header */}
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft />
            </button>
            <div className="header-text">
              <h2>Transaction Management</h2>
              <p>Manage and process youth service requests</p>
            </div>
            <button className="create-transaction-btn" onClick={() => setShowCreateModal(true)}>
              <FaPlus /> New Transaction
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="success-message">
              <FaCheckCircle />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="error-message">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage("")}>Dismiss</button>
            </div>
          )}

          {/* Stats Summary */}
          <div className="stats-summary">
            <div className="stat-box">
              <div className="stat-value">{transactions.filter(t => t.transaction_status === "Pending").length}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{transactions.filter(t => t.service_type === "borrow").length}</div>
              <div className="stat-label">Borrow Requests</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{transactions.filter(t => t.service_type === "print").length}</div>
              <div className="stat-label">Print Requests</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{transactions.length}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by youth name, item, or document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="released">Released</option>
                <option value="returned">Returned</option>
              </select>
            </div>

            <div className="filter-group">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="borrow">Equipment Borrowing</option>
                <option value="print">Printing Service</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="results-count">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions found</p>
              <button onClick={clearFilters}>Clear Filters</button>
            </div>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map((tx) => {
                const statusStyle = getStatusStyle(tx.transaction_status);
                return (
                  <div className={`transaction-card ${tx.transaction_status?.toLowerCase()}`} key={tx.id}>
                    <div className="card-header">
                      <div className="request-type">
                        {getServiceIcon(tx.service_type)}
                        <span className="type-label">{getServiceLabel(tx.service_type)}</span>
                      </div>
                      <span className={`status-badge ${statusStyle.class}`}>
                        {statusStyle.icon} {statusStyle.text}
                      </span>
                    </div>

                    <div className="card-body">
                      <div className="youth-info">
                        <FaUser className="info-icon" />
                        <div>
                          <strong>{tx.youth_name}</strong>
                          <span className="youth-barangay">{tx.youth_barangay}</span>
                        </div>
                      </div>

                      {tx.service_type === "borrow" ? (
                        <div className="request-details">
                          <div className="detail-row">
                            <FaBoxes className="detail-icon" />
                            <span><strong>Item:</strong> {tx.item}</span>
                          </div>
                          <div className="detail-row">
                            <strong>Quantity:</strong> {tx.quantity}
                          </div>
                          <div className="detail-row">
                            <FaCalendarAlt className="detail-icon" />
                            <span><strong>Return Date:</strong> {tx.return_date ? new Date(tx.return_date).toLocaleDateString() : "N/A"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="request-details">
                          <div className="detail-row">
                            <FaFileAlt className="detail-icon" />
                            <span><strong>Document:</strong> {tx.document}</span>
                          </div>
                          <div className="detail-row">
                            <FaCopy className="detail-icon" />
                            <span><strong>Copies:</strong> {tx.copies}</span>
                          </div>
                          <div className="detail-row">
                            <FaRuler className="detail-icon" />
                            <span><strong>Paper Size:</strong> {tx.paper_size}</span>
                          </div>
                        </div>
                      )}

                      {tx.remarks && (
                        <div className="detail-row remarks">
                          <strong>Remarks:</strong> {tx.remarks}
                        </div>
                      )}

                      <div className="detail-row date">
                        <FaClock className="detail-icon" />
                        <span>Submitted: {tx.created_at_formatted}</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button 
                        className="view-btn"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setShowDetailsModal(true);
                        }}
                        disabled={actionLoading}
                      >
                        <FaEye /> View Details
                      </button>

                      {canActOnTransaction(tx.transaction_status) && (
                        <>
                          <button 
                            className="approve-btn"
                            onClick={() => updateTransactionStatus(tx.id, "Approved")}
                            disabled={actionLoading}
                          >
                            <FaCheckCircle /> Approve
                          </button>
                          <button 
                            className="reject-btn"
                            onClick={() => {
                              setSelectedTransactionId(tx.id);
                              setShowRejectModal(true);
                            }}
                            disabled={actionLoading}
                          >
                            <FaTimesCircle /> Reject
                          </button>
                        </>
                      )}

                      {tx.transaction_status === "Approved" && tx.service_type === "borrow" && (
                        <button 
                          className="release-btn"
                          onClick={() => updateTransactionStatus(tx.id, "Released")}
                          disabled={actionLoading}
                        >
                          Mark as Released
                        </button>
                      )}

                      {tx.transaction_status === "Released" && tx.service_type === "borrow" && (
                        <button 
                          className="return-btn"
                          onClick={() => updateTransactionStatus(tx.id, "Returned")}
                          disabled={actionLoading}
                        >
                          <FaUndo /> Mark as Returned
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="dashboard-footer">
            iSKan v1.0 | Barangay Pinagkaisahan | SK Kagawad Transaction Management
          </div>
        </div>
      </div>

      {/* Create Transaction Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Transaction</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleCreateTransaction}>
                {/* Select Youth */}
                <div className="form-group">
                  <label><FaUsers /> Select Youth *</label>
                  <input
                    type="text"
                    placeholder="Search youth by name or barangay..."
                    value={searchYouth}
                    onChange={(e) => setSearchYouth(e.target.value)}
                    className="search-youth-input"
                  />
                  <div className="youth-list-dropdown">
                    {filteredYouth.map(youth => (
                      <div
                        key={youth.id}
                        className={`youth-item ${selectedYouthId === youth.id.toString() ? 'selected' : ''}`}
                        onClick={() => setSelectedYouthId(youth.id.toString())}
                      >
                        <strong>{youth.first_name} {youth.last_name}</strong>
                        <span>{youth.barangay}</span>
                      </div>
                    ))}
                    {filteredYouth.length === 0 && (
                      <p className="no-results">No youth found</p>
                    )}
                  </div>
                  {selectedYouthId && (
                    <div className="selected-youth">
                      Selected: {youthList.find(y => y.id.toString() === selectedYouthId)?.first_name} {youthList.find(y => y.id.toString() === selectedYouthId)?.last_name}
                    </div>
                  )}
                </div>

                {/* Transaction Type Toggle */}
                <div className="form-group">
                  <label>Transaction Type</label>
                  <div className="type-toggle">
                    <button
                      type="button"
                      className={`toggle-btn ${createType === "borrow" ? "active" : ""}`}
                      onClick={() => setCreateType("borrow")}
                    >
                      <FaToolbox /> Borrow Equipment
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${createType === "print" ? "active" : ""}`}
                      onClick={() => setCreateType("print")}
                    >
                      <FaPrint /> Printing Service
                    </button>
                  </div>
                </div>

                {/* Borrow Form */}
                {createType === "borrow" && (
                  <>
                    <div className="form-group">
                      <label><FaBoxes /> Equipment Item *</label>
                      <input
                        type="text"
                        placeholder="e.g., Laptop, Projector, Chairs"
                        value={borrowData.item}
                        onChange={(e) => setBorrowData({...borrowData, item: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          value={borrowData.quantity}
                          onChange={(e) => setBorrowData({...borrowData, quantity: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label><FaCalendarAlt /> Return Date *</label>
                        <input
                          type="date"
                          value={borrowData.return_date}
                          onChange={(e) => setBorrowData({...borrowData, return_date: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Print Form */}
                {createType === "print" && (
                  <>
                    <div className="form-group">
                      <label><FaFileAlt /> Document Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., Project Proposal, ID Copy"
                        value={printData.document}
                        onChange={(e) => setPrintData({...printData, document: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label><FaCopy /> Number of Copies *</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={printData.copies}
                          onChange={(e) => setPrintData({...printData, copies: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label><FaRuler /> Paper Size</label>
                        <select
                          value={printData.paper_size}
                          onChange={(e) => setPrintData({...printData, paper_size: e.target.value})}
                        >
                          <option value="A4">A4</option>
                          <option value="Short">Short (8.5" x 11")</option>
                          <option value="Long">Long (8.5" x 13")</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="modal-footer">
                  <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" disabled={actionLoading}>
                    {actionLoading ? <FaSpinner className="spinner-small" /> : "Create Transaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="transaction-details-modal">
                <div className="details-section">
                  <h4>Request Information</h4>
                  <p><strong>Request Type:</strong> {getServiceLabel(selectedTransaction.service_type)}</p>
                  <p><strong>Status:</strong> {selectedTransaction.transaction_status}</p>
                  <p><strong>Submitted:</strong> {selectedTransaction.created_at_formatted}</p>
                </div>

                <div className="details-section">
                  <h4>Youth Information</h4>
                  <p><strong>Name:</strong> {selectedTransaction.youth_name}</p>
                  <p><strong>Barangay:</strong> {selectedTransaction.youth_barangay}</p>
                </div>

                <div className="details-section">
                  <h4>{selectedTransaction.service_type === "borrow" ? "Borrow Details" : "Print Details"}</h4>
                  {selectedTransaction.service_type === "borrow" ? (
                    <>
                      <p><strong>Item:</strong> {selectedTransaction.item}</p>
                      <p><strong>Quantity:</strong> {selectedTransaction.quantity}</p>
                      <p><strong>Return Date:</strong> {selectedTransaction.return_date ? new Date(selectedTransaction.return_date).toLocaleDateString() : "N/A"}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Document:</strong> {selectedTransaction.document}</p>
                      <p><strong>Copies:</strong> {selectedTransaction.copies}</p>
                      <p><strong>Paper Size:</strong> {selectedTransaction.paper_size}</p>
                    </>
                  )}
                </div>

                {selectedTransaction.remarks && (
                  <div className="details-section">
                    <h4>Remarks</h4>
                    <p>{selectedTransaction.remarks}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Transaction</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <label>Reason for rejection:</label>
              <textarea
                rows="4"
                placeholder="Please provide a reason for rejecting this request..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button 
                className="reject-confirm-btn"
                onClick={() => {
                  updateTransactionStatus(selectedTransactionId, "Rejected", rejectReason);
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                disabled={actionLoading}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}