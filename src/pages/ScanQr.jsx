import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import jsQR from "jsqr";
import { 
  FaQrcode, FaCheckCircle, FaTimesCircle, FaUser, 
  FaClipboardList, FaPrint, FaTools, FaHistory, 
  FaUpload, FaCamera, FaArrowLeft, FaSpinner,
  FaStop, FaUsers
} from "react-icons/fa";
import { format } from "date-fns";
import "../styles/scanQR.css";

export default function ScanQRPage() {
  const navigate = useNavigate();
  
  // State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mode, setMode] = useState(null);
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
  const [showManualRequestModal, setShowManualRequestModal] = useState(false);
  const [manualRequestReason, setManualRequestReason] = useState("");
  const [requestType, setRequestType] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [youthList, setYouthList] = useState([]);
  const [selectedYouthId, setSelectedYouthId] = useState("");
  const [searchYouth, setSearchYouth] = useState("");
  
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Auth check
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        setCurrentUser(user);

        const { data: userData, error } = await supabase
          .from("users")
          .select("role_id")
          .eq("user_id", user.id)
          .single();

        if (error || !userData || (userData.role_id !== 1 && userData.role_id !== 2)) {
          navigate("/");
          return;
        }

        setIsAuthorized(true);
        fetchRecentScans();
        fetchYouthList();
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/");
      }
    };

    checkAccess();
  }, [navigate]);

  // Fetch youth list
  const fetchYouthList = async () => {
    try {
      const { data, error } = await supabase
        .from("youth")
        .select("id, first_name, last_name, barangay")
        .order("first_name", { ascending: true });

      if (error) throw error;
      setYouthList(data || []);
    } catch (error) {
      console.error("Error fetching youth:", error);
    }
  };

  // Fetch recent scans
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
      console.error("Error fetching scans:", error);
    }
  };

  // ✅ FINAL DUPLICATE CHECK - Checks both attendance and transactions properly
  const checkDuplicate = async (userId, actionType) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Attendance check (for attendance only)
      if (actionType === "attendance") {
        const { data, error } = await supabase
          .from("attendance")
          .select("id")
          .eq("youth_id", userId)
          .gte("created_at", todayStart.toISOString())
          .lte("created_at", todayEnd.toISOString())
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;
        return !!data;
      }

      // Transaction check (for borrow/printing)
      const { data, error } = await supabase
        .from("transaction")
        .select("id")
        .eq("youth_id", userId)
        .eq("service_type", actionType)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;

    } catch (error) {
      console.error("Duplicate check error:", error);
      return false;
    }
  };

  // Calculate age
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Send manual request
  const sendManualRequest = async () => {
    if (!manualRequestReason || !requestType || !selectedYouthId) {
      setErrorMessage("Please complete all fields");
      return;
    }

    setIsLoading(true);

    try {
      const { data: newTransaction, error: tError } = await supabase
        .from("transaction")
        .insert([{
          youth_id: parseInt(selectedYouthId),
          type: "Manual Verification",
          service_type: requestType,
          remarks: manualRequestReason,
          transaction_status: "Pending",
          created_at: new Date().toISOString(),
          processed_by: currentUser?.id || null  // ✅ Fixed column name
        }])
        .select()
        .single();

      if (tError) throw tError;

      // Send notification to chairman
      try {
        const { data: chairman } = await supabase
          .from("users")
          .select("user_id")
          .eq("role_id", 1)
          .maybeSingle();

        if (chairman?.user_id) {
          await supabase.from("notifications").insert([{
            sender_id: currentUser?.id,
            receiver_id: chairman.user_id,
            transaction_id: newTransaction.id,
            message: `Manual verification request: ${manualRequestReason}`,
            type: "manual_verification",
            request_type: requestType,
            status: "pending",
            is_read: false,
            created_at: new Date().toISOString()
          }]);
          console.log("✅ Notification sent to chairman");
        }
      } catch (notifErr) {
        console.log("⚠️ Notification skipped:", notifErr.message);
      }

      setSuccessMessage("Manual verification request submitted!");
      setShowManualRequestModal(false);
      setManualRequestReason("");
      setRequestType("");
      setSelectedYouthId("");
      setSearchYouth("");
      
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error("Manual request error:", error);
      setErrorMessage("Request failed: " + (error.message || "Please try again"));
    } finally {
      setIsLoading(false);
    }
  };

  // Process QR code
  const processQRCode = async (qrData) => {
    if (hasScanned || isProcessingRef.current) return;
    
    setHasScanned(true);
    isProcessingRef.current = true;
    
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      if (!qrData || typeof qrData !== "string") {
        setErrorMessage("Invalid QR format");
        return;
      }
      
      let qrCodeValue = qrData;
      try {
        const parsed = JSON.parse(qrData);
        qrCodeValue = parsed.qr_code || parsed.youth_id || parsed.id || qrData;
      } catch {
        qrCodeValue = qrData.trim();
      }

      console.log("📱 Scanned QR value:", qrCodeValue);

      const { data: youth, error } = await supabase
        .from("youth")
        .select(`id, first_name, last_name, birthdate, barangay, status, qr_code`)
        .eq("qr_code", qrCodeValue)
        .single();

      if (error || !youth) {
        setErrorMessage("User not found. Invalid QR code.");
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

      // Auto-stop scanner after successful scan
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        } catch {
          console.log("Scanner stopped");
        }
      }
      setScanning(false);
      
    } catch (error) {
      console.error("Error processing QR:", error);
      setErrorMessage("Error processing QR");
    } finally {
      setIsLoading(false);
      setHasScanned(false);
      isProcessingRef.current = false;
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
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
      if (!ctx) {
        setErrorMessage("Failed to process image");
        setUploading(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        processQRCode(code.data);
      } else {
        setErrorMessage("No QR code found");
      }
      
      setUploading(false);
      event.target.value = "";
    };

    img.onerror = () => {
      setErrorMessage("Failed to load image");
      setUploading(false);
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  // Start scanner with camera selection
  const startScanner = async () => {
    if (!isAuthorized || mode !== "scan" || scanning || html5QrCodeRef.current) return;

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setErrorMessage("No camera found on this device");
        setMode(null);
        return;
      }

      let cameraId = devices[0]?.id;
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes("back") || 
        d.label.toLowerCase().includes("rear")
      );
      
      if (backCamera) {
        cameraId = backCamera.id;
        console.log("✅ Using back camera:", backCamera.label);
      } else {
        console.log("⚠️ Using default camera:", devices[0]?.label);
      }

      html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      
      const config = {
        fps: 15,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      };

      await html5QrCodeRef.current.start(
        { deviceId: cameraId },
        config,
        (decodedText) => {
          console.log("✅ SCANNED:", decodedText);
          if (!isProcessingRef.current) {
            processQRCode(decodedText);
          }
        },
        (error) => {
          if (error && !error.includes("No MultiFormat Readers")) {
            console.log("Scan error:", error);
          }
        }
      );
      setScanning(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      setErrorMessage("Failed to start camera. Please check permissions and use HTTPS.");
      setMode(null);
    }
  };

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
    setScanning(false);
  };

  const cancelScanning = async () => {
    await stopScanner();
    setMode(null);
    setErrorMessage("");
  };

  // Initialize scanner with delay for DOM readiness
  useEffect(() => {
    if (mode === "scan") {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      if (mode === "scan") {
        stopScanner();
      }
    };
  }, [mode, isAuthorized]);

  // Reset
  const resetToModeSelection = async () => {
    await stopScanner();
    setUserInfo(null);
    setSelectedAction(null);
    setShowConfirmModal(false);
    setErrorMessage("");
    setHasScanned(false);
    isProcessingRef.current = false;
    setMode(null);
  };

  // Handle action selection
  const handleActionSelect = (action) => {
    setSelectedAction(action);
    setShowConfirmModal(true);
  };

  // ✅ FINAL CONFIRM TRANSACTION with all fixes
  const confirmTransaction = async () => {
    // ✅ FIX 2: Lock button to prevent double-click
    if (!userInfo || !selectedAction || isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // ✅ FIX: Use consistent action type for duplicate check
      const actionKey = selectedAction === "printing" ? "printing" : selectedAction;
      const isDuplicate = await checkDuplicate(userInfo.id, actionKey);
      
      if (isDuplicate) {
        let actionMessage = "";
        switch(selectedAction) {
          case "attendance":
            actionMessage = "attendance already recorded";
            break;
          case "borrow":
            actionMessage = "equipment borrowing already recorded";
            break;
          case "printing":
            actionMessage = "printing transaction already recorded";
            break;
          default:
            actionMessage = "transaction already recorded";
        }
        setErrorMessage(`${userInfo.name} has ${actionMessage} today`);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // ✅ FIX 1 & 4: Consistent service_type and correct column name
      const { error: insertError } = await supabase
        .from("transaction")
        .insert([{
          youth_id: userInfo.id,
          type: "Service",
          service_type: selectedAction, // ✅ Direct mapping, no conversion
          transaction_status: "Completed",
          remarks: `QR scan - ${selectedAction}`,
          created_at: new Date().toISOString(),
          processed_by: user?.id || null // ✅ Correct column name
        }]);

      if (insertError) throw insertError;

      // Record in attendance table if attendance action
      if (selectedAction === "attendance") {
        const { error: attendanceError } = await supabase
          .from("attendance")
          .insert([{
            youth_id: userInfo.id,
            method: "QR Code",
            created_at: new Date().toISOString(),
            verified_by: user?.id || null
          }]);

        if (attendanceError) {
          console.error("Error recording attendance:", attendanceError);
        }
      }

      let actionMessage = "";
      switch(selectedAction) {
        case "attendance":
          actionMessage = "Attendance Recorded";
          break;
        case "borrow":
          actionMessage = "Equipment Borrowed";
          break;
        case "printing":
          actionMessage = "Printing Completed";
          break;
        default:
          actionMessage = "Transaction Completed";
      }

      setSuccessMessage(`${actionMessage} for ${userInfo.name}`);
      setShowSuccess(true);
      
      // ✅ FIX 3: Hard stop after success - disable further actions
      setSelectedAction(null);
      setUserInfo(null);
      
      await fetchRecentScans();
      
      setTimeout(() => {
        setShowSuccess(false);
        resetToModeSelection();
      }, 3000);
      
    } catch (error) {
      console.error("Error saving transaction:", error);
      setErrorMessage("Failed to save transaction: " + (error.message || "Please try again"));
      setIsLoading(false);
      setShowConfirmModal(false);
    }
  };

  const cancelTransaction = () => {
    setShowConfirmModal(false);
    setSelectedAction(null);
  };

  // Filter youth list
  const filteredYouth = youthList.filter(youth => 
    `${youth.first_name} ${youth.last_name}`.toLowerCase().includes(searchYouth.toLowerCase()) ||
    youth.barangay?.toLowerCase().includes(searchYouth.toLowerCase())
  );

  if (!isAuthorized) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="scan-qr-page">
        <div className="scan-container">
          {/* Header */}
          <div className="page-header">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <FaArrowLeft />
            </button>
            <div className="header-text">
              <h2>QR Code Scanner</h2>
              <p>Scan or upload QR code to record transactions</p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {showSuccess && (
            <div className="success-toast">
              <FaCheckCircle className="success-icon" />
              <div>
                <strong>Success!</strong>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="error-message">
              <FaTimesCircle className="error-icon" />
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage("")}>Dismiss</button>
            </div>
          )}

          <div className="scan-content">
            {/* Left Column */}
            <div className="scanner-column">
              {/* Mode Selection */}
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
                  <button onClick={() => setShowManualRequestModal(true)} className="manual-request-btn">
                    Manual Verification Request
                  </button>
                </div>
              )}

              {/* Scan Mode */}
              {mode === "scan" && !userInfo && (
                <>
                  <div className="scanner-wrapper">
                    <div id="qr-reader" className="qr-reader"></div>
                    <div className="scan-overlay">
                      <div className="scan-frame"></div>
                      <p>Position QR code within the frame</p>
                      <small className="scan-hint">Move closer and ensure good lighting</small>
                    </div>
                  </div>
                  {isLoading && (
                    <div className="scanning-status">
                      <FaSpinner className="spinner-small" />
                      <p>Processing...</p>
                    </div>
                  )}
                  <div className="scanner-buttons">
                    <button onClick={cancelScanning} className="cancel-scan-btn">
                      <FaStop /> Cancel Scanning
                    </button>
                    <button onClick={resetToModeSelection} className="change-mode-btn">
                      ← Change Mode
                    </button>
                  </div>
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
                    <input type="file" accept="image/*" onChange={handleFileUpload} hidden disabled={uploading} />
                  </label>
                  {uploading && (
                    <div className="uploading-status">
                      <FaSpinner className="spinner-small" />
                      <p>Processing...</p>
                    </div>
                  )}
                  <button onClick={resetToModeSelection} className="change-mode-btn">
                    ← Change Mode
                  </button>
                </div>
              )}

              {/* User Info Card */}
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
                      <button onClick={() => handleActionSelect("attendance")} className="action-option attendance">
                        <FaClipboardList />
                        <span>Seminar Attendance</span>
                      </button>
                      <button onClick={() => handleActionSelect("borrow")} className="action-option borrow">
                        <FaTools />
                        <span>Equipment Borrowing</span>
                      </button>
                      <button onClick={() => handleActionSelect("printing")} className="action-option printing">
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

            {/* Right Column - Recent */}
            <div className="history-column">
              <div className="recent-scans-card">
                <h3><FaHistory className="history-icon" /> Recent Transactions</h3>
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
                <p className="confirm-warning">This action will be recorded and cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button onClick={cancelTransaction} className="cancel-confirm-btn">Cancel</button>
                <button onClick={confirmTransaction} className="confirm-btn" disabled={isLoading}>
                  {isLoading ? <FaSpinner className="spinner-small" /> : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Verification Modal */}
        {showManualRequestModal && (
          <div className="modal-overlay">
            <div className="modal-content large">
              <div className="modal-header">
                <h3>Manual Verification Request</h3>
                <button className="close-btn" onClick={() => setShowManualRequestModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                {/* Youth Selection */}
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
                    {filteredYouth.length > 0 ? (
                      filteredYouth.map(youth => (
                        <div
                          key={youth.id}
                          className={`youth-item ${selectedYouthId === youth.id.toString() ? 'selected' : ''}`}
                          onClick={() => setSelectedYouthId(youth.id.toString())}
                        >
                          <strong>{youth.first_name} {youth.last_name}</strong>
                          <span>{youth.barangay}</span>
                        </div>
                      ))
                    ) : (
                      <p className="no-results">No youth found</p>
                    )}
                  </div>
                  {selectedYouthId && (
                    <div className="selected-youth">
                      Selected: {youthList.find(y => y.id.toString() === selectedYouthId)?.first_name} {youthList.find(y => y.id.toString() === selectedYouthId)?.last_name}
                    </div>
                  )}
                </div>

                {/* Request Type */}
                <div className="form-group">
                  <label>Request Type *</label>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="form-select">
                    <option value="">Select request type</option>
                    <option value="attendance">Attendance Verification</option>
                    <option value="borrow">Equipment Borrowing</option>
                    <option value="printing">Printing Service</option>
                  </select>
                </div>

                {/* Reason */}
                <div className="form-group">
                  <label>Reason / Details *</label>
                  <textarea
                    rows="4"
                    placeholder="Please provide details for your request..."
                    value={manualRequestReason}
                    onChange={(e) => setManualRequestReason(e.target.value)}
                  />
                </div>

                <p className="request-info">
                  This request will be sent to the SK Chairman for review and approval.
                </p>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowManualRequestModal(false)}>Cancel</button>
                <button onClick={sendManualRequest} disabled={isLoading}>
                  {isLoading ? <FaSpinner className="spinner-small" /> : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}