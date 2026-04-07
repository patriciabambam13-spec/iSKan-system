import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import "../styles/login.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";
import { logActivity } from "../utils/logActivity";

import skLogo from "../assets/sk-logo.png";
import skbg from "../assets/sk-bg.png";
import qclogo from "../assets/qc-logo.png";
import sklogoo from "../assets/sk-logoo.png";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    if (loginAttempts >= 3) {
      toast.error("Too many incorrect attempts. Please contact the IT administrator.");
      await logActivity({
        action: "LOGIN_BLOCKED",
        table: "auth",
        recordId: null,
        details: `Login blocked for email: ${email} - exceeded maximum attempts`
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, check if user exists in your users table
      const { data: userCheck, error: userCheckError } = await supabase
        .from("users")
        .select("email, role_id, user_status")
        .eq("email", email)
        .single();

      if (userCheckError || !userCheck) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        await logActivity({
          action: "LOGIN_FAILED",
          table: "auth",
          recordId: null,
          details: `Failed login attempt ${newAttempts} of 3 for email: ${email} - User not found in users table`
        });

        toast.error(`Email not found. Attempt ${newAttempts} of 3.`);
        setIsLoading(false);
        return;
      }

      // Check if user is active
      if (userCheck.user_status !== 'active') {
        toast.error("Your account is inactive. Please contact the administrator.");
        await logActivity({
          action: "LOGIN_FAILED",
          table: "auth",
          recordId: null,
          details: `Inactive account login attempt for email: ${email}`
        });
        setIsLoading(false);
        return;
      }

      // Attempt authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        await logActivity({
          action: "LOGIN_FAILED",
          table: "auth",
          recordId: null,
          details: `Failed login attempt ${newAttempts} of 3 for email: ${email} - ${error.message}`
        });

        if (newAttempts >= 3) {
          toast.error("Login failed 3 times. Please contact the IT administrator.");
        } else {
          toast.error(`Incorrect password. Attempt ${newAttempts} of 3.`);
        }
        
        setIsLoading(false);
        return;
      }

      // Login successful
      const user = data.user;

      // Verify the user exists in your users table with correct role
      const { data: userData, error: userDataError } = await supabase
        .from("users")
        .select("role_id, first_name, last_name, user_status")
        .eq("user_id", user.id)
        .single();

      if (userDataError || !userData) {
        toast.error("User profile not found. Please contact administrator.");
        await logActivity({
          action: "LOGIN_FAILED",
          table: "auth",
          recordId: user.id,
          details: `User ${email} authenticated but profile not found in users table`
        });
        
        // Sign out since user exists in auth but not in users table
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Store user info in localStorage for persistence
      localStorage.setItem('userRole', userData.role_id);
      localStorage.setItem('userName', `${userData.first_name} ${userData.last_name}`);
      localStorage.setItem('userId', user.id);

      await logActivity({
        action: "LOGIN_SUCCESS",
        table: "auth",
        recordId: user.id,
        details: `User ${email} logged in successfully with role_id: ${userData.role_id}`
      });

      toast.success(`Welcome back, ${userData.first_name}! Redirecting...`);

      // Redirect based on role_id
      setTimeout(() => {
        if (userData.role_id === 1) {
          navigate("/chairman-dashboard");
        } else if (userData.role_id === 2) {
          navigate("/kagawad-dashboard");
        } else {
          // Default redirect or handle other roles
          toast.error("Unknown user role. Please contact administrator.");
          supabase.auth.signOut();
        }
      }, 1200);

    } catch (error) {
      console.error("Login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      
      await logActivity({
        action: "LOGIN_ERROR",
        table: "auth",
        recordId: null,
        details: `Unexpected error during login for email: ${email} - ${error.message}`
      });
      
      setIsLoading(false);
    }
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
        {/* top logos */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img src={qclogo} width="100" alt="QC Logo" />
          <img src={skLogo} width="100" style={{ margin: "0 10px" }} alt="SK Logo" />
          <img src={sklogoo} width="100" alt="SK Logo" />
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
          <label>
            Email <span style={{ color: "#FF0000" }}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="Enter your email address"
            required
            disabled={isLoading}
          />

          <label style={{ marginTop: "25px" }}>
            Password <span style={{ color: "#FF0000" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
            <span
              onClick={() => !isLoading && setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "14px",
                color: "#7A601D",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontSize: "18px"
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "50px",
              width: "100%",
              backgroundColor: isLoading ? "#cccccc" : "#032541",
              color: "white",
              padding: "12px",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

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

/* input fields */  
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "6px",
  borderRadius: "6px",
  border: "1px solid #832200",
  backgroundColor: "#FDFFCA",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.3s"
};

export default Login;