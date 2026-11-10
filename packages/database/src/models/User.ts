import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { AuthProvider } from '@mailcraft/shared-types';

export interface IUserDoc extends Document {
  email: string;
  passwordHash?: string | null;
  passwordSalt?: string | null;
  name?: string | null;
  role: 'user' | 'admin';
  emailVerified: boolean;
  avatarUrl?: string | null;
  authProvider: AuthProvider;
  googleId?: string | null;
  primarySessionId?: Types.ObjectId | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    passwordSalt: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    primarySessionId: {
      type: Schema.Types.ObjectId,
      ref: 'UserSession',
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

