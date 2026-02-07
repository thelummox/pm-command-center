import { db } from "./db";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { 
  users, rfps, requirements, templates, responses, responseSections, 
  budgetItems, insights, reviews,
  type User, type InsertUser,
  type Rfp, type InsertRfp,
  type Requirement, type InsertRequirement,
  type Template, type InsertTemplate,
  type Response, type InsertResponse,
  type ResponseSection, type InsertResponseSection,
  type BudgetItem, type InsertBudgetItem,
  type Insight, type InsertInsight,
  type Review, type InsertReview,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  // RFPs
  getRfp(id: number): Promise<Rfp | undefined>;
  getAllRfps(): Promise<Rfp[]>;
  searchRfps(filters: { title?: string; keywords?: string; consultant?: string; source?: string; state?: string }): Promise<Rfp[]>;
  createRfp(rfp: InsertRfp): Promise<Rfp>;
  updateRfp(id: number, rfp: Partial<InsertRfp>): Promise<Rfp | undefined>;
  deleteRfp(id: number): Promise<void>;

  // Requirements
  getRequirementsByRfp(rfpId: number): Promise<Requirement[]>;
  createRequirement(req: InsertRequirement): Promise<Requirement>;
  updateRequirement(id: number, req: Partial<InsertRequirement>): Promise<Requirement | undefined>;
  deleteRequirementsByRfp(rfpId: number): Promise<void>;

  // Templates
  getTemplate(id: number): Promise<Template | undefined>;
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<void>;

  // Responses
  getResponseByRfp(rfpId: number): Promise<(Response & { sections: ResponseSection[] }) | undefined>;
  createResponse(response: InsertResponse): Promise<Response>;
  updateResponse(id: number, response: Partial<InsertResponse>): Promise<Response | undefined>;

  // Response Sections
  getResponseSection(id: number): Promise<ResponseSection | undefined>;
  getSectionsByResponse(responseId: number): Promise<ResponseSection[]>;
  createResponseSection(section: InsertResponseSection): Promise<ResponseSection>;
  updateResponseSection(id: number, section: Partial<InsertResponseSection>): Promise<ResponseSection | undefined>;
  deleteResponseSection(id: number): Promise<void>;

  // Budget Items
  getBudgetItemsByRfp(rfpId: number): Promise<BudgetItem[]>;
  saveBudgetItems(rfpId: number, items: { userId: string; year: number; hours: number }[]): Promise<BudgetItem[]>;

  // Insights
  getInsightsByRfp(rfpId: number): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  updateInsight(id: number, insight: Partial<InsertInsight>): Promise<Insight | undefined>;

  // Reviews
  getReview(id: number): Promise<Review | undefined>;
  getAllReviews(): Promise<(Review & { rfp?: Rfp })[]>;
  getReviewsByRfp(rfpId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined>;

  // Tasks
  getAllTasks(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // RFPs
  async getRfp(id: number): Promise<Rfp | undefined> {
    const [rfp] = await db.select().from(rfps).where(eq(rfps.id, id));
    return rfp;
  }

  async getAllRfps(): Promise<Rfp[]> {
    return db.select().from(rfps).orderBy(desc(rfps.createdAt));
  }

  async searchRfps(filters: { title?: string; keywords?: string; consultant?: string; source?: string; state?: string }): Promise<Rfp[]> {
    let allRfps = await db.select().from(rfps).orderBy(desc(rfps.createdAt));
    
    let consultantUserIds: Set<string> = new Set();
    if (filters.consultant) {
      const allUsers = await db.select().from(users);
      const searchTerm = filters.consultant.toLowerCase();
      consultantUserIds = new Set(
        allUsers
          .filter(u => u.fullName.toLowerCase().includes(searchTerm) || u.email.toLowerCase().includes(searchTerm))
          .map(u => u.id)
      );
    }
    
    const results = [];
    for (const rfp of allRfps) {
      if (filters.title && !rfp.title.toLowerCase().includes(filters.title.toLowerCase())) {
        continue;
      }
      if (filters.source && filters.source !== "all" && rfp.source !== filters.source) {
        continue;
      }
      if (filters.state && (!rfp.state || !rfp.state.toLowerCase().includes(filters.state.toLowerCase()))) {
        continue;
      }
      if (filters.keywords) {
        const searchKeywords = filters.keywords.toLowerCase().split(",").map(k => k.trim());
        const rfpKeywords = rfp.keywords?.map(k => k.toLowerCase()) || [];
        const hasKeyword = searchKeywords.some(sk => 
          rfpKeywords.some(rk => rk.includes(sk)) || 
          rfp.title.toLowerCase().includes(sk)
        );
        if (!hasKeyword) continue;
      }
      if (filters.consultant && consultantUserIds.size > 0) {
        const response = await this.getResponseByRfp(rfp.id);
        if (response) {
          const hasConsultant = response.sections.some(s => 
            s.assignedUserId && consultantUserIds.has(s.assignedUserId)
          );
          if (!hasConsultant) continue;
        } else {
          continue;
        }
      }
      results.push(rfp);
    }
    return results;
  }

  async createRfp(insertRfp: InsertRfp): Promise<Rfp> {
    const [rfp] = await db.insert(rfps).values(insertRfp).returning();
    return rfp;
  }

  async updateRfp(id: number, updateData: Partial<InsertRfp>): Promise<Rfp | undefined> {
    const [rfp] = await db.update(rfps).set({ ...updateData, updatedAt: new Date() }).where(eq(rfps.id, id)).returning();
    return rfp;
  }

  async deleteRfp(id: number): Promise<void> {
    await db.delete(rfps).where(eq(rfps.id, id));
  }

  // Requirements
  async getRequirementsByRfp(rfpId: number): Promise<Requirement[]> {
    return db.select().from(requirements).where(eq(requirements.rfpId, rfpId)).orderBy(requirements.id);
  }

  async createRequirement(insertReq: InsertRequirement): Promise<Requirement> {
    const [req] = await db.insert(requirements).values(insertReq).returning();
    return req;
  }

  async updateRequirement(id: number, updateData: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    const [req] = await db.update(requirements).set(updateData).where(eq(requirements.id, id)).returning();
    return req;
  }

  async deleteRequirementsByRfp(rfpId: number): Promise<void> {
    await db.delete(requirements).where(eq(requirements.rfpId, rfpId));
  }

  // Templates
  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async getAllTemplates(): Promise<Template[]> {
    return db.select().from(templates).orderBy(templates.name);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: number, updateData: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [template] = await db.update(templates).set(updateData).where(eq(templates.id, id)).returning();
    return template;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Responses
  async getResponseByRfp(rfpId: number): Promise<(Response & { sections: ResponseSection[] }) | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.rfpId, rfpId));
    if (!response) return undefined;
    const sections = await db.select().from(responseSections).where(eq(responseSections.responseId, response.id)).orderBy(responseSections.orderIndex);
    return { ...response, sections };
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const [response] = await db.insert(responses).values(insertResponse).returning();
    return response;
  }

  async updateResponse(id: number, updateData: Partial<InsertResponse>): Promise<Response | undefined> {
    const [response] = await db.update(responses).set({ ...updateData, lastSavedAt: new Date() }).where(eq(responses.id, id)).returning();
    return response;
  }

  // Response Sections
  async getResponseSection(id: number): Promise<ResponseSection | undefined> {
    const [section] = await db.select().from(responseSections).where(eq(responseSections.id, id));
    return section;
  }

  async getSectionsByResponse(responseId: number): Promise<ResponseSection[]> {
    return db.select().from(responseSections).where(eq(responseSections.responseId, responseId)).orderBy(responseSections.orderIndex);
  }

  async createResponseSection(insertSection: InsertResponseSection): Promise<ResponseSection> {
    const [section] = await db.insert(responseSections).values(insertSection).returning();
    return section;
  }

  async updateResponseSection(id: number, updateData: Partial<InsertResponseSection>): Promise<ResponseSection | undefined> {
    const [section] = await db.update(responseSections).set({ ...updateData, updatedAt: new Date() }).where(eq(responseSections.id, id)).returning();
    return section;
  }

  async deleteResponseSection(id: number): Promise<void> {
    await db.delete(responseSections).where(eq(responseSections.id, id));
  }

  // Budget Items
  async getBudgetItemsByRfp(rfpId: number): Promise<BudgetItem[]> {
    return db.select().from(budgetItems).where(eq(budgetItems.rfpId, rfpId));
  }

  async saveBudgetItems(rfpId: number, items: { userId: string; year: number; hours: number }[]): Promise<BudgetItem[]> {
    await db.delete(budgetItems).where(eq(budgetItems.rfpId, rfpId));
    const insertItems = items.map(item => ({ ...item, rfpId, hours: item.hours.toString() }));
    if (insertItems.length === 0) return [];
    const result = await db.insert(budgetItems).values(insertItems).returning();
    return result;
  }

  // Insights
  async getInsightsByRfp(rfpId: number): Promise<Insight[]> {
    const response = await this.getResponseByRfp(rfpId);
    if (!response) return [];
    return db.select().from(insights).where(eq(insights.responseId, response.id)).orderBy(desc(insights.createdAt));
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const [insight] = await db.insert(insights).values(insertInsight).returning();
    return insight;
  }

  async updateInsight(id: number, updateData: Partial<InsertInsight>): Promise<Insight | undefined> {
    const [insight] = await db.update(insights).set(updateData).where(eq(insights.id, id)).returning();
    return insight;
  }

  // Reviews
  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getAllReviews(): Promise<(Review & { rfp?: Rfp })[]> {
    const allReviews = await db.select().from(reviews).orderBy(desc(reviews.submittedAt));
    const result = await Promise.all(allReviews.map(async (review) => {
      const rfp = await this.getRfp(review.rfpId);
      return { ...review, rfp };
    }));
    return result;
  }

  async getReviewsByRfp(rfpId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.rfpId, rfpId)).orderBy(desc(reviews.submittedAt));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  async updateReview(id: number, updateData: Partial<InsertReview>): Promise<Review | undefined> {
    const [review] = await db.update(reviews).set({ ...updateData, reviewedAt: new Date() }).where(eq(reviews.id, id)).returning();
    return review;
  }

  // Tasks - response sections with RFP and user info
  async getAllTasks(): Promise<any[]> {
    const allSections = await db.select().from(responseSections);
    const result = await Promise.all(allSections.map(async (section) => {
      const [response] = await db.select().from(responses).where(eq(responses.id, section.responseId));
      const rfp = response ? await this.getRfp(response.rfpId) : null;
      const user = section.assignedUserId ? await this.getUser(section.assignedUserId) : null;
      return {
        ...section,
        rfpId: rfp?.id,
        rfpTitle: rfp?.title,
        assignedUserName: user?.fullName,
      };
    }));
    return result;
  }
}

export const storage = new DatabaseStorage();
