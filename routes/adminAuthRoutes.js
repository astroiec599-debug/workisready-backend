import express from "express";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js"; // optional, for JWT
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Admin login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({ success: true, token, admin: { name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all admins (protected route)
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.json({ success: true, admins });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

export default router;
