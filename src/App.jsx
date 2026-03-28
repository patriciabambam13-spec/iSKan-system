import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SKChairmanDashboard from "./pages/SKChairmanDashboard";
import SKKagawadDashboard from "./pages/SKKagawadDashboard";
import RegisterYouth from "./pages/RegisterYouth";
import GenerationQR from "./pages/GenerationQR";
import ScanQr from "./pages/ScanQr";
import CreatePrograms from "./pages/CreatePrograms";
import ManageYouth from "./pages/manageYouth";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/chairman-dashboard" element={<SKChairmanDashboard />} />
        <Route path="/kagawad-dashboard" element={<SKKagawadDashboard />} />
        <Route path="/register-youth" element={<RegisterYouth />} />
<<<<<<< Updated upstream
        <Route path="/generate-reports" element={<GenerationQR />} />
        <Route path="/scan" element={<ScanQr />} />
        <Route path="/create-programs" element={<CreatePrograms />} />
=======
        <Route path="/generate" element={<GenerationQR />} />
        <Route path="/scan" element={<ScanQr />} />
        <Route path="/create-program" element={<CreatePrograms />} />
>>>>>>> Stashed changes
        <Route path="/manage-youth" element={<ManageYouth />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;