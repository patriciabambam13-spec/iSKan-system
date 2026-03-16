import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import RegisterYouth from "./pages/RegisterYouth";
import GenerationQR from "./pages/GenerationQR";
import ScanQr from "./pages/ScanQr";
import Programs from "./pages/Programs";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<RegisterYouth />} />
        <Route path="/generate" element={<GenerationQR />} />
        <Route path="/scan" element={<ScanQr />} />
        <Route path="/programs" element={<Programs />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;