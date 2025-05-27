import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Leads from './pages/Leads';
import SuperadminDashboard from './pages/dashboard/SuperadminDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import PartnerDashboard from './pages/dashboard/PartnerDashboard';
import SalesDashboard from './pages/dashboard/SalesDashboard';
import RegisterPartner from './pages/RegisterPartner';
import DownloadLeads from './pages/DownloadLeads';

// Import Inter font
import '@fontsource/inter';

// Create a client
const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case 'SUPERADMIN':
      return <SuperadminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'PARTNER':
      return <PartnerDashboard />;
    case 'SALES_PERSON':
      return <SalesDashboard />;
    default:
      return <div>Unknown role</div>;
  }
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterPartner />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <div>Users</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospitals"
              element={
                <ProtectedRoute>
                  <div>Hospitals</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/download-leads"
              element={
                <ProtectedRoute>
                  <DownloadLeads />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App; 