import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { logActivity } from "../utils/logActivity";
import {
  FaSearch, FaUserCheck, FaIdCard, FaCalendarAlt,
  FaPhone, FaEnvelope, FaVenusMars, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaQrcode,
  FaArrowLeft, FaUser, FaInfoCircle, FaHistory,
  FaClipboardCheck, FaSave, FaMapMarkerAlt
} from "react-icons/fa";
import "../styles/ManualVerification.css";

export default function ManualVerification() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedYouth, setSelectedYouth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [verificationNote, setVerificationNote] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [confirmMethod, setConfirmMethod] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);

  // Load authenticated user FIRST
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      console.log("USER:", user);
    };
    getUser();
  }, []);

  // Init other data after user is loaded
  useEffect(() => {
    if (user) {
      fetchPrograms();
      getUserRole();
    }
  }, [user]);

  const getUserRole = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data } = await supabase
          .from("users")
          .select("role_id")
          .eq("user_id", currentUser.id)
          .single();
        setUserRole(data?.role_id ?? null);
      }
    } catch (err) {
      console.error("getUserRole:", err);
    }
  };

  // FIXED: Use .ilike() for case-insensitive status matching
  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .ilike("status", "active");
      
      if (error) throw error;
      setPrograms(data || []);
      console.log("PROGRAMS LOADED:", data);
    } catch (err) {
      console.error("fetchPrograms:", err);
      setPrograms([]);
    }
  };

  // Search Youth - FIXED .or() query
  const searchYouth = async () => {
    if (!user) {
      console.warn("User not authenticated yet");
      return;
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const term = `%${searchTerm.trim()}%`;
      
      const { data, error } = await supabase
        .from("youth")
        .select("*")
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
        .limit(10);

      if (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } else {
        console.log("SEARCH RESULTS:", data);
        setSearchResults(data || []);
      }
    } catch (err) {
      console.error("searchYouth:", err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Only trigger search when user is authenticated
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm && user) {
        searchYouth();
      } else if (!searchTerm) {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, user]);

  // FIXED: Attendance helper with guard against empty programId
  const checkTodayAttendance = async (youthId, programId) => {
    // Guard against empty programId
    if (!youthId || !programId || programId === "") {
      console.log("Missing youthId or programId:", { youthId, programId });
      return null;
    }
    
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("youth_id", youthId)
        .eq("program_id", programId)
        .gte("scanned_at", today)
        .lte("scanned_at", `${today}T23:59:59`);
      
      if (error) throw error;
      return data?.length > 0 ? data[0] : null;
    } catch (err) {
      console.error("checkTodayAttendance:", err);
      return null;
    }
  };

  const fetchVerificationHistory = async (youthId) => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("record_id", String(youthId))
        .eq("action", "MANUAL_VERIFY")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setVerificationHistory(data || []);
    } catch (err) {
      console.error("fetchVerificationHistory:", err);
    }
  };

  // Select youth
  const handleSelectYouth = async (youth) => {
    setSelectedYouth(youth);
    setIdentityConfirmed(false);
    setConfirmMethod("");
    setConfirmInput("");
    setSelectedReason("");
    setCustomReason("");
    setVerificationResult(null);
    setTodayAttendance(null);
    setSearchResults([]);

    // Only check attendance if a program is selected
    if (selectedProgram && selectedProgram !== "") {
      const att = await checkTodayAttendance(youth.id, selectedProgram);
      setTodayAttendance(att);
    }
    await fetchVerificationHistory(youth.id);
  };

  // Confirm identity
  const handleConfirmIdentity = () => {
    if (!confirmMethod) {
      alert("Please select a verification method");
      return;
    }
    let valid = false;
    if (confirmMethod === "id") {
      valid = true;
    } else if (confirmMethod === "birthdate") {
      const match = new Date(confirmInput).toDateString() === new Date(selectedYouth.birthdate).toDateString();
      if (!match) { alert("Birthdate does not match our records"); return; }
      valid = true;
    } else if (confirmMethod === "contact") {
      if (confirmInput !== selectedYouth.contact) { alert("Contact number does not match our records"); return; }
      valid = true;
    }
    if (valid) {
      setIdentityConfirmed(true);
      logActivity({
        action: "IDENTITY_CONFIRMED",
        table: "youth",
        recordId: selectedYouth.id,
        details: `Identity confirmed via ${confirmMethod} for manual verification`,
      });
    }
  };

  // Mark attendance
  const handleMarkAttendance = async () => {
    if (!selectedYouth || !selectedProgram) { alert("Please select a youth and program"); return; }
    if (!identityConfirmed) { alert("Please confirm the youth's identity first"); return; }
    if (!selectedReason) { alert("Please select a reason for manual verification"); return; }

    const finalReason = selectedReason === "Other" ? customReason : selectedReason;
    if (!finalReason) { alert("Please provide a reason for manual verification"); return; }

    const existing = await checkTodayAttendance(selectedYouth.id, selectedProgram);
    if (existing) {
      setVerificationResult({ success: false, message: "Youth is already marked present for this program today." });
      setTimeout(() => setVerificationResult(null), 3500);
      return;
    }

    setVerifying(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { data: attendance, error } = await supabase
        .from("attendance")
        .insert([{
          youth_id: selectedYouth.id,
          program_id: selectedProgram,
          method: "manual",
          reason: finalReason,
          verified_by: currentUser?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        action: "MANUAL_VERIFY",
        table: "attendance",
        recordId: attendance.id,
        details: `Manual verification for ${selectedYouth.first_name} ${selectedYouth.last_name} — Reason: ${finalReason}${verificationNote ? ` | Notes: ${verificationNote}` : ""}`,
      });

      setVerificationResult({ success: true, message: "Attendance recorded successfully!" });

      setTimeout(() => {
        setVerificationResult(null);
        setSelectedYouth(null);
        setSelectedProgram("");
        setVerificationNote("");
        setSearchTerm("");
        setSearchResults([]);
        setIdentityConfirmed(false);
        setSelectedReason("");
        setCustomReason("");
        setTodayAttendance(null);
      }, 3000);

    } catch (err) {
      console.error("handleMarkAttendance:", err);
      await logActivity({
        action: "MANUAL_VERIFY_FAILED",
        table: "attendance",
        recordId: null,
        details: `Failed to verify ${selectedYouth?.first_name} ${selectedYouth?.last_name} — ${err.message}`,
      });
      setVerificationResult({ success: false, message: err.message || "Failed to record attendance." });
      setTimeout(() => setVerificationResult(null), 3500);
    } finally {
      setVerifying(false);
    }
  };

  // Helpers
  const getAge = (birthdate) => {
    if (!birthdate) return "N/A";
    const today = new Date(), birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDate = (d) => new Date(d).toLocaleString();

  const MethodBadge = ({ method }) =>
    method === "manual"
      ? <span className="badge-manual">🟡 Manual</span>
      : <span className="badge-qr">🟢 QR Scan</span>;

  // Access guard
  if (userRole !== null && userRole !== 1) {
    return (
      <>
        <Navbar />
        <div className="manual-verification-container">
          <div className="access-denied">
            <FaExclamationTriangle />
            <h2>Access Denied</h2>
            <p>Only SK Chairman can access this page.</p>
            <button onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      </>
    );
  }

  // Render
  return (
    <>
      <Navbar />
      <div className="manual-verification-container">

        {/* Header */}
        <div className="page-header">
          <button
            className="back-btn icon-only"
            onClick={() => navigate(-1)}
            title="Go back"
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          <div className="header-text">
            <h2>Manual Verification</h2>
            <p>Verify youth attendance when QR code is unavailable</p>
          </div>
        </div>

        <div className="verification-content">

          {/* Search Section */}
          <div className="search-section">
            <div className="search-card">
              <h3><FaSearch /> Search Youth</h3>
              <p className="search-hint">Search by first name, last name, or email</p>

              <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Enter youth name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {isLoading && (
                <div className="loading-results">
                  <div className="spinner-small"></div>
                  <p>Searching...</p>
                </div>
              )}

              {searchResults.length > 0 && !selectedYouth && (
                <div className="search-results">
                  <h4>Results ({searchResults.length})</h4>
                  {searchResults.map((youth) => (
                    <div
                      key={youth.id}
                      className="result-item"
                      onClick={() => handleSelectYouth(youth)}
                    >
                      <div className="result-avatar">
                        {youth.photo_url
                          ? <img src={youth.photo_url} alt={youth.first_name} />
                          : <FaUser />}
                      </div>
                      <div className="result-info">
                        <div className="result-name">
                          {youth.first_name} {youth.last_name}
                        </div>
                        <div className="result-details">
                          <span><FaCalendarAlt /> {getAge(youth.birthdate)} yrs</span>
                          <span><FaVenusMars /> {youth.gender || "N/A"}</span>
                        </div>
                      </div>
                      <FaUserCheck className="select-icon" />
                    </div>
                  ))}
                </div>
              )}

              {searchTerm && !isLoading && searchResults.length === 0 && (
                <div className="no-results">
                  <FaExclamationTriangle />
                  <p>No youth found. Try a different name or email.</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Form */}
          {selectedYouth && (
            <div className="verification-section">
              <div className="verification-card">

                <div className="card-header">
                  <h3>Manual Verification</h3>
                  <button
                    className="history-btn"
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    <FaHistory /> {showHistory ? "Hide History" : "View History"}
                  </button>
                </div>

                {/* Youth Details */}
                <div className="youth-details">
                  <h4>Youth Information</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <FaUser className="detail-icon" />
                      <div>
                        <label>Full Name</label>
                        <p>{selectedYouth.first_name} {selectedYouth.last_name}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaCalendarAlt className="detail-icon" />
                      <div>
                        <label>Age</label>
                        <p>{getAge(selectedYouth.birthdate)} years</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaVenusMars className="detail-icon" />
                      <div>
                        <label>Gender</label>
                        <p>{selectedYouth.gender || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaPhone className="detail-icon" />
                      <div>
                        <label>Contact</label>
                        <p>{selectedYouth.contact || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaEnvelope className="detail-icon" />
                      <div>
                        <label>Email</label>
                        <p>{selectedYouth.email || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaMapMarkerAlt className="detail-icon" />
                      <div>
                        <label>Barangay</label>
                        <p>{selectedYouth.barangay || "N/A"}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaQrcode className="detail-icon" />
                      <div>
                        <label>QR Code</label>
                        <p>{selectedYouth.qr_code || "Not generated"}</p>
                      </div>
                    </div>
                    <div className="detail-item">
                      <FaIdCard className="detail-icon" />
                      <div>
                        <label>Registration Status</label>
                        <p>{selectedYouth.status || "Registered"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 1: Confirm Identity */}
                {!identityConfirmed ? (
                  <div className="identity-confirmation">
                    <h4>Step 1 — Confirm Identity</h4>
                    <p className="confirm-hint">
                      Choose a method to verify this youth's identity before recording attendance.
                    </p>

                    <div className="confirm-methods">
                      <label className="confirm-option">
                        <input
                          type="radio"
                          name="confirmMethod"
                          value="id"
                          checked={confirmMethod === "id"}
                          onChange={(e) => { setConfirmMethod(e.target.value); setConfirmInput(""); }}
                        />
                        <span>Ask for Valid Government ID</span>
                      </label>
                      <label className="confirm-option">
                        <input
                          type="radio"
                          name="confirmMethod"
                          value="birthdate"
                          checked={confirmMethod === "birthdate"}
                          onChange={(e) => { setConfirmMethod(e.target.value); setConfirmInput(""); }}
                        />
                        <span>Ask Birthdate</span>
                      </label>
                      <label className="confirm-option">
                        <input
                          type="radio"
                          name="confirmMethod"
                          value="contact"
                          checked={confirmMethod === "contact"}
                          onChange={(e) => { setConfirmMethod(e.target.value); setConfirmInput(""); }}
                        />
                        <span>Ask Registered Contact Number</span>
                      </label>
                    </div>

                    {confirmMethod === "birthdate" && (
                      <div className="confirm-input">
                        <label>Enter Birthdate</label>
                        <input
                          type="date"
                          value={confirmInput}
                          onChange={(e) => setConfirmInput(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    )}

                    {confirmMethod === "contact" && (
                      <div className="confirm-input">
                        <label>Enter Contact Number</label>
                        <input
                          type="text"
                          value={confirmInput}
                          onChange={(e) => setConfirmInput(e.target.value)}
                          placeholder="Enter registered contact number"
                          className="form-input"
                        />
                      </div>
                    )}

                    <div className="verification-actions">
                      <button onClick={() => setSelectedYouth(null)} className="btn-cancel">
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmIdentity}
                        className="btn-confirm"
                        disabled={!confirmMethod}
                      >
                        <FaClipboardCheck /> Confirm Identity
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="identity-confirmed">
                    <FaCheckCircle />
                    <span>Identity confirmed — proceed to record attendance</span>
                  </div>
                )}

                {/* Step 2: Record Attendance */}
                {identityConfirmed && (
                  <div className="verification-form">
                    <h4>Step 2 — Record Attendance</h4>

                    <div className="form-group">
                      <label>Select Program / Event *</label>
                      <select
                        value={selectedProgram}
                        onChange={async (e) => {
                          const programId = e.target.value;
                          setSelectedProgram(programId);
                          if (selectedYouth && programId) {
                            const att = await checkTodayAttendance(selectedYouth.id, programId);
                            setTodayAttendance(att);
                          }
                        }}
                        className="form-select"
                      >
                        <option value="">Choose a program / event</option>
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>{p.program_name}</option>
                        ))}
                      </select>
                    </div>

                    {todayAttendance && (
                      <div className="warning-box">
                        <FaExclamationTriangle />
                        <p>
                          Already marked as present today&nbsp;
                          <MethodBadge method={todayAttendance.method} />
                        </p>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Reason for Manual Verification *</label>
                      <select
                        value={selectedReason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select reason</option>
                        <option value="Forgot QR">Forgot QR Code</option>
                        <option value="Phone issue">Phone Issue / Dead Battery</option>
                        <option value="QR scanner issue">QR Scanner Technical Issue</option>
                        <option value="Lost QR">Lost QR Code</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {selectedReason === "Other" && (
                      <div className="form-group">
                        <label>Specify Reason *</label>
                        <input
                          type="text"
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="Describe the reason..."
                          className="form-input"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Additional Notes (Optional)</label>
                      <textarea
                        placeholder="Any additional context about this verification..."
                        value={verificationNote}
                        onChange={(e) => setVerificationNote(e.target.value)}
                        className="form-textarea"
                        rows="3"
                      />
                    </div>

                    <div className="info-box">
                      <FaInfoCircle />
                      <p>
                        This will be saved to the <strong>attendance</strong> table
                        with method <strong>"manual"</strong> and logged in the audit trail.
                      </p>
                    </div>

                    <div className="verification-actions">
                      <button onClick={() => setSelectedYouth(null)} className="btn-cancel">
                        Cancel
                      </button>
                      <button
                        onClick={handleMarkAttendance}
                        disabled={
                          verifying ||
                          !selectedProgram ||
                          !selectedReason ||
                          (selectedReason === "Other" && !customReason) ||
                          !!todayAttendance
                        }
                        className="btn-verify"
                      >
                        {verifying ? "Processing..." : <><FaSave /> Mark as Present</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Result */}
                {verificationResult && (
                  <div className={`verification-result ${verificationResult.success ? "success" : "error"}`}>
                    {verificationResult.success
                      ? <FaCheckCircle className="result-icon" />
                      : <FaTimesCircle className="result-icon" />}
                    <p>{verificationResult.message}</p>
                  </div>
                )}

                {/* History */}
                {showHistory && (
                  <div className="history-section">
                    <h4>Manual Verification History</h4>
                    {verificationHistory.length === 0 ? (
                      <p className="no-history">No manual verification history found.</p>
                    ) : (
                      <div className="history-list">
                        {verificationHistory.map((log, i) => (
                          <div key={i} className="history-item">
                            <div className="history-date">{formatDate(log.created_at)}</div>
                            <div className="history-details">{log.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="help-section">
          <div className="help-card">
            <h4>Manual Verification Guidelines</h4>
            <ul>
              <li>Verify identity using a valid government ID, birthdate, or registered contact number</li>
              <li>Ensure the youth is registered in the system before proceeding</li>
              <li>Select the correct program / event they are attending</li>
              <li>Always select a reason — required for audit and accountability</li>
              <li>All manual verifications are saved to the <strong>attendance</strong> table with method <em>"manual"</em></li>
              <li>The system prevents duplicate attendance entries for the same program on the same day</li>
            </ul>
          </div>
        </div>

      </div>
    </>
  );
}