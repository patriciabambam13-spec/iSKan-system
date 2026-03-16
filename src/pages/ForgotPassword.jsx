import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import skbg from "../assets/sk-bg.png";
import skLogo from "../assets/sk-logo.png";
import qclogo from "../assets/qc-logo.png";
import sklogoo from "../assets/sk-logoo.png";

function ForgotPassword(){

  const [email,setEmail] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if(error){
      toast.error(error.message);
    }else{
      toast.success(
        "Password reset request sent. The IT administrator will contact you through your registered email shortly."
      );
    }
  };

  return(

    <div style={{ display:"flex", height:"100vh", width:"100vw" }}>

      {/* LEFT IMAGE PANEL */}

      <div
        style={{
          flex:1,
          backgroundImage:`url(${skbg})`,
          backgroundSize:"cover",
          backgroundPosition:"center",
          backgroundRepeat:"no-repeat"
        }}
      />

      {/* RIGHT PANEL */}

      <div
        style={{
          width:"550px",
          backgroundColor:"#FFFBF2",
          display:"flex",
          flexDirection:"column",
          justifyContent:"center",
          padding:"90px"
        }}
      >

        {/* LOGOS */}

        <div style={{ textAlign:"center", marginBottom:"30px" }}>
          <img src={qclogo} width="100"/>
          <img src={skLogo} width="100" style={{margin:"0 10px"}}/>
          <img src={sklogoo} width="100"/>
        </div>

        <p
          style={{
            color:"#FF0000",
            textAlign:"center",
            fontWeight:"bold",
            marginBottom:"30px"
          }}
        >
          For authorized SK officials only.
        </p>

        <h3 style={{ marginBottom:"20px" }}>
          Forgot your password?
        </h3>

        <p style={{ marginBottom:"40px", fontSize:"14px" }}>
          Enter your registered email address below and the IT administrator
          will assist you in resetting your password.
        </p>

        <form onSubmit={handleReset}>

          <label>
            Email <span style={{ color:"#FF0000" }}>*</span>
          </label>

          <input
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              marginTop:"40px",
              width:"100%",
              backgroundColor:"#032541",
              color:"white",
              padding:"12px",
              border:"none",
              borderRadius:"6px",
              fontWeight:"bold",
              cursor:"pointer"
            }}
          >
            Send Request
          </button>

        </form>

        {/* BACK TO LOGIN */}

        <div style={{ marginTop:"20px" }}>

          <Link
            to="/"
            style={{
              color:"#20639B",
              textDecoration:"underline",
              display:"flex",
              alignItems:"center",
              gap:"6px"
            }}
          >
            ← Back to Login
          </Link>

        </div>

        <p
          style={{
            textAlign:"center",
            marginTop:"50px",
            fontSize:"12px"
          }}
        >
          iSKan v1.0 | Barangay Pinagkaisahan | For Authorized Users Only
        </p>

      </div>

    </div>

  );
}

const inputStyle = {
  width:"100%",
  padding:"12px",
  marginTop:"6px",
  borderRadius:"6px",
  border:"1px solid #832200",
  backgroundColor:"#FDFFCA"
};

export default ForgotPassword;