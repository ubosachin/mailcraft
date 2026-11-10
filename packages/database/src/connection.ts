import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

// Key connection cache per mongoose module instance so Next.js dev chunk splitting
// or HMR reloads never skip connecting a freshly loaded mongoose singleton.
const instanceCaches = new WeakMap<typeof mongoose, MongooseCache>();

function getInstanceCache(): MongooseCache {
  let cached = instanceCaches.get(mongoose);
  if (!cached) {
    const existingGlobal = global.mongooseCache;
    if (existingGlobal && existingGlobal.conn === mongoose) {
      cached = existingGlobal;
    } else {
      cached = { conn: null, promise: null };
    }
    instanceCaches.set(mongoose, cached);
  }
  return cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const cached = getInstanceCache();

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    global.mongooseCache = cached;
    return mongoose;
  }

  // Clear stale reference if the connection dropped or belongs to an inactive state
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.conn = null;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mailcraft';

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise =
      mongoose.connection.readyState === 2
        ? mongoose.connection.asPromise().then(() => mongoose)
        : mongoose.connect(mongoUri, opts).then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
    global.mongooseCache = cached;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export async function disconnectDatabase(): Promise<void> {
  const cached = instanceCaches.get(mongoose);
  if (cached?.conn || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    if (cached) {
      cached.conn = null;
      cached.promise = null;
    }
    if (global.mongooseCache?.conn === mongoose) {
      global.mongooseCache = undefined;
    }
  }
}

