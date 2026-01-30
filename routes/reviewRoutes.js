import express from "express";
import Review from "../models/Review.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js"; 

const router = express.Router();

/**
 * POST: Create a review
 */
router.post("/", auth, async (req, res) => {
  try {
    const { workerId, taskId, rating, comment } = req.body;
    const clientId = req.user._id;

    if (!rating) {
      return res.status(400).json({ message: "Rating is required" });
    }

    // Ensure the task exists and belongs to both
    const task = await Task.findOne({
      _id: taskId,
      client: clientId,
      worker: workerId,
      status: "completed",
    });

    if (!task) {
      return res.status(403).json({ message: "You cannot review this worker" });
    }

    // Prevent duplicate review for same task
    const existing = await Review.findOne({ task: taskId });
    if (existing) {
      return res.status(400).json({ message: "You already reviewed this worker" });
    }

    // Create review
    const review = await Review.create({
      worker: workerId,
      client: clientId,
      task: taskId,
      rating,
      comment,
    });

    // Recalculate worker rating
    const reviews = await Review.find({ worker: workerId });

    const avg =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await User.findByIdAndUpdate(workerId, {
      averageRating: avg.toFixed(2),
      reviewsCount: reviews.length,
    });

    res.json({ success: true, review });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * GET: Fetch all reviews for a worker
 */
router.get("/worker/:workerId", async (req, res) => {
  try {
    const reviews = await Review.find({ worker: req.params.workerId })
      .populate("client", "email profileImage")
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
