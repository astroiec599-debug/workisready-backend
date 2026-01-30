// createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/workisready";

mongoose.connect(MONGODB_URI).then(() => console.log("MongoDB connected"));

const createAdmin = async () => {
  const admin = new Admin({
    name: "Super Admin",
    email: "workisready@lispira.com",
    password: "admin123",
    role: "superadmin",
  });

  await admin.save();
  console.log("Admin created!");
  process.exit();
};

createAdmin();
