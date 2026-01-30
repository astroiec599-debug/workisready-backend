import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
   {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fname: {
      type: String,
      default: "",
    },
    sname: {
      type: String,
      default: "",
    },
    oname: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider !== "google";
      },
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      default: "",
    },
    whatsapp: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    region: {
      type: String,
      default: "",
    },
    userType: {
      type: String,
      enum: ["client", "worker"],
      default: "client",
    },
    profileImage: {
      type: String,
      default: "",
    },
    
    // Approval System Fields
    isApproved: {
      type: Boolean,
      default: false,
    },
    hasPendingChanges: {
      type: Boolean,
      default: false,
    },
    pendingProfileData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    originalProfileData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastApprovedAt: {
      type: Date,
      default: null,
    },
    pendingChangesSubmittedAt: {
      type: Date,
      default: null,
    },

    resetToken: String,
    resetTokenExpiry: Date,

    averageRating: {
      type: Number,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

/* 🔐 HASH PASSWORD BEFORE SAVE */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // ✅ Prevent double hashing
  if (this.skipPasswordHashing) {
    this.skipPasswordHashing = false;
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* 🔑 COMPARE PASSWORD */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/* 🧼 SAFE RESPONSE */
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

export default mongoose.model("User", userSchema);