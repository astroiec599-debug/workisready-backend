import mongoose from 'mongoose';
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import Task from "../models/Task.js";
import SavedTask from "../models/savedTask.js";
import SavedProvider from "../models/SavedProvider.js";


const router = express.Router();

// ========================
// 📸 MULTER CONFIGURATION
// ========================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/avatars";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const isValid =
      allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
    if (isValid) cb(null, true);
    else cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed!"));
  },
});

// ========================
// ✅ GET USER PROFILE
// ========================
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ========================
// ✅ UPDATE USER PROFILE (WITH APPROVAL SYSTEM)
// ========================
router.put("/profile", auth, upload.single("profileImage"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: "Your account must be approved before you can edit your profile" 
      });
    }

    // Check if user already has pending changes
    if (user.hasPendingChanges) {
      return res.status(400).json({ 
        success: false, 
        message: "You already have pending changes awaiting approval" 
      });
    }

    const updates = { ...req.body };
    
    // Handle profile image
    if (req.file) {
      updates.profileImage = req.file.filename;

      // Delete old image if exists
      if (user.profileImage) {
        const oldPath = path.join("uploads/avatars", user.profileImage);
        if (fs.existsSync(oldPath)) {
          fs.unlink(oldPath, (err) => {
            if (err) console.warn("⚠️ Could not delete old profile image:", err);
          });
        }
      }
    }

    // Store current data as original (for reference)
    user.originalProfileData = {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      whatsapp: user.whatsapp || "",
      location: user.location || "",
      region: user.region || "",
      profileImage: user.profileImage || "",
      fname: user.fname || "",
      sname: user.sname || "",
      oname: user.oname || "",
      updatedAt: new Date()
    };

    // Store pending changes (what the user wants to change to)
    user.pendingProfileData = {
      name: updates.name || user.name,
      email: updates.email || user.email,
      phone: updates.phone || user.phone || "",
      whatsapp: updates.whatsapp || user.whatsapp || "",
      location: updates.location || user.location || "",
      region: updates.region || user.region || "",
      profileImage: updates.profileImage || user.profileImage || "",
      fname: updates.fname || user.fname || "",
      sname: updates.sname || user.sname || "",
      oname: updates.oname || user.oname || ""
    };

    // Set pending changes flag
    user.hasPendingChanges = true;
    user.pendingChangesSubmittedAt = new Date();

    // Save the user (but don't apply changes yet)
    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: "Profile changes submitted for admin approval",
      hasPendingChanges: true,
      user: userResponse
    });

  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ User statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const clientId = req.user._id;
    const userId = req.user._id;

    // Count all tasks created by this user
    const totalTasks = await Task.countDocuments({ clientId });

    // Count all saved jobs
    const savedJobs = await SavedTask.countDocuments({ userId });

    //count all saved providers
    const savedProviders = await SavedProvider.countDocuments({
  userId
});


    // Calculate account age
    const joinedDate = req.user.createdAt;
    const daysOnPlatform = Math.floor(
      (Date.now() - new Date(joinedDate)) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      stats: {
        totalTasks,
        savedJobs,
        savedProviders,
        myServices: req.user.services ? req.user.services.length : 0,
        joined: joinedDate,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching stats: " + error.message,
    });
  }
});


export default router;
