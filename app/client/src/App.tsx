import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WorkshopGate from './pages/WorkshopGate';
import ChapterPage from './pages/ChapterPage';
import TaskPage from './pages/TaskPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGroupDetail from './pages/admin/AdminGroupDetail';
import AdminContent from './pages/admin/AdminContent';
import HomePage from './pages/HomePage';
import PlayPage from './pages/PlayPage';
import LandingPage from './pages/LandingPage';
import SelbstlernenPage from './pages/SelbstlernenPage';
import ActivityPage from './pages/ActivityPage';
import GamesGate from './components/GamesGate';
import AdminReview from './pages/admin/AdminReview';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  // Die Workshop-Navbar nur im Workshop-/Admin-Bereich zeigen.
  // Landing, Spiele und Selbstlernen haben jeweils ihre eigene Kopfzeile.
  const p = location.pathname;
  const showWorkshopNav =
    p.startsWith('/workshop') || p.startsWith('/chapter') ||
    p.startsWith('/task') || p.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-50">
      {user && showWorkshopNav && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />

        <Route path="/" element={
          <ProtectedRoute><LandingPage /></ProtectedRoute>
        } />
        <Route path="/workshop" element={
          <ProtectedRoute><WorkshopGate /></ProtectedRoute>
        } />
        <Route path="/selbstlernen" element={
          <ProtectedRoute><SelbstlernenPage /></ProtectedRoute>
        } />
        <Route path="/selbstlernen/:id" element={
          <ProtectedRoute><ActivityPage /></ProtectedRoute>
        } />
        <Route path="/chapter/:id" element={
          <ProtectedRoute><ChapterPage /></ProtectedRoute>
        } />
        <Route path="/task/:id" element={
          <ProtectedRoute><TaskPage /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/groups/:id" element={
          <ProtectedRoute adminOnly><AdminGroupDetail /></ProtectedRoute>
        } />
        <Route path="/admin/content" element={
          <ProtectedRoute adminOnly><AdminContent /></ProtectedRoute>
        } />
        <Route path="/admin/review" element={
          <ProtectedRoute adminOnly><AdminReview /></ProtectedRoute>
        } />

        {/* Spieleportal (hinter dem Selbstlernen-Gating) */}
        <Route path="/spiele" element={
          <ProtectedRoute><GamesGate><HomePage /></GamesGate></ProtectedRoute>
        } />
        <Route path="/play/:slug" element={
          <ProtectedRoute><GamesGate><PlayPage /></GamesGate></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
