import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ContentList } from './pages/ContentList';
import { ContentEditor } from './pages/ContentEditor';
import { PersonaList } from './pages/PersonaList';
import { PersonaEditor } from './pages/PersonaEditor';
import { CampaignList } from './pages/CampaignList';
import { UsagePage } from './pages/UsagePage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/content" element={<ContentList />} />
            <Route path="/content/new" element={<ContentEditor />} />
            <Route path="/content/:id" element={<ContentEditor />} />
            <Route path="/personas" element={<PersonaList />} />
            <Route path="/personas/new" element={<PersonaEditor />} />
            <Route path="/personas/:id/edit" element={<PersonaEditor />} />
            <Route path="/campaigns" element={<CampaignList />} />
            <Route path="/usage" element={<UsagePage />} />
          </Route>
        </Route>

        {/* Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;