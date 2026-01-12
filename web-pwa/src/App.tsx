import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TrackingProvider } from './contexts/TrackingContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DriverDetail from './pages/DriverDetail';

function App() {
    return (
        <AuthProvider>
            <TrackingProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* Driver Routes */}
                    <Route
                        path="/driver"
                        element={
                            <ProtectedRoute allowedRoles={['driver']}>
                                <Layout>
                                    <DriverDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Admin Routes */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Layout>
                                    <AdminDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/driver/:driverId"
                        element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <Layout>
                                    <DriverDetail />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </TrackingProvider>
        </AuthProvider>
    );
}

export default App;
