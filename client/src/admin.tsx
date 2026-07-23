import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './apps/admin/styles/main.css';
import AdminApp from './apps/admin/AdminApp';

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);
