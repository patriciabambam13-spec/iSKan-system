import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
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
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/chairman-dashboard" element={<SKChairmanDashboard />} />
        <Route path="/kagawad-dashboard" element={<SKKagawadDashboard />} />
        <Route path="/register-youth" element={<RegisterYouth />} />
        <Route path="/generate-reports" element={<GenerationQR />} />
        <Route path="/scan" element={<ScanQr />} />
        <Route path="/create-program" element={<CreatePrograms />} />
        <Route path="/manage-youth" element={<ManageYouth />} />
        <Route path="/settings" element={<Settings />} />

        {/* Protected Routes */}
        <Route
          path="/chairman-dashboard"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <SKChairmanDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kagawad-dashboard"
          element={
            <ProtectedRoute allowedRoles={["kagawad"]}>
              <SKKagawadDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/register-youth"
          element={
            <ProtectedRoute allowedRoles={["chairman", "kagawad"]}>
              <RegisterYouth />
            </ProtectedRoute>
          }
        />
        <Route
          path="/generate-reports"
          element={
            <ProtectedRoute allowedRoles={["chairman", "kagawad"]}>
              <GenerationQR />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute allowedRoles={["chairman", "kagawad"]}>
              <ScanQr />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-program"
          element={
            <ProtectedRoute allowedRoles={["chairman", "kagawad"]}>
              <CreatePrograms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-youth"
          element={
            <ProtectedRoute allowedRoles={["chairman", "kagawad"]}>
              <ManageYouth />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["chairman", "kagawad"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;