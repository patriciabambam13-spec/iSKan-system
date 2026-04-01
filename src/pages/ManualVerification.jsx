import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { 
  FaSearch, FaUserCheck, FaIdCard, FaCalendarAlt, 
  FaPhone, FaEnvelope, FaVenusMars, FaCheckCircle,
  FaTimesCircle, FaExclamationTriangle, FaQrcode,
  FaArrowLeft, FaUser, FaInfoCircle
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

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("status", "Active");

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const searchYouth = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("youth")
        .select(`
          *,
          programs(program_name)
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching youth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm) {
        searchYouth();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleVerify = async () => {
    if (!selectedYouth || !selectedProgram) {
      alert("Please select a youth and program");
      return;
    }

    setVerifying(true);
    try {
      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            youth_id: selectedYouth.id,
            program_id: selectedProgram,
            method: "Manual Verification",
            status: "approved",
            notes: verificationNote || "Manual verification due to forgotten QR code",
            verified_by: (await supabase.auth.getUser()).data.user?.id,
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert([
          {
            action: "MANUAL_VERIFICATION",
            table_name: "transactions",
            record_id: transaction.id,
            details: `Manual verification for ${selectedYouth.first_name} ${selectedYouth.last_name} - QR code forgotten`,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            created_at: new Date().toISOString()
          }
        ]);

      setVerificationResult({
        success: true,
        message: "Youth successfully verified!",
        transaction: transaction
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setVerificationResult(null);
        setSelectedYouth(null);
        setSelectedProgram("");
        setVerificationNote("");
        setSearchTerm("");
        setSearchResults([]);
      }, 3000);

    } catch (error) {
      console.error("Error verifying youth:", error);
      setVerificationResult({
        success: false,
        message: error.message || "Failed to verify youth"
      });
      
      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);
    } finally {
      setVerifying(false);
    }
  };

  const getAge = (birthdate) => {
    if (!birthdate) return "N/A";
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <>
      <Navbar />
      <div className="manual-verification-container">
        {/* Header */}
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Back
          </button>
          <div className="header-text">
            <h2>Manual Verification</h2>
            <p>Verify youth who forgot their QR code identification</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="verification-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-card">
              <h3>
                <FaSearch /> Search Youth
              </h3>
              <p className="search-hint">
                Search by name, email, or contact number
              </p>
              <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Enter youth name, email, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Search Results */}
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
                      onClick={() => setSelectedYouth(youth)}
                    >
                      <div className="result-avatar">
                        <FaUser />
                      </div>
                      <div className="result-info">
                        <div className="result-name">
                          {youth.first_name} {youth.last_name}
                        </div>
                        <div className="result-details">
                          <span><FaIdCard /> {youth.age || getAge(youth.birthdate)} yrs</span>
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
                  <p>No youth found. Try a different search term.</p>
                </div>
              )}
            </div>
          </div>

          {/* Verification Form */}
          {selectedYouth && (
            <div className="verification-section">
              <div className="verification-card">
                <h3>Verify Youth</h3>
                
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
                        <p>{selectedYouth.age || getAge(selectedYouth.birthdate)} years</p>
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
                      <FaIdCard className="detail-icon" />
                      <div>
                        <label>Program</label>
                        <p>{selectedYouth.programs?.program_name || "Not enrolled"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Form */}
                <div className="verification-form">
                  <h4>Verification Details</h4>
                  
                  <div className="form-group">
                    <label>Select Program *</label>
                    <select
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(e.target.value)}
                      className="form-select"
                    >
                      <option value="">Choose a program</option>
                      {programs.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.program_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Verification Notes</label>
                    <textarea
                      placeholder="Add any additional notes about this verification..."
                      value={verificationNote}
                      onChange={(e) => setVerificationNote(e.target.value)}
                      className="form-textarea"
                      rows="3"
                    />
                  </div>

                  <div className="info-box">
                    <FaInfoCircle />
                    <p>
                      This manual verification will be recorded in the audit log.
                      The youth will be marked as verified for the selected program.
                    </p>
                  </div>

                  <div className="verification-actions">
                    <button
                      onClick={() => setSelectedYouth(null)}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={verifying || !selectedProgram}
                      className="btn-verify"
                    >
                      {verifying ? (
                        <>Verifying...</>
                      ) : (
                        <>
                          <FaUserCheck /> Verify Youth
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`verification-result ${verificationResult.success ? 'success' : 'error'}`}>
                    {verificationResult.success ? (
                      <FaCheckCircle className="result-icon" />
                    ) : (
                      <FaTimesCircle className="result-icon" />
                    )}
                    <p>{verificationResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="help-section">
          <div className="help-card">
            <h4>Manual Verification Guidelines</h4>
            <ul>
              <li>Verify the youth's identity using valid government ID or barangay ID</li>
              <li>Ensure the youth is registered in the system before proceeding</li>
              <li>Select the correct program they are participating in</li>
              <li>Add notes about why QR code verification wasn't possible</li>
              <li>All manual verifications are logged for audit purposes</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}