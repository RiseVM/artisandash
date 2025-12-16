import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 10;
const ADMIN_EMAIL = "ed@risevm.com";
const DEFAULT_ADMIN_PASSWORD = "Mara1234!";

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
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  
  if (!existingAdmin) {
    await storage.createUser({
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: "Ed",
      lastName: "Admin",
      role: "admin",
      isActive: "yes",
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  } else {
    // Always ensure admin has correct role and current password
    await storage.updateUser(existingAdmin.id, { 
      role: "admin",
      passwordHash,
    });
    console.log(`Admin user updated: ${ADMIN_EMAIL}`);
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
