import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/dashboard/Dashboard';
import Room from './components/whiteboard/Room';
import { initGA, logPageView } from './utils/analytics';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// Initialize GA outside the component tree
initGA();

// Helper component to track page views
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    logPageView(location.pathname + location.search);
  }, [location]);

  return null;
};

// Use env variable or fallback for development
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy_client_id_for_now';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/room/:id" element={<PrivateRoute><SocketProvider><Room /></SocketProvider></PrivateRoute>} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <AnalyticsTracker />
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#18181F',
                color: '#F0EEF8',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: '13px',
                fontFamily: "'Karla', sans-serif",
              },
              success: { iconTheme: { primary: '#00FFBF', secondary: '#0C0C0F' } },
              error: { iconTheme: { primary: '#FF6B6B', secondary: '#0C0C0F' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
