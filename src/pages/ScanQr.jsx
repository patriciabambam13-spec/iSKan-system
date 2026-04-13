import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, FaClipboardList, FaPrint, FaTools, FaHistory, FaUpload, FaCamera, FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import "../styles/scanQR.css";

export default function ScanQRPage() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mode, setMode] = useState(null); // "scan" or "upload"
  const [scanning, setScanning] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recentScans, setRecentScans] = useState([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // ========== ROLE PROTECTION ==========
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
          .select("role_id")
          .eq("user_id", user.id)
          .single();

        if (error || !userData) {
          navigate("/");
          return;
        }

        if (userData.role_id !== 1 && userData.role_id !== 2) {
          navigate("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/");
      }
    };

    checkAccess();
  }, [navigate]);

  // ========== FETCH RECENT SCANS ==========
  const fetchRecentScans = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          method,
          created_at,
          youth:youth_id(first_name, last_name),
          program:program_id(program_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted = data?.map(log => ({
        id: log.id,
        youthName: `${log.youth?.first_name || ''} ${log.youth?.last_name || ''}`.trim(),
        activityType: "Attendance",
        programName: log.program?.program_name || "Unknown Program",
        method: log.method,
        time: format(new Date(log.created_at), "hh:mm a"),
        date: format(new Date(log.created_at), "MMM dd, yyyy")
      })) || [];

      setRecentScans(formatted);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
    }
  };

  // ========== CHECK DUPLICATE ATTENDANCE ==========
  const checkDuplicate = async (userId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("attendance")
        .select("id")
        .eq("youth_id", userId)
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
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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
      
      console.log("SCANNED QR:", qrData);
      
      // Extract QR code value - handle JSON or plain text
      let qrCodeValue = qrData;
      try {
        const parsed = JSON.parse(qrData);
        qrCodeValue = parsed.qr_code || parsed.youth_id || parsed.id || qrData;
      } catch {
        // Not JSON, use as is
      }

      console.log("QR CODE VALUE:", qrCodeValue);

      const { data: youth, error } = await supabase
        .from("youth")
        .select(`
          id,
          first_name,
          last_name,
          birthdate,
          barangay,
          status,
          qr_code
        `)
        .eq("qr_code", qrCodeValue)
        .single();

      if (error || !youth) {
        console.error("Youth not found:", error);
        setErrorMessage("User not found. Invalid QR code.");
        setHasScanned(false);
        isProcessingRef.current = false;
        setIsLoading(false);
        return;
      }

      const age = calculateAge(youth.birthdate);

      setUserInfo({
        id: youth.id,
        name: `${youth.first_name} ${youth.last_name}`,
        age: age || "N/A",
        barangay: youth.barangay || "Barangay Pinagkaisahan",
        status: youth.status || "Active",
        qr_code: youth.qr_code
      });

      // Stop scanner if it's running
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

  // ========== HANDLE QR IMAGE UPLOAD ==========
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage("");

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        console.log("✅ UPLOADED QR:", code.data);
        processQRCode(code.data);
      } else {
        setErrorMessage("No QR code found in image. Please try a different image.");
      }
      
      setUploading(false);
      event.target.value = "";
    };

    img.onerror = () => {
      setErrorMessage("Failed to load image. Please try again.");
      setUploading(false);
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  // ========== INITIALIZE SCANNER - Only when mode is "scan" ==========
  useEffect(() => {
    if (!isAuthorized || mode !== "scan" || scanning || html5QrCodeRef.current) return;

    const startScanner = async () => {
      try {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCodeRef.current.start(
          { facingMode: "user" },
          config,
          (decodedText) => {
            console.log("✅ SCANNED:", decodedText);
            processQRCode(decodedText);
          },
          (error) => {
            console.log("Scan error:", error);
          }
        );
        setScanning(true);
        console.log("Scanner started successfully");
      } catch (error) {
        console.error("Error starting scanner:", error);
        setErrorMessage("Failed to start camera. Please check permissions or use the upload option.");
        setMode(null);
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
      setScanning(false);
    };
  }, [isAuthorized, mode, scanning]);

  // ========== RESET SCANNER ==========
  const resetToModeSelection = () => {
    // Stop scanner if running
    const stopScanner = async () => {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
        } catch (e) {
          console.log("Error stopping scanner:", e);
        }
        html5QrCodeRef.current = null;
      }
    };
    stopScanner();

    setUserInfo(null);
    setSelectedAction(null);
    setShowConfirmModal(false);
    setErrorMessage("");
    setHasScanned(false);
    isProcessingRef.current = false;
    setScanning(false);
    setMode(null);
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
      const isDuplicate = await checkDuplicate(userInfo.id);
      if (isDuplicate) {
        setErrorMessage(`${userInfo.name} has already recorded attendance today.`);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name, role_id")
        .eq("user_id", user.id)
        .single();

      const verifiedBy = userData ? `${userData.first_name} ${userData.last_name}` : "System";

      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          youth_id: userInfo.id,
          method: "qr",
          verified_by: verifiedBy,
          notes: `QR scan - ${selectedAction} transaction`
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
        resetToModeSelection();
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
          {/* Header with Back Button - Matching other pages */}
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft /> Back
            </button>
            <div className="header-text">
              <h2>QR Code Scanner</h2>
              <p>Scan or upload QR code to record transactions</p>
            </div>
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
            {/* Left Column - Scanner/Upload Area */}
            <div className="scanner-column">
              {/* Mode Selection - Shown first */}
              {!mode && (
                <div className="mode-selection">
                  <h3>Choose Method</h3>
                  <div className="mode-buttons">
                    <button onClick={() => setMode("scan")} className="mode-btn scan-mode">
                      <FaCamera />
                      <span>Scan QR Code</span>
                      <small>Use camera to scan live QR</small>
                    </button>
                    <button onClick={() => setMode("upload")} className="mode-btn upload-mode">
                      <FaUpload />
                      <span>Upload QR Image</span>
                      <small>Upload a screenshot or photo of QR</small>
                    </button>
                  </div>
                </div>
              )}

              {/* Scan Mode */}
              {mode === "scan" && (
                <>
                  <div className="scanner-wrapper">
                    <div id="qr-reader" className="qr-reader"></div>
                    <div className="scan-overlay">
                      <div className="scan-frame"></div>
                      <p>Position QR code within the frame</p>
                    </div>
                  </div>
                  <button onClick={resetToModeSelection} className="change-mode-btn">
                    ← Change Mode
                  </button>
                </>
              )}

              {/* Upload Mode */}
              {mode === "upload" && !userInfo && (
                <div className="upload-section">
                  <div className="upload-icon">
                    <FaQrcode />
                  </div>
                  <h3>Upload QR Code Image</h3>
                  <p>Select an image file containing a QR code</p>
                  <label className="upload-btn">
                    <FaUpload /> Choose Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      hidden 
                      disabled={uploading}
                    />
                  </label>
                  {uploading && (
                    <div className="uploading-status">
                      <div className="spinner-small"></div>
                      <p>Processing image...</p>
                    </div>
                  )}
                  <button onClick={resetToModeSelection} className="change-mode-btn">
                    ← Change Mode
                  </button>
                </div>
              )}

              {/* User Info after successful scan/upload */}
              {userInfo && (
                <div className="user-info-card">
                  <h3>Youth Information</h3>
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
                      <strong>QR Code:</strong>
                      <span>{userInfo.qr_code}</span>
                    </div>
                    <div className="user-field">
                      <strong>Status:</strong>
                      <span className={`status-badge ${userInfo.status === "Active" ? "active" : "inactive"}`}>
                        {userInfo.status}
                      </span>
                    </div>
                  </div>

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

                  <button onClick={resetToModeSelection} className="rescan-btn">
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
                          <span className="scan-program">{scan.programName}</span>
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