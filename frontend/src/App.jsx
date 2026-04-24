import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthContext, { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Apps from './pages/Apps';
import Databases from './pages/Databases';
import Logs from './pages/Logs';

const ProtectedRoute = ({ children }) => {
    const { token } = React.useContext(AuthContext);
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Dashboard />} />
                    <Route path="apps" element={<Apps />} />
                    <Route path="db" element={<Databases />} />
                    <Route path="logs" element={<Logs />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
