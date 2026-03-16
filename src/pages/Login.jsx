import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";

import skLogo from "../assets/sk-logo.png";
import skbg from "../assets/sk-bg.png";
import qclogo from "../assets/qc-logo.png";
import sklogoo from "../assets/sk-logoo.png";

function Login() {

  const navigate = useNavigate();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loginAttempts >= 3) {
      toast.error("Too many incorrect attempts. Please contact the IT administrator.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {

      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= 3) {
        toast.error("Login failed 3 times. Please contact the IT administrator using Forgot Password.");
      } else {
        toast.error(`Incorrect email or password. Attempt ${newAttempts} of 3.`);
      }

      return;
    }

    /* SUCCESS LOGIN NOTIFICATION */

    toast.success("Login successful! Redirecting...");

    const user = data.user;

    const { data: userData } = await supabase
      .from("users")
      .select("role_id")
      .eq("user_id", user.id)
      .single();

    setTimeout(() => {
      if (userData.role_id === 1) {
        navigate("/chairman-dashboard");
      } else {
        navigate("/kagawad-dashboard");
      }
    }, 1200);

  };

  return (

    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>

      {/* LEFT SIDE IMAGE */}

      <div
        style={{
          flex: 1,
          backgroundImage: `url(${skbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />

      {/* RIGHT LOGIN PANEL */}

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

        {/* LOGOS */}

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

        <p style={{ marginBottom: "40px" }}>Sign-in to your account.</p>

        <form onSubmit={handleLogin}>

          {/* USER ID */}

          <label>
            User ID <span style={{ color: "#FF0000" }}>*</span>
          </label>

          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={inputStyle}
            required
          />

          {/* EMAIL */}

          <label style={{ marginTop: "25px" }}>
            Email <span style={{ color: "#FF0000" }}>*</span>
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />

          {/* PASSWORD */}

          <label style={{ marginTop: "25px" }}>
            Password <span style={{ color: "#FF0000" }}>*</span>
          </label>

          <div style={{ position: "relative" }}>

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position:"absolute",
                right:"10px",
                top:"14px",
                color:"#7A601D",
                cursor:"pointer",
                fontSize:"18px"
              }}
            >
              {showPassword ? <FaEyeSlash/> : <FaEye/>}
            </span>

          </div>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            style={{
              marginTop: "50px",
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
            Login
          </button>

        </form>

        {/* FORGOT PASSWORD */}

        <div style={{ textAlign: "center", marginTop: "15px" }}>
          <Link
            to="/forgot-password"
            style={{
              color: "#20639B",
              textDecoration: "underline"
            }}
          >
            Forgot Password? Contact Admin
          </Link>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "50px",
            fontSize: "12px"
          }}
        >
          iSKan v1.0 | Barangay Pinagkaisahan | For Authorized Users Only
        </p>

      </div>

    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "6px",
  borderRadius: "6px",
  border: "1px solid #832200",
  backgroundColor: "#FDFFCA"
};

export default Login;