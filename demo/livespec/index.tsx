import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to mount application:", error);
  // @ts-ignore - defined in index.html
  if (window.showCrashScreen) {
    // @ts-ignore
    window.showCrashScreen("Startup Error", error instanceof Error ? error.message : String(error));
  } else {
    document.body.innerHTML = '<div style="color:red; padding:20px;">Critical Startup Error: ' + error + '</div>';
  }
}