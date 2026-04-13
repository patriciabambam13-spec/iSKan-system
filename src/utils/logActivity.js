import { supabase } from "../services/supabaseClient";

export const logActivity = async ({
  action,
  table,
  recordId = null,
  details = "",
  oldData = null,
  newData = null
}) => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    // Get user role from localStorage or fetch from database
    const userRole = localStorage.getItem("userRole");
    
    // Get user name if available
    const userName = localStorage.getItem("userName");

    const logEntry = {
      user_id: userData?.user?.id || null,
      user_email: userData?.user?.email || null,
      user_name: userName,
      user_role: userRole ? (userRole === "1" ? "chairman" : "kagawad") : "unknown",
      action: action.toUpperCase(),
      table_name: table,
      record_id: recordId,
      details: details,
      old_data: oldData,
      new_data: newData,
      ip_address: "local"
    };

    console.log("📝 LOGGING ATTEMPT:", logEntry);

    const { data, error } = await supabase
      .from("audit_logs")
      .insert([logEntry])
      .select();

    if (error) {
      console.error("❌ INSERT ERROR:", error.message);
      console.error("Error details:", error);
      throw error;
    }

    console.log("✅ LOG INSERTED SUCCESSFULLY:", data);
    return { success: true, data };

  } catch (err) {
    console.error("🔥 LOG ACTIVITY ERROR:", err.message);
    return { success: false, error: err.message };
  }
};

// Test function to verify logging works
export const testLogActivity = async () => {
  console.log("🧪 TESTING logActivity...");
  const result = await logActivity({
    action: "TEST",
    table: "test",
    details: "This is a test log entry - delete me later",
    recordId: "test-123"
  });
  console.log("Test result:", result);
  return result;
};