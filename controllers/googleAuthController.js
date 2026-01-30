// controllers/authController.js - Fixed JavaScript version
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Initialize Google OAuth client
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// ✅ Existing function for direct token (id_token) login
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    // ✅ Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: "Google account has no email" });
    }

    // ✅ Check if user exists
    let user = await User.findOne({ email });

    // ✅ Auto-register if not found
    if (!user) {
      user = await User.create({
        name,
        email,
        profileImage: picture,
        authProvider: "google",
      });
    }

    // ✅ Generate JWT (same as your normal login)
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        authProvider: user.authProvider,
        userType: user.userType,
        region: user.region,
        location: user.location,
        isApproved: user.isApproved,
      },
    });

  } catch (error) {
    console.error("❌ Google Auth Error:", error);
    res.status(500).json({
      message: "Google authentication failed",
      error: error.message,
    });
  }
};

// ✅ NEW FUNCTION: Handle OAuth code exchange (for mobile/web OAuth flow)
export const googleAuthCallback = async (req, res) => {
  try {
    const { code, redirectUri, codeVerifier } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    console.log("🔑 Processing Google OAuth callback:", {
      codeLength: code.length,
      redirectUri,
      hasCodeVerifier: !!codeVerifier,
    });

    // Prepare token exchange options - REMOVED ": any" TypeScript annotation
    const tokenOptions = {
      code,
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    };

    // Add code verifier if provided (for PKCE)
    if (codeVerifier) {
      tokenOptions.code_verifier = codeVerifier;
    }

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(tokenOptions);

    console.log("✅ Tokens received from Google");

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: "Google account has no email" });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    // Auto-register if not found
    if (!user) {
      user = await User.create({
        name,
        email,
        profileImage: picture,
        authProvider: "google",
      });
      console.log("👤 New user created via Google OAuth:", email);
    } else {
      console.log("👤 Existing user logged in via Google OAuth:", email);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Prepare user response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage || picture,
      authProvider: user.authProvider,
      userType: user.userType || 'client',
      region: user.region || '',
      location: user.location || '',
      isApproved: user.isApproved || false,
    };

    console.log("✅ Google OAuth successful for:", email);

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userResponse,
    });

  } catch (error) {
    console.error("❌ Google Auth Callback Error:", error);
    
    // Provide more specific error messages
    let errorMessage = "Google authentication failed";
    let statusCode = 500;

    if (error.message.includes("invalid_grant")) {
      errorMessage = "Authorization code is invalid or expired. Please try again.";
      statusCode = 400;
    } else if (error.message.includes("redirect_uri_mismatch")) {
      errorMessage = "Redirect URI mismatch. Please check your OAuth configuration.";
      statusCode = 400;
    } else if (error.message.includes("code_verifier")) {
      errorMessage = "Invalid code verifier for PKCE flow.";
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};

// ✅ Export other auth functions (make sure to add your existing ones)
// If you have registerUser and loginUser in this same file, export them too
export const registerUser = async (req, res) => {
  // Your existing registerUser code here
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  // Your existing loginUser code here
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// If you're using default export (check your existing code)
// export default { registerUser, loginUser, googleAuth, googleAuthCallback };