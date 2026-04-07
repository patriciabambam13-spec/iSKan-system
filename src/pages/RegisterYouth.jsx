import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { FaPrint, FaDownload, FaUserPlus } from "react-icons/fa";
import Webcam from "react-webcam";
import emailjs from "emailjs-com";
import { logActivity } from "../utils/logActivity";
import "../styles/registerYouth.css";

export default function RegisterYouth() {

  const webcamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialForm = {
        first_name:"",
        middle_name:"",
        last_name:"",
        birthdate:"",
        age:"",
        gender:"",
        address:"",
        purok:"",
        barangay:"Barangay Pinagkaisahan",
        zip_code:"1111",
        residency_status:"",
        years_residency:"",
        contact:"",
        email:"",
        id_type:"",
        id_number:"",
        confirmed:false
  };

  const [formData,setFormData] = useState(initialForm);
  const [errors,setErrors] = useState({});
  const [showQR,setShowQR] = useState(false);
  const [qrCode,setQrCode] = useState("");
  const navigate = useNavigate();

  // EmailJS Configuration
  const EMAILJS_SERVICE_ID = "service_a12wwvo";
  const EMAILJS_TEMPLATE_ID = "template_ful4p1w";
  const EMAILJS_PUBLIC_KEY = "AiVA87OL8ncNSEPN4";

  // Function to get QR code as base64 image
  const getQRImage = () => {
    const canvas = document.getElementById("qrCanvas");
    if (canvas) {
      return canvas.toDataURL("image/png");
    }
    return null;
  };

  //functions
  function handleChange(e){
    const {name,value,type,checked} = e.target;
    const newValue = type==="checkbox" ? checked : value;

    setFormData(prev=>({
      ...prev,
      [name]:newValue
    }));

    if(name==="birthdate"){
      calculateAge(value);
    }
  } 

  //age functionality
  function calculateAge(date){
    if(!date) return;
    const today = new Date();
    const birth = new Date(date);

    let age = today.getFullYear()-birth.getFullYear();
    const m = today.getMonth()-birth.getMonth();

    if(m<0 || (m===0 && today.getDate()<birth.getDate())){
      age--;
    }

    if(age<12 || age>25){
      setErrors(prev=>({
        ...prev,
        birthdate:"Youth age must be between 12 and 25"
      }));
      setFormData(prev=>({
        ...prev,
        age:""
      }));
      return;
    }

    setErrors(prev=>({...prev,birthdate:""}));
    setFormData(prev=>({
      ...prev,
      age
    }));
  }

  //capture photo function
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPhoto(imageSrc);
  };

  //form validation
  function validateForm(){
    let newErrors={};

    if(!formData.first_name)
      newErrors.first_name="First name is required";

    if(!formData.last_name)
      newErrors.last_name="Last name is required";

    if(!formData.birthdate)
      newErrors.birthdate="Birthdate is required";

    if(!formData.gender)
      newErrors.gender="Gender is required";

    if(!formData.address)
      newErrors.address="Complete address is required";

    if(!formData.purok)
      newErrors.purok="Purok / Zone is required";

    if(!formData.residency_status)
      newErrors.residency_status="Residency status is required";

    if(!formData.contact)
      newErrors.contact="Contact number is required";

    if(!formData.email) {
      newErrors.email="Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
    }

    if(!formData.id_type)
      newErrors.id_type="Type of ID is required";

    if(!formData.confirmed)
      newErrors.confirmed="You must confirm the information";

    setErrors(newErrors);
    return Object.keys(newErrors).length===0;
  }

  // Function to upload photo to Supabase storage
  async function uploadPhoto() {
    if (!photo) return null;

    try {
      const blob = await fetch(photo).then(res => res.blob());
      
      const fileName = `youth_${Date.now()}.jpg`;
      const filePath = fileName;

      console.log("Attempting to upload to bucket 'youth-photos' with path:", filePath);

      const { error: uploadError } = await supabase.storage
        .from("youth-photos")
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error("Storage bucket 'youth-photos' not found. Please create it in Supabase dashboard.");
        }
        if (uploadError.message.includes("row-level security policy")) {
          throw new Error("Storage permission denied. Please check RLS policies for youth-photos bucket.");
        }
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("youth-photos")
        .getPublicUrl(filePath);

      console.log("Photo uploaded successfully. URL:", publicUrlData.publicUrl);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Photo upload failed:", error);
      throw error;
    }
  }

  // Function to send email with QR code image
  async function sendEmailWithQR(youthID, youthName, youthEmail) {
    try {
      const qrImage = getQRImage();
      
      if (!qrImage) {
        console.warn("QR image not ready, sending without image");
      }

      const templateParams = {
        to_email: youthEmail,
        to_name: youthName,
        qr_code: youthID,
        qr_image: qrImage || "",
        message: `Your Youth ID has been successfully registered. Your QR Code ID is: ${youthID}.`
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      
      console.log("Email sent successfully with QR image:", response);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Registration successful but email sending failed. QR code is still available.");
      return false;
    }
  }

  // Main submit handler
  async function handleSubmit(e){
    e.preventDefault();
    
    if(!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.log("Auth check:", userError.message);
      } else if (!user) {
        console.log("User is not authenticated. Storage upload may fail.");
      } else {
        console.log("Authenticated user:", user.email);
      }

      let photoUrl = null;
      if (photo) {
        try {
          photoUrl = await uploadPhoto();
        } catch (uploadError) {
          console.error("Photo upload failed:", uploadError);
          alert(`Photo upload failed: ${uploadError.message}\n\nPlease ensure:
1. The 'youth-photos' bucket exists in Supabase
2. The bucket is set to public
3. You have proper RLS policies set up`);
          setIsSubmitting(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from("youth")
        .insert([{
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          birthdate: formData.birthdate || null,
          age: formData.age ? Number(formData.age) : null,
          gender: formData.gender,
          address: formData.address,
          purok: formData.purok,
          barangay: formData.barangay,
          zip_code: formData.zip_code,
          residency_status: formData.residency_status,
          years_residency: formData.years_residency ? Number(formData.years_residency) : null,
          contact: formData.contact,
          email: formData.email,
          id_type: formData.id_type,
          id_number: formData.id_number || null,
          photo_url: photoUrl
        }])
        .select()
        .single();

      if(error){
        console.error("Supabase insert error:", error.message, error.details);
        
        if (error.message.includes("row-level security policy")) {
          alert("Database permission denied. Please check Supabase RLS policies for the youth table.");
        } else {
          alert("Error saving youth data: " + error.message);
        }
        setIsSubmitting(false);
        return;
      }
      
      const year = new Date().getFullYear();
      const paddedID = String(data.id).padStart(4,"0");
      const youthID = `ISK-${year}-${paddedID}`;

      const { error: updateError } = await supabase
        .from("youth")
        .update({ qr_code: youthID })
        .eq("id", data.id);

      if(updateError){
        console.error("QR code update error:", updateError);
        alert("Error generating QR identifier but youth was saved.");
        setIsSubmitting(false);
        return;
      }

      // Log successful registration
      await logActivity({
        action: "CREATE",
        table: "youth",
        recordId: data.id,
        details: `New youth registered: ${formData.first_name} ${formData.last_name} with ID: ${youthID}`
      });

      setQrCode(youthID);
      setShowQR(true);
      
      setTimeout(async () => {
        const fullName = `${formData.first_name} ${formData.last_name}`.trim();
        await sendEmailWithQR(youthID, fullName, formData.email);
      }, 500);
      
      setIsSubmitting(false);
      console.log("Registration successful. Youth ID:", youthID);
      
    } catch(err){
      console.error("Unexpected error:", err);
      
      await logActivity({
        action: "CREATE_ERROR",
        table: "youth",
        recordId: null,
        details: `Failed to register youth: ${err.message}`
      });
      
      alert("Unexpected error occurred: " + err.message);
      setIsSubmitting(false);
    }
  }

  //buttons
  function handleCancel(){
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel registration?"
    );
    if(confirmCancel){
      window.history.back();
    }
  }

  function clearForm(){
    setFormData(initialForm);
    setErrors({});
    setPhoto(null);
  }

  function registerAnother(){
    setShowQR(false);
    setFormData(initialForm);
    setErrors({});
    setPhoto(null);
  }

  //page
  return(
    <> 
      <Navbar/>
      
      {/* Main Container - matches manage youth */}
      <div className="register-container">
        
        {/* Header - matches manage youth exactly */}
        <div className="page-header">
          <button className="back-btn" aria-label="Go back" onClick={() => navigate(-1)}>←</button>
          <div className="header-text">
            <h2>Add Youth</h2>
            <p>Register a new youth and generate QR ID</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {/* Section1 - Personal Information */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-number">1</span>
              <h3>Personal Information</h3>
            </div>
            <div className="grid-3">
              <div>
                <label>First Name <span className="req">*</span></label>
                <input name="first_name" value={formData.first_name} onChange={handleChange}/>
                {errors.first_name && <p className="error">{errors.first_name}</p>}
              </div>

              <div>
                <label>Middle Name</label>
                <input name="middle_name" value={formData.middle_name} onChange={handleChange}/>
              </div>

              <div>
                <label>Last Name <span className="req">*</span></label>
                <input name="last_name" value={formData.last_name} onChange={handleChange}/>
                {errors.last_name && <p className="error">{errors.last_name}</p>}
              </div>

              <div>
                <label>Birth Date <span className="req">*</span></label>
                <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange}/>
                {errors.birthdate && <p className="error">{errors.birthdate}</p>}
              </div>

              <div>
                <label>Age</label>
                <input value={formData.age} disabled className="disabled-field"/>
              </div>

              <div>
                <label>Gender <span className="req">*</span></label>
                <select name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
                {errors.gender && <p className="error">{errors.gender}</p>}
              </div>
            </div>
          </div>

          {/* Section2 - Residency Information */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-number">2</span>
              <h3>Residency Information</h3>
            </div>

            <div>
              <label>Complete Address <span className="req">*</span></label>
              <textarea name="address" value={formData.address} onChange={handleChange}/>
              {errors.address && <p className="error">{errors.address}</p>}
            </div>

            <div className="grid-3">
              <div>
                <label>Purok / Zone <span className="req">*</span></label>
                <input name="purok" value={formData.purok} onChange={handleChange}/>
                {errors.purok && <p className="error">{errors.purok}</p>}
              </div>

              <div>
                <label>Barangay</label>
                <input value="Barangay Pinagkaisahan" disabled className="disabled-field"/>
              </div>

              <div>
                <label>Residency Status <span className="req">*</span></label>
                <select name="residency_status" value={formData.residency_status} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>Permanent</option>
                  <option>Temporary</option>
                </select>
                {errors.residency_status && <p className="error">{errors.residency_status}</p>}
              </div>
            </div>
            
            <div className="grid-2">
              <div>
                <label>Years of Residency (Optional)</label>
                <input
                  type="number"
                  name="years_residency"
                  value={formData.years_residency}
                  onChange={handleChange}
                  placeholder="Enter years"
                />
              </div>

              <div>
                <label>ZIP Code</label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  disabled
                  className="disabled-field"
                  placeholder="1111"
                />
              </div>
            </div>
          </div>

          {/* Section3 - Contact Information */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-number">3</span>
              <h3>Contact Information</h3>
            </div>

            <div className="grid-2">
              <div>
                <label>Contact Number <span className="req">*</span></label>
                <input name="contact" value={formData.contact} onChange={handleChange}/>
                {errors.contact && <p className="error">{errors.contact}</p>}
              </div>

              <div>
                <label>Email <span className="req">*</span></label>
                <input 
                  type="email"
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
                {errors.email && <p className="error">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Section4 - Identity Verification */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-number">4</span>
              <h3>Identity Verification</h3>
            </div>

            <div className="grid-2">
              <div>
                <label>Type of ID presented <span className="req">*</span></label>
                <select name="id_type" value={formData.id_type} onChange={handleChange}>
                  <option value="">Select</option>
                  <option>National ID</option>
                  <option>School ID</option>
                  <option>Barangay ID</option>
                </select>
                {errors.id_type && <p className="error">{errors.id_type}</p>}
              </div>

              <div>
                <label>ID Number (Optional)</label>
                <input name="id_number" value={formData.id_number} onChange={handleChange}/>
              </div>
            </div>
          </div>

          {/* Section5 - Youth Photo with Webcam */}
          <div className="section-card">
            <div className="section-title">
              <span className="section-number">5</span>
              <h3>Youth Photo</h3>
            </div>

            {!photo ? (
              <>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: "user"
                  }}
                />
                <button type="button" onClick={capturePhoto} className="capture-btn">
                  Capture Photo
                </button>
              </>
            ) : (
              <div className="photo-preview">
                <img src={photo} alt="Captured" className="captured-photo" />
                <button type="button" onClick={() => setPhoto(null)} className="retake-btn">
                  Retake Photo
                </button>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div className="confirmation">
            <label className="confirm-row">
              <input
                type="checkbox"
                name="confirmed"
                checked={formData.confirmed}
                onChange={handleChange}
              />
              <span>
                I confirm that the youth's information has been verified and all documents presented are authentic.
              </span>
            </label>
          </div>
          {errors.confirmed && <p className="error center">{errors.confirmed}</p>}

          {/* Buttons */}
          <div className="form-buttons">
            <button type="button" className="cancel-btn" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </button>

            <button type="button" className="clear-btn" onClick={clearForm} disabled={isSubmitting}>
              Clear Form
            </button>

            <button type="submit" className="save-btn" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save & Generate QR"}
            </button>
          </div>
        </form>

        {/* QR Modal */}
        {showQR && qrCode && (
          <div className="overlay">
            <div className="qr-modal">
              <h2 className="qr-title">Youth Successfully Registered!</h2>
              <p className="qr-sub">
                The QR Code has been generated and sent to {formData.email}
              </p>

              <div className="qr-container">
                <div className="qr-frame">
                  <QRCodeCanvas 
                    id="qrCanvas"
                    value={qrCode} 
                    size={200} 
                  />
                </div>
                <p className="qr-id">{qrCode}</p>
              </div>

              <div className="qr-buttons">
                <button className="btn-print" onClick={() => window.print()}>
                  <FaPrint /> Print QR
                </button>

                <button className="btn-download" onClick={() => navigator.clipboard.writeText(qrCode)}>
                  <FaDownload /> Download QR
                </button>

                <button className="btn-register" onClick={registerAnother}>
                  <FaUserPlus /> Register Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}