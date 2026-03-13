import { db } from "../../../db/index";
import { contracts, type Contract, type InsertContract } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export const contractStorage = {
  async getContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.created_at));
  },

  async getContract(id: number): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id));
    return result[0];
  },

  async getContractBySigningToken(token: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.signing_token, token));
    return result[0];
  },

  async createContract(contract: InsertContract): Promise<Contract> {
    const result = await db.insert(contracts).values(contract).returning();
    return result[0];
  },

  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const result = await db.update(contracts).set({ ...contract, updated_at: new Date() }).where(eq(contracts.id, id)).returning();
    return result[0];
  },

  async deleteContract(id: number): Promise<boolean> {
    const result = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return result.length > 0;
  },
};
