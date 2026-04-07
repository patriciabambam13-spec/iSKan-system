import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { Html5Qrcode } from "html5-qrcode";
import { FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, FaClipboardList, FaPrint, FaTools, FaHistory } from "react-icons/fa";
import { format } from "date-fns";
import "../styles/scanQR.css";

export default function ScanQRPage() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [hasScanned, setHasScanned] = useState(false);
  
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // ========== ROLE PROTECTION ==========
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: userData, error } = await supabase
          .from("users")
          .select("role_id")
          .eq("user_id", user.id)
          .single();

        if (error || !userData) {
          navigate("/login");
          return;
        }

        // Allow both Chairman (1) and Kagawad (2) to scan
        if (userData.role_id !== 1 && userData.role_id !== 2) {
          navigate("/unauthorized");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAccess();
  }, [navigate]);

  // ========== FETCH RECENT SCANS ==========
  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select(`
          id,
          activity_type,
          created_at,
          youth:youth_id(first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = data?.map(log => ({
        id: log.id,
        youthName: `${log.youth?.first_name || ''} ${log.youth?.last_name || ''}`.trim(),
        activityType: log.activity_type === "attendance" ? "Seminar Attendance" :
                      log.activity_type === "borrow" ? "Equipment Borrowing" :
                      "Printing Transaction",
        time: format(new Date(log.created_at), "hh:mm a"),
        date: format(new Date(log.created_at), "MMM dd, yyyy")
      })) || [];

      setRecentScans(formatted);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
    }
  };

  // ========== CHECK DUPLICATE ATTENDANCE ==========
  const checkDuplicate = async (userId, activityType) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("id")
        .eq("youth_id", userId)
        .eq("activity_type", activityType)
        .gte("created_at", today)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      return !!data;
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return false;
    }
  };

  // ========== CALCULATE ACCURATE AGE ==========
  const calculateAge = (birthDate) => {
    const today = new Date();
    const diff = today - new Date(birthDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  // ========== PROCESS QR CODE ==========
  const processQRCode = async (qrData) => {
    if (hasScanned || isProcessingRef.current) return;
    
    setHasScanned(true);
    isProcessingRef.current = true;
    
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      if (!qrData || typeof qrData !== "string") {
        setErrorMessage("Invalid QR format");
        setHasScanned(false);
        isProcessingRef.current = false;
        setIsLoading(false);
        return;
      }
      
      let youthId = qrData;
      try {
        const parsed = JSON.parse(qrData);
        youthId = parsed.youth_id || parsed.id || qrData;
      } catch {
        // If not JSON, use as is
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(youthId)) {
        setErrorMessage("Invalid QR code format. Please use a valid youth QR code.");
        setHasScanned(false);
        isProcessingRef.current = false;
        setIsLoading(false);
        return;
      }

      const { data: youth, error } = await supabase
        .from("youth")
        .select(`
          id,
          first_name,
          last_name,
          age,
          barangay,
          status,
          birth_date
        `)
        .eq("id", youthId)
        .single();

      if (error || !youth) {
        setErrorMessage("User not found. Invalid QR code.");
        setHasScanned(false);
        isProcessingRef.current = false;
        setIsLoading(false);
        return;
      }

      let age = youth.age;
      if (!age && youth.birth_date) {
        age = calculateAge(youth.birth_date);
      }

      setUserInfo({
        id: youth.id,
        name: `${youth.first_name} ${youth.last_name}`,
        age: age || "N/A",
        barangay: youth.barangay || "Barangay Pinagkaisahan",
        status: youth.status || "Active"
      });

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.log("Scanner already stopped");
        }
      }
      
      setScanning(false);
      
    } catch (error) {
      console.error("Error processing QR:", error);
      setErrorMessage("Error processing QR code. Please try again.");
      setHasScanned(false);
      isProcessingRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  // ========== INITIALIZE SCANNER ==========
  useEffect(() => {
    if (!isAuthorized || !scanning || html5QrCodeRef.current) return;

    const startScanner = async () => {
      try {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        try {
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              processQRCode(decodedText);
            },
            () => {  // ✅ FIX: Unused parameter renamed to _
              // Silent error handling
            }
          );
        } catch (cameraError) {
          console.log("Back camera failed, trying default camera:", cameraError);
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await html5QrCodeRef.current.start(
              devices[0].id,
              config,
              (decodedText) => {
                processQRCode(decodedText);
              },
              () => {  // ✅ FIX: Unused parameter renamed to _
                // Silent error handling
              }
            );
          } else {
            throw new Error("No cameras found");
          }
        }
      } catch (error) {
        console.error("Error starting scanner:", error);
        setErrorMessage("Failed to start camera. Please check permissions and ensure you have a camera connected.");
      }
    };

    startScanner();

    return () => {
      const stopScanner = async () => {
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
          } catch (error) {
            console.log("Error stopping scanner:", error);
          }
        }
      };
      stopScanner();
    };
  }, [isAuthorized, scanning]);

  // ========== RESET SCANNER ==========
  const resetScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
        } catch (e) {
          console.log("Error stopping scanner:", e);
        }
        html5QrCodeRef.current = null;
      }
    } catch (error) {
      console.log("Error resetting scanner:", error);
    }

    setUserInfo(null);
    setSelectedAction(null);
    setShowConfirmModal(false);
    setErrorMessage("");
    setHasScanned(false);
    isProcessingRef.current = false;
    setScanning(true);
  };

  // ========== HANDLE ACTION SELECTION ==========
  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setShowConfirmModal(true);
  };

  // ========== CONFIRM TRANSACTION ==========
  const confirmTransaction = async () => {
    if (!userInfo || !selectedAction) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const isDuplicate = await checkDuplicate(userInfo.id, selectedAction);
      if (isDuplicate) {
        setErrorMessage(`${userInfo.name} has already completed this ${selectedAction === "attendance" ? "seminar attendance" : selectedAction === "borrow" ? "equipment borrowing" : "printing transaction"} today.`);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name, role_id")
        .eq("user_id", user.id)
        .single();

      const handledBy = userData ? `${userData.first_name} ${userData.last_name}` : "System";

      const { error: insertError } = await supabase
        .from("attendance_logs")
        .insert({
          youth_id: userInfo.id,
          activity_type: selectedAction,
          handled_by: handledBy,
          status: "completed"
        });

      if (insertError) throw insertError;

      let actionMessage = "";
      switch(selectedAction) {
        case "attendance":
          actionMessage = "Attendance Recorded";
          break;
        case "borrow":
          actionMessage = "Equipment Borrowed";
          break;
        case "printing":
          actionMessage = "Printing Transaction Completed";
          break;
        default:
          actionMessage = "Transaction Completed";
      }

      setSuccessMessage(`${actionMessage} for ${userInfo.name}`);
      setShowSuccess(true);
      
      await fetchRecentScans();
      
      setTimeout(() => {
        setShowSuccess(false);
        resetScanner();
      }, 3000);
      
    } catch (error) {
      console.error("Error saving transaction:", error);
      setErrorMessage("Failed to save transaction. Please try again.");
    } finally {
      setIsLoading(false);
      setShowConfirmModal(false);
    }
  };

  // ========== CANCEL TRANSACTION ==========
  const cancelTransaction = () => {
    setShowConfirmModal(false);
    setSelectedAction(null);
  };

  // ========== LOAD RECENT SCANS ON MOUNT ==========
  useEffect(() => {
    if (isAuthorized) {
      fetchRecentScans();
    }
  }, [isAuthorized]);

  // Show loading while checking authorization
  if (!isAuthorized) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verifying access...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="scan-qr-page">
        <div className="scan-container">
          {/* Header */}
          <div className="scan-header">
            <h1>
              <FaQrcode className="header-icon" />
              QR Code Scanner
            </h1>
            <p>Scan youth QR code to record attendance, borrowing, or printing transactions</p>
          </div>

          {/* Success Toast */}
          {showSuccess && (
            <div className="success-toast">
              <FaCheckCircle className="success-icon" />
              <div>
                <strong>Success!</strong>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="error-message">
              <FaTimesCircle className="error-icon" />
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage("")}>Dismiss</button>
            </div>
          )}

          <div className="scan-content">
            {/* Left Column - Scanner */}
            <div className="scanner-column">
              {scanning ? (
                <>
                  <div className="scanner-wrapper">
                    <div id="qr-reader" className="qr-reader"></div>
                    <div className="scan-overlay">
                      <div className="scan-frame"></div>
                      <p>Position QR code within the frame</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="user-info-card">
                  <h3>Youth Information</h3>
                  {userInfo && (
                    <div className="user-details">
                      <div className="user-avatar">
                        <FaUser />
                      </div>
                      <div className="user-field">
                        <strong>Name:</strong>
                        <span>{userInfo.name}</span>
                      </div>
                      <div className="user-field">
                        <strong>Age:</strong>
                        <span>{userInfo.age}</span>
                      </div>
                      <div className="user-field">
                        <strong>Barangay:</strong>
                        <span>{userInfo.barangay}</span>
                      </div>
                      <div className="user-field">
                        <strong>Status:</strong>
                        <span className={`status-badge ${userInfo.status === "Active" ? "active" : "inactive"}`}>
                          {userInfo.status}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="action-buttons">
                    <h4>Select Transaction Type:</h4>
                    <div className="action-grid">
                      <button 
                        onClick={() => handleActionSelect("attendance")}
                        className="action-option attendance"
                      >
                        <FaClipboardList />
                        <span>Seminar Attendance</span>
                      </button>
                      <button 
                        onClick={() => handleActionSelect("borrow")}
                        className="action-option borrow"
                      >
                        <FaTools />
                        <span>Equipment Borrowing</span>
                      </button>
                      <button 
                        onClick={() => handleActionSelect("printing")}
                        className="action-option printing"
                      >
                        <FaPrint />
                        <span>Printing Transaction</span>
                      </button>
                    </div>
                  </div>

                  <button onClick={resetScanner} className="rescan-btn">
                    <FaQrcode />
                    Scan Another QR
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Recent Scans History */}
            <div className="history-column">
              <div className="recent-scans-card">
                <h3>
                  <FaHistory className="history-icon" />
                  Recent Transactions
                </h3>
                <div className="scans-list">
                  {recentScans.length > 0 ? (
                    recentScans.map((scan) => (
                      <div key={scan.id} className="scan-item">
                        <div className="scan-info">
                          <span className="scan-name">{scan.youthName}</span>
                          <span className="scan-type">{scan.activityType}</span>
                          <span className="scan-time">{scan.time}</span>
                        </div>
                        <span className="scan-date">{scan.date}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-scans">No recent transactions</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && userInfo && selectedAction && (
          <div className="modal-overlay">
            <div className="confirmation-modal">
              <div className="modal-header">
                <h3>Confirm Transaction</h3>
                <button onClick={cancelTransaction} className="close-btn">&times;</button>
              </div>
              <div className="modal-body">
                <div className="confirm-user">
                  <FaUser className="confirm-icon" />
                  <div>
                    <strong>{userInfo.name}</strong>
                    <p>{userInfo.barangay}</p>
                  </div>
                </div>
                <div className="confirm-action">
                  <span className="action-label">Transaction:</span>
                  <span className="action-value">
                    {selectedAction === "attendance" && "Seminar Attendance"}
                    {selectedAction === "borrow" && "Equipment Borrowing"}
                    {selectedAction === "printing" && "Printing Transaction"}
                  </span>
                </div>
                <p className="confirm-warning">
                  This action will be recorded and cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button onClick={cancelTransaction} className="cancel-confirm-btn">
                  Cancel
                </button>
                <button onClick={confirmTransaction} className="confirm-btn" disabled={isLoading}>
                  {isLoading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}