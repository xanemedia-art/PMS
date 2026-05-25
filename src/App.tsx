/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import RoomsPage from './pages/RoomsPage';
import PlansPage from './pages/PlansPage';
import HousekeepingPage from './pages/HousekeepingPage';
import AgentsPage from './pages/AgentsPage';
import ReportsPage from './pages/ReportsPage';
import ExpensesPage from './pages/ExpensesPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

import LandingPage from './pages/LandingPage';
import BookingEnginePage from './pages/BookingEnginePage';
import GuestLoginPage from './pages/GuestLoginPage';
import GuestPortalPage from './pages/GuestPortalPage';
import GuestRequestsPage from './pages/GuestRequestsPage';
import RestaurantPage from './pages/RestaurantPage';
import PresentationPage from './pages/PresentationPage';

function MainRoutes() {
  const { user, isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/book/:hotelId" element={<BookingEnginePage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/guest/login" element={<GuestLoginPage />} />
      <Route path="/guest" element={<GuestPortalPage />} />
      <Route path="/pitch" element={<PresentationPage />} />
      
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={user?.role === 'agent' ? <Navigate to="/agent" replace /> : <DashboardPage />} />
        <Route path="/agent" element={<BookingsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/housekeeping" element={<HousekeepingPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/guest-requests" element={<GuestRequestsPage />} />
        <Route path="/restaurant" element={<RestaurantPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainRoutes />
      </Router>
    </AuthProvider>
  );
}

