import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 10;
// Use environment variables for sensitive credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@artisantile.com";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "ChangeMe123!";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await storage.getUserByEmail(email);
  
  if (!user || !user.passwordHash) {
    return null;
  }

  if (user.isActive !== "yes") {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return null;
  }

  return user;
}

export async function seedAdminUser(): Promise<void> {
  const existingAdmin = await storage.getUserByEmail(ADMIN_EMAIL);

  if (!existingAdmin) {
    // Only create admin user if it doesn't exist
    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
    await storage.createUser({
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isActive: "yes",
    });
    console.log(`Admin user created: ${ADMIN_EMAIL} - PLEASE CHANGE THE DEFAULT PASSWORD IMMEDIATELY`);
  } else {
    // Only ensure admin role is set, do NOT reset the password
    if (existingAdmin.role !== "admin") {
      await storage.updateUser(existingAdmin.id, { role: "admin" });
      console.log(`Admin role restored for: ${ADMIN_EMAIL}`);
    }
  }
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

export function isManager(user: User): boolean {
  return user.role === "admin" || user.role === "manager";
}

export function canManageUsers(user: User): boolean {
  return user.role === "admin";
}

export function canViewReports(user: User): boolean {
  return user.role === "admin" || user.role === "manager";
}
