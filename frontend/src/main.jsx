import React, { useEffect } from 'react'";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Media Cache SW registered:', registration.scope);
          })
          .catch(error => {
            console.error('Media Cache SW registration failed:', error);
          });
      });
    }
  }, []);

  return (
    // Your standard router or component structure
    <ReadQuestDashboard />
  );
}
