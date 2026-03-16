import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaArrowLeft } from "react-icons/fa";

import skbg from "../assets/sk-bg.png";
import skLogo from "../assets/sk-logo.png";
import qclogo from "../assets/qc-logo.png";
import sklogoo from "../assets/sk-logoo.png";


/*Forgot password notification*/
function ForgotPassword() {

  const [email, setEmail] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      "Password reset email sent. The IT administrator will contact you soon through your registered email."
    );

    setEmail("");
  };

  return (

    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>

      {/* leftside part */}

      <div
        style={{
          flex: 1,
          backgroundImage: `url(${skbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />

      {/* right side part */}

      <div
        style={{
          width: "550px",
          backgroundColor: "#FFFBF2",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px"
        }}
      >

        {/* top part logos */}

        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img src={qclogo} width="100" />
          <img src={skLogo} width="100" style={{ margin: "0 10px" }} />
          <img src={sklogoo} width="100" />
        </div>

        <p
          style={{
            color: "#FF0000",
            textAlign: "center",
            fontWeight: "bold",
            marginBottom: "30px"
          }}
        >
          For authorized SK officials only.
        </p>

        <h3 style={{ marginBottom: "20px" }}>
          FORGOT YOUR PASSWORD?
        </h3>

        <p style={{ marginBottom: "40px" }}>
          Enter your registered email address below, and we will send you
          a secure link to reset your password.
        </p>

        <form onSubmit={handleReset}>

          <label>
            Email <span style={{ color: "#FF0000" }}>*</span>
          </label>

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          
          <button
            type="submit"
            style={{
              marginTop: "40px",
              width: "100%",
              backgroundColor: "#032541",
              color: "white",
              padding: "12px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Send Email
          </button>

        </form>

        {/* back button  */}

        <div style={{ marginTop: "20px" }}>
          <Link
            to="/"
            style={{
              color: "#20639B",
              textDecoration: "underline",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <FaArrowLeft />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

/* input fields */
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "6px",
  borderRadius: "6px",
  border: "1px solid #832200",
  backgroundColor: "#FDFFCA"
};

export default ForgotPassword;