import express from "express";
import { auth } from "../middleware/auth.js";
import SavedTask from "../models/savedTask.js";
import Task from "../models/Task.js";

const router = express.Router();

// ✅ Get all saved tasks for logged-in user
router.get("/", auth, async (req, res) => {
  try {
    const saved = await SavedTask.find({ userId: req.user.id }).populate("taskId");
    const savedTasks = saved.map((s) => s.taskId);
    res.json({ success: true, savedTasks });
  } catch (error) {
    console.error("❌ Error fetching saved tasks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Toggle save/unsave a task
router.post("/:taskId", auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const existing = await SavedTask.findOne({ userId: req.user.id, taskId });

    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, saved: false });
    }

    await SavedTask.create({ userId: req.user.id, taskId });
    res.json({ success: true, saved: true });
  } catch (error) {
    console.error("❌ Error saving task:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Delete saved task manually
router.delete("/:taskId", auth, async (req, res) => {
  try {
    await SavedTask.findOneAndDelete({
      userId: req.user.id,
      taskId: req.params.taskId,
    });
    res.json({ success: true, message: "Removed from saved tasks" });
  } catch (error) {
    console.error("❌ Error removing saved task:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
