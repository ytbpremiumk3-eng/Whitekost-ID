import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ViewerDashboard from "@/pages/ViewerDashboard";

const ProtectedRoute = ({ children, role }) => {
  const { token, userRole } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (role && userRole !== role) {
    return <Navigate to={userRole === "admin" ? "/admin" : "/viewer"} replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { token, userRole } = useAuth();
  if (!token) return <LoginPage />;
  return <Navigate to={userRole === "admin" ? "/admin" : "/viewer"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewer"
            element={
              <ProtectedRoute role="user">
                <ViewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
