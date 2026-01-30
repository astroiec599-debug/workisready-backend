import mongoose from "mongoose";

const FeaturedProviderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  providerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Provider',
    required: true 
  },
  category: {
    type: String,
    default: 'General'
  },
  icon: {
    type: String,
    default: '👷'
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  // Additional provider info for quick access
  providerName: String,
  providerLocation: String,
  providerRating: Number,
  providerRate: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update updatedAt on save
FeaturedProviderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const FeaturedProvider = mongoose.model('FeaturedProvider', FeaturedProviderSchema);
export default FeaturedProvider;