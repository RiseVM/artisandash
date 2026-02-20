import { db } from "../../../db/index";
import { signedAgreements } from "@shared/schema";
import type { InsertSignedAgreement, SignedAgreement } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export const agreementStorage = {
  async getSignedAgreements(): Promise<SignedAgreement[]> {
    return db.select().from(signedAgreements).orderBy(desc(signedAgreements.signed_at));
  },

  async getSignedAgreementsByCustomer(customerId: number): Promise<SignedAgreement[]> {
    return db
      .select()
      .from(signedAgreements)
      .where(eq(signedAgreements.customer_id, customerId))
      .orderBy(desc(signedAgreements.signed_at));
  },

  async getSignedAgreement(id: number): Promise<SignedAgreement | undefined> {
    const [result] = await db
      .select()
      .from(signedAgreements)
      .where(eq(signedAgreements.id, id));
    return result;
  },

  async createSignedAgreement(agreement: InsertSignedAgreement): Promise<SignedAgreement> {
    const [result] = await db.insert(signedAgreements).values(agreement).returning();
    return result;
  },

  async deleteSignedAgreement(id: number): Promise<boolean> {
    const result = await db
      .delete(signedAgreements)
      .where(eq(signedAgreements.id, id))
      .returning();
    return result.length > 0;
  },
};
