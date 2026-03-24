import { useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../services/supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { FaPrint, FaDownload, FaUserPlus } from "react-icons/fa";
import "../styles/registerYouth.css";

export default function RegisterYouth() {

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

        if(!formData.id_type)
        newErrors.id_type="Type of ID is required";

        if(!formData.confirmed)
        newErrors.confirmed="You must confirm the information";

    setErrors(newErrors);
    return Object.keys(newErrors).length===0;

    }

//QR generation - not yet useful/functional for database
  async function handleSubmit(e){

      e.preventDefault();

      if(!validateForm()) return;
      try{

      const { data, error } = await supabase
      .from("youth")
      .insert([{

        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,

        birthdate: formData.birthdate || null,
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender,

        address: formData.address,
        purok: formData.purok,
        barangay: formData.barangay,
        residency_status: formData.residency_status,

        years_residency: formData.years_residency
        ? Number(formData.years_residency)
        : null,

        contact: formData.contact,
        email: formData.email || null,

        id_type: formData.id_type,
        id_number: formData.id_number || null

      }])
      .select()
      .single();

      if(error){
      console.error("Supabase insert error:", error.message, error.details);
      alert("Error saving youth data");
      return;
    }
//youth identifier

    const year = new Date().getFullYear();
    const paddedID = String(data.id).padStart(4,"0");
    const youthID = `ISK-${year}-${paddedID}`;

//supabase update
    const { error: updateError } = await supabase
        .from("youth")
        .update({ qr_code: youthID })
        .eq("id", data.id);

    if(updateError){
        console.error(updateError);
        alert("Error generating QR identifier");
        return;
    }

//modal 
    setQrCode(youthID);
    setShowQR(true);

      console.log("Generated Youth ID:", youthID);
    }catch(err){

      console.error(err);
      alert("Unexpected error occurred");

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
  }

  function registerAnother(){

      setShowQR(false);
      setFormData(initialForm);
      setErrors({});
  }

//page
return(

<> 
    <Navbar/>

    <div className="page-header">

      <button className="back-btn" onClick={()=>window.history.back()}>
      ←
      </button>

      <div>
      <h2>Add Youth</h2>
      <p>Register a new youth and generate QR ID</p>
      </div>

    </div>

  <form onSubmit={handleSubmit} className="register-form">

{/* Section1*/}

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

{/* section2 */}

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
      <label>
      Years of Residency (Optional)
      </label>

      <input
      type="number"
      name="years_residency"
      value={formData.years_residency}
      onChange={handleChange}
      placeholder="Enter years"
      />
</div>

{/* section3 */}

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
      <label>Email (Optional)</label>
      <input name="email" value={formData.email} onChange={handleChange}/>
    </div>

     </div>

  </div>


{/* section4 */}

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


{/* confirmaion */}

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


{/* buttons */}

<div className="form-buttons">
      <button type="button" className="cancel-btn" onClick={handleCancel}>
      Cancel
      </button>

      <button type="button" className="clear-btn" onClick={clearForm}>
      Clear Form
      </button>

      <button type="submit" className="save-btn">
      Save & Generate QR
      </button>
</div>

</form>


{/* QR Modal */}

{showQR && qrCode && (

  <div className="overlay">
  <div className="qr-modal">

    <h2 className="qr-title">Youth Successfully Registered!</h2>
    <p className="qr-sub">
    The QR Code has been generated below.
    </p>

  <div className="qr-container">
  <div className="qr-frame">

    <QRCodeCanvas
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

</>
);
}