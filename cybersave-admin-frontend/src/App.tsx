import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UserManagement from './pages/UserManagement';
import Applications from './pages/Applications';
import Services from './pages/Services';
import Operators from './pages/Operators';
import Notifications from './pages/Notifications';
import SupportTickets from './pages/SupportTickets';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import UserManagementDetail from './pages/UserManagementDetail';
import ApplicationDetail from './pages/ApplicationDetail';
import OperatorDetail from './pages/OperatorDetail';
import SupportTicketDetail from './pages/SupportTicketDetail';
import SupportTicketResolve from './pages/SupportTicketResolve';
import ServiceWizard from './pages/ServiceWizard';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="users/:id" element={<UserManagementDetail />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="services" element={<Services />} />
          <Route path="services/create" element={<ServiceWizard />} />
          <Route path="operators" element={<Operators />} />
          <Route path="operators/:id" element={<OperatorDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="support" element={<SupportTickets />} />
          <Route path="support/:id" element={<SupportTicketDetail />} />
          <Route path="support/:id/resolve" element={<SupportTicketResolve />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
