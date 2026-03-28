import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProductPage from "./ProductPage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import EmployeesPage from "./pages/EmployeesPage";
import ProcurementPage from "./pages/ProcurementPage";
import CustomersPage from "./pages/CustomersPage";
import ShiftRegister from "./pages/ShiftRegister";
import Navbar from "./components/Navbar";
import "./App.css";

function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("token"));
  
  return (
    <Router>
      {authToken && <Navbar setAuthToken={setAuthToken} />}
      <Routes>
        <Route path="/login" element={!authToken ? <LoginPage setAuthToken={setAuthToken} /> : <Navigate to="/" />} />
        <Route path="/" element={authToken ? <ProductPage /> : <Navigate to="/login" />} />
        <Route path="/orders" element={authToken ? <OrdersPage /> : <Navigate to="/login" />} />
        <Route path="/analytics" element={authToken ? <AnalyticsDashboard /> : <Navigate to="/login" />} />
        <Route path="/employees" element={authToken ? <EmployeesPage /> : <Navigate to="/login" />} />
        <Route path="/procurement" element={authToken ? <ProcurementPage /> : <Navigate to="/login" />} />
        <Route path="/customers" element={authToken ? <CustomersPage /> : <Navigate to="/login" />} />
        <Route path="/shifts" element={authToken ? <ShiftRegister /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;