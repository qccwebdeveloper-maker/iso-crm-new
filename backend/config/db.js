const mongoose = require('mongoose');

// Log topology recovery so a replica-set election (which produces the transient
// "primary marked stale due to electionId/setVersion mismatch" message) is visible
// as a normal disconnect → reconnect cycle rather than an unexplained error.
let listenersBound = false;
const bindConnectionListeners = () => {
  if (listenersBound) return;
  listenersBound = true;
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected — retrying automatically…'));
  mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB reconnected (new primary selected)'));
  mongoose.connection.on('error', err => console.error(`❌ MongoDB connection error: ${err.message}`));
};

const connectDB = async (retries = 5) => {
  bindConnectionListeners();
  const mongoUri = (process.env.MONGODB_URI || '').trim();
  if (!mongoUri) throw new Error('MONGODB_URI is not configured');

  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(
        mongoUri,
        {
          serverSelectionTimeoutMS: 15000, // keep selecting through an election
          retryWrites: true,               // auto-retry writes against the new primary
          retryReads: true,                // auto-retry reads against the new primary
          w: 'majority',                   // durable writes acked by a majority
          heartbeatFrequencyMS: 10000,     // detect topology changes promptly
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
        }
      );
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.error(`❌ MongoDB attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) {
        const wait = i * 3000;
        console.log(`⏳ Retrying in ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw new Error(`MongoDB connection failed after ${retries} attempts: ${err.message}`);
      }
    }
  }
};

module.exports = connectDB;
