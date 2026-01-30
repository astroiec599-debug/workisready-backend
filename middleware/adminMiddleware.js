// middleware/adminMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const adminOnly = async (req, res, next) => {
  try {
    console.log("AdminOnly middleware - Checking admin access");
    
    // Check if token exists
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. No token provided." 
      });
    }

    console.log("Token received, verifying...");
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    
    // Fetch user from DB
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log("User not found for ID:", decoded.id);
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    console.log("User found:", user.email, "User type:", user.userType);
    
    // Check if user is admin (check both userType and role fields)
    const isAdmin = user.userType === "admin" || user.role === "admin";
    
    if (!isAdmin) {
      console.log("User is not admin:", user.email);
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admins only." 
      });
    }

    console.log("Admin access granted for:", user.email);
    
    // Attach user to request
    req.user = user;
    req.isAdmin = true;
    
    // All good
    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Server error in admin middleware" 
    });
  }
};

// Optional: A simpler admin verification that doesn't require DB query every time
export const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "No admin token provided" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token has admin flag (for admin panel login tokens)
    if (!decoded.isAdmin && decoded.userType !== "admin" && decoded.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Invalid admin token" 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Admin token verification error:", error);
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Admin session expired. Please login again." 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      message: "Invalid admin session" 
    });
  }
};