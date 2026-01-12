import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Initialize Capacitor
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

// Hide splash screen after app is ready
SplashScreen.hide();

// Set status bar style
StatusBar.setStyle({ style: Style.Dark }).catch(() => { });
StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => { });

// Handle back button
CapApp.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
        CapApp.exitApp();
    } else {
        window.history.back();
    }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
