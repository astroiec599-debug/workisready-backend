import express from "express";
import multer from "multer";
import Provider from "../models/Providers.js";
import { auth } from "../middleware/auth.js";
import path from "path";
import fs from "fs";
import { adminAuth } from "../middleware/auth.js";
import { normalizeFilePath } from '../utils/pathUtils.js';


const router = express.Router();

// ✅ Multer setup with normalized paths
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/providers";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// ✅ Add file filter for security
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocumentTypes = /pdf|doc|docx|txt/;
  
  if (file.fieldname === 'profilePic') {
    // Only images for profile pictures
    const isImage = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());
    cb(null, isImage);
  } else if (file.fieldname === 'sampleWork') {
    // Allow both images and documents for sample work
    const ext = path.extname(file.originalname).toLowerCase();
    const isValid = allowedImageTypes.test(ext) || allowedDocumentTypes.test(ext);
    cb(null, isValid);
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 11 // 1 profile pic + max 10 sample works
  }
});


/* -------------------------------------------------------------------------- */
/* 🟢 REGISTER PROVIDER (Only Once) */
/* -------------------------------------------------------------------------- */
router.post(
  "/",
  auth,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "sampleWork", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user._id;

      // ✅ Check if user already registered
      const existingProvider = await Provider.findOne({ userId });
      if (existingProvider) {
        return res.status(400).json({
          success: false,
          message: "You have already registered as a provider.",
        });
      }

      // Extract form data
      const {
        fname,
        sname,
        otherName,
        city,
        region,
        category,
        bio,
        skills,
        experience,
        hourlyRate,
        availability,
        phone,
        whatsapp,
        email,
      } = req.body;

      // ✅ Validate required fields
      if (!fname || !sname) {
        return res.status(400).json({
          success: false,
          message: "First name and surname are required.",
        });
      }

      // ✅ Create full name
      const fullName = `${fname} ${sname}${otherName ? ` ${otherName}` : ""}`.trim();

      // ✅ Normalize file paths
      let profilePicPath = "";
      if (req.files?.profilePic?.[0]) {
        profilePicPath = normalizeFilePath(req.files.profilePic[0].path);
      }

      // ✅ Normalize sample work paths
      const sampleWorkPaths = req.files?.sampleWork 
        ? req.files.sampleWork.map(file => normalizeFilePath(file.path))
        : [];

      // Create provider
      const newProvider = new Provider({
        userId: req.user._id,
        firstName: fname,
        surname: sname,
        otherName: otherName || "",
        fullName,
        city,
        region,
        category: category ? JSON.parse(category) : [],
        bio,
        skills: skills ? JSON.parse(skills) : [],
        experience: experience || "",
        hourlyRate: hourlyRate || "",
        availability: availability || "flexible",
        phone: phone || "",
        whatsapp: whatsapp || "",
        email: email || "",
        profilePic: profilePicPath,
        sampleWork: sampleWorkPaths,
        isApproved: false,
      });

      // Save to DB
      await newProvider.save();

      res.status(201).json({
        success: true,
        message: "Provider registration submitted successfully!",
        provider: newProvider,
      });
    } catch (error) {
      console.error("❌ Error registering provider:", error);
      
      // ✅ Clean up uploaded files if validation fails
      if (req.files) {
        Object.values(req.files).forEach(files => {
          files.forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Server error during provider registration: " + error.message,
      });
    }
  }
);

/* -------------------------------------------------------------------------- */
/* 🟡 CHECK PROVIDER REGISTRATION */
/* -------------------------------------------------------------------------- */
router.get("/check", auth, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    res.json({
      success: true,
      exists: !!provider,
      provider,
    });
  } catch (error) {
    console.error("❌ Error checking provider registration:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟣 GET ALL PROVIDERS */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const providers = await Provider.find().sort({ createdAt: -1 });
    res.json({ success: true, providers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🟠 FETCH CURRENT PROVIDER INFO */
/* -------------------------------------------------------------------------- */
router.get("/me", auth, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    }
    res.json({ success: true, provider });
  } catch (error) {
    console.error("❌ Error fetching provider:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔍 SEARCH PROVIDERS BY NAME, CATEGORY OR SKILLS */
/* -------------------------------------------------------------------------- */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();

    if (!q) {
      return res.json({ success: true, providers: [] });
    }

    // Case-insensitive partial match for name, category, or skills
    const providers = await Provider.find({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { surname: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { skills: { $elemMatch: { $regex: q, $options: "i" } } },
      ],
    }).select("firstname surname category skills profilePic _id experience rating");

    res.json({ success: true, providers });
  } catch (error) {
    console.error("❌ Error searching providers:", error);
    res.status(500).json({ success: false, message: "Server error during search" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔵 GET SINGLE PROVIDER BY ID */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }
    res.json({ success: true, provider });
  } catch (error) {
    console.error("❌ Error fetching provider:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* 🔴 UPDATE PROVIDER INFO */
/* -------------------------------------------------------------------------- */
router.put(
  "/update",
  auth,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "sampleWork", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const provider = await Provider.findOne({ userId: req.user._id });
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "Provider not found"
        });
      }

      const updates = req.body;
      
      // Parse JSON fields
      if (updates.skills) updates.skills = JSON.parse(updates.skills);
      if (updates.category) updates.category = JSON.parse(updates.category);
      
      // Update name fields
      if (updates.fname || updates.sname || updates.otherName) {
        provider.firstName = updates.fname || provider.firstName;
        provider.surname = updates.sname || provider.surname;
        provider.otherName = updates.otherName || provider.otherName;
        // fullName will be updated by pre-save hook
      }
      
      // Update other fields
      const fields = ['city', 'region', 'bio', 'experience', 'hourlyRate', 
                      'availability', 'phone', 'whatsapp', 'email'];
      
      fields.forEach(field => {
        if (updates[field] !== undefined) {
          provider[field] = updates[field];
        }
      });
      
      // ✅ Handle profile picture update with normalized path
      if (req.files?.profilePic?.[0]) {
        // Delete old file if exists
        if (provider.profilePic && fs.existsSync(provider.profilePic)) {
          fs.unlinkSync(provider.profilePic);
        }
        provider.profilePic = normalizeFilePath(req.files.profilePic[0].path);
      }

      // ✅ Handle sample work with normalized paths
      if (req.files?.sampleWork) {
        const newSamples = req.files.sampleWork.map(file => 
          normalizeFilePath(file.path)
        );
        const allSamples = [...provider.sampleWork, ...newSamples].slice(0, 10);
        provider.sampleWork = allSamples;
      }

      // Update category and skills if provided
      if (updates.category) provider.category = updates.category;
      if (updates.skills) provider.skills = updates.skills;

      await provider.save();

      res.json({
        success: true,
        message: "Provider updated successfully!",
        provider,
      });
    } catch (error) {
      console.error("❌ Error updating provider:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating provider: " + error.message,
      });
    }
  }
);

// DELETE sample work image
router.delete("/sample/:index", auth, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= provider.sampleWork.length) {
      return res.status(400).json({ success: false, message: "Invalid sample index" });
    }

    // Delete file from filesystem
    const filePath = provider.sampleWork[index];
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    provider.sampleWork.splice(index, 1);
    await provider.save();

    res.json({
      success: true,
      message: "Sample image removed successfully",
      provider,
    });
  } catch (error) {
    console.error("❌ Error removing sample image:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing sample image: " + error.message,
    });
  }
});

// -------------------------------------------------------------------------------
// POST: Add a review
// ---------------------------------------------------------------------------------
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.json({ success: false, message: "Provider not found" });
    }

    // Prevent duplicate review by same user
    const alreadyReviewed = provider.reviews.find(
      (r) => r.userId.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.json({
        success: false,
        message: "You already reviewed this provider",
      });
    }

    const review = {
      userId: req.user.id,
      name: req.user.email, // email since WorkisReady shows only email
      rating,
      comment,
    };

    provider.reviews.push(review);
    provider.calculateRating();
    await provider.save();

    res.json({ success: true, message: "Review added", provider });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error adding review" });
  }
});

router.patch("/:id/approve", adminAuth, async (req, res) => {
  const provider = await Provider.findById(req.params.id);
  if (!provider) return res.status(404).json({ success: false, message: "Not found" });
  provider.isApproved = !provider.isApproved;
  await provider.save();
  res.json({ success: true, message: provider.isApproved ? "Approved" : "Disapproved" });
});

router.patch("/bulk-approve", adminAuth, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids))
    return res.status(400).json({ success: false, message: "Invalid ids" });

  try {
    await Provider.updateMany(
      { _id: { $in: ids } },
      { $set: { isApproved: true } }
    );
    res.json({ success: true, message: "Providers approved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to approve providers" });
  }
});

export default router;