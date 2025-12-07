import React, { useState, useEffect } from 'react';
import { UserProfile, NotificationState } from './types';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { auth } from './services/firebase';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false); 
  const [isAuthReady, setIsAuthReady] = useState(true); 
  const [currentView, setCurrentView] = useState('landing'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [roleSelection, setRoleSelection] = useState('student'); 
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    // Safety Check: Warn the user if they haven't replaced the placeholder API key
    if (auth.app.options.apiKey === "YOUR_API_KEY_HERE") {
        showNotification("Action Required: Please update services/firebase.ts with your actual Firebase API keys.", "error");
    }
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
      setUserProfile(profile);
      setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    setUserProfile(null);
    setCurrentView('landing');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-bold animate-pulse">Connecting to School Portal...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {notification.message}
        </div>
      )}

      {currentView === 'landing' && (
        <LandingPage 
            onNavigate={(role) => {
                setRoleSelection(role);
                setAuthMode('login');
                setCurrentView('auth');
            }}
            onSuperAdmin={() => {
                setRoleSelection('superadmin');
                setAuthMode('login');
                setCurrentView('auth');
            }}
        />
      )}

      {currentView === 'auth' && (
        <AuthPage 
            mode={authMode} 
            role={roleSelection} 
            setMode={setAuthMode} 
            onBack={() => setCurrentView('landing')}
            onSuccess={handleLoginSuccess}
            showNotification={showNotification}
            isAuthReady={isAuthReady} 
        />
      )}

      {currentView === 'dashboard' && userProfile && (
        <Dashboard 
            user={userProfile} 
            onLogout={handleLogout} 
            showNotification={showNotification}
        />
      )}
    </div>
  );
}