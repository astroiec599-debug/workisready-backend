import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      // Show popup message
      const alertDiv = document.createElement("div");
      alertDiv.innerHTML = `
        <div style="
          position: fixed; 
          top: 20px; 
          right: 20px; 
          z-index: 9999; 
          background: #fee2e2; 
          color: #b91c1c; 
          padding: 12px 20px; 
          border-radius: 8px; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          font-weight: 500;">
          ⚠️ Please log in to continue
        </div>
      `;
      document.body.appendChild(alertDiv);

      setTimeout(() => {
        alertDiv.remove();
        navigate("/login");
      }, 1800);
    }
  }, [token, navigate]);

  // If logged in → show the page
  return token ? children : null;
};

export default ProtectedRoute;
