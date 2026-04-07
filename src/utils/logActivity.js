import { supabase } from "../services/supabaseClient";

export const logActivity = async ({
  action,
  table,
  recordId = null,
  details = "",
 
}) => {
  try {
    const { data: userData } = await supabase.auth.getUser();

    // Match EXACTLY with your audit_logs table schema
    const logEntry = {
      user_id: userData?.user?.id || null,
      user_role: "admin", // You can modify this based on user's actual role
      action: action.toUpperCase(), // Standardize to UPPERCASE (CREATE, UPDATE, DELETE)
      table_name: table,
      record_id: recordId,
      details: details,
      ip_address: "local", // Replace with actual IP detection if needed
      created_at: new Date().toISOString()
    };

    // DEBUGGING: Log what we're trying to insert
    console.log("📝 LOGGING ATTEMPT:", logEntry);

    const { data, error } = await supabase
      .from("audit_logs")
      .insert([logEntry])
      .select(); // Returns the inserted record

    if (error) {
      // DEBUGGING: Log the exact error
      console.error("❌ INSERT ERROR:", error.message);
      console.error("Error details:", error);
      throw error;
    }

    // DEBUGGING: Confirm successful insert
    console.log("✅ LOG INSERTED SUCCESSFULLY:", data);
    return { success: true, data };

  } catch (err) {
    // DEBUGGING: Log any caught errors
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