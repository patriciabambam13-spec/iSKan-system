import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SKChairmanDashboard from "./pages/SKChairmanDashboard";
import SKKagawadDashboard from "./pages/SKKagawadDashboard";
import RegisterYouth from "./pages/RegisterYouth";
import ScanQr from "./pages/ScanQr";
import CreatePrograms from "./pages/CreatePrograms";
import ManagePrograms from "./pages/manageprograms";
import ViewPrograms from "./pages/viewprograms";
import Transaction from "./pages/transaction";  
import ManageYouth from "./pages/manageYouth";
import Settings from "./pages/Settings";
import GenerateReports from "./pages/GenerateReports";
import AuditLogs from "./pages/AuditLogs"; 
import ManualVerification from "./pages/ManualVerification";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/chairman-dashboard" element={<SKChairmanDashboard />} />
        <Route path="/kagawad-dashboard" element={<SKKagawadDashboard />} />
        <Route path="/register-youth" element={<RegisterYouth />} />
        <Route path="/generate-reports" element={<GenerateReports />} />
        <Route path="/scan" element={<ScanQr />} />
        <Route path="/create-programs" element={<CreatePrograms />} />
        <Route path="/manage-programs" element={<ManagePrograms />} />
        <Route path="/view-programs" element={<ViewPrograms />} />
        <Route path="/transaction" element={<Transaction />} />

        <Route path="/audit-logs" element={<AuditLogs />} /> 
        <Route path="/manage-youth" element={<ManageYouth />} />
        <Route path="/manual-verification" element={<ManualVerification />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;