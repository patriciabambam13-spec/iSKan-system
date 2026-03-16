import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dmvifdmzmcqktcxopriy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtdmlmZG16bWNxa3RjeG9wcml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MjQyMzAsImV4cCI6MjA4OTIwMDIzMH0.E3qzphK-p61p4qxaKOGu-cCDVn5x_fVbJCDWBKoP6YI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);