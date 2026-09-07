import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cameras from './pages/Cameras';
import Playback from './pages/Playback';
import Events from './pages/Events';
import Search from './pages/Search';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="flex min-h-screen">
              {user && <Sidebar />}
              <main className="flex-1 bg-base-950 min-h-screen">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/playback" element={<Playback />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/search" element={<Search />} />
                  <Route
                    path="/cameras"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <Cameras />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
