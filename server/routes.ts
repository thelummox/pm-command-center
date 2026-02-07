import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";
import { insertRfpSchema, insertTemplateSchema, insertReviewSchema } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Users
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // RFPs
  app.get("/api/rfps", async (req: Request, res: Response) => {
    try {
      const rfps = await storage.getAllRfps();
      res.json(rfps);
    } catch (error) {
      console.error("Error fetching RFPs:", error);
      res.status(500).json({ error: "Failed to fetch RFPs" });
    }
  });

  app.get("/api/rfps/search", async (req: Request, res: Response) => {
    try {
      const { title, keywords, consultant, source, state } = req.query as Record<string, string>;
      const rfps = await storage.searchRfps({ title, keywords, consultant, source, state });
      res.json(rfps);
    } catch (error) {
      console.error("Error searching RFPs:", error);
      res.status(500).json({ error: "Failed to search RFPs" });
    }
  });

  app.get("/api/rfps/:id", async (req: Request, res: Response) => {
    try {
      const rfp = await storage.getRfp(parseInt(req.params.id));
      if (!rfp) {
        return res.status(404).json({ error: "RFP not found" });
      }
      res.json(rfp);
    } catch (error) {
      console.error("Error fetching RFP:", error);
      res.status(500).json({ error: "Failed to fetch RFP" });
    }
  });

  app.post("/api/rfps", async (req: Request, res: Response) => {
    try {
      const validatedData = insertRfpSchema.parse(req.body);
      const rfp = await storage.createRfp(validatedData);
      res.status(201).json(rfp);
    } catch (error) {
      console.error("Error creating RFP:", error);
      res.status(400).json({ error: "Failed to create RFP" });
    }
  });

  app.patch("/api/rfps/:id", async (req: Request, res: Response) => {
    try {
      const rfp = await storage.updateRfp(parseInt(req.params.id), req.body);
      if (!rfp) {
        return res.status(404).json({ error: "RFP not found" });
      }
      res.json(rfp);
    } catch (error) {
      console.error("Error updating RFP:", error);
      res.status(500).json({ error: "Failed to update RFP" });
    }
  });

  app.delete("/api/rfps/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteRfp(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting RFP:", error);
      res.status(500).json({ error: "Failed to delete RFP" });
    }
  });

  // RFP Analysis with AI
  app.post("/api/rfps/:id/analyze", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      const rfp = await storage.getRfp(rfpId);
      if (!rfp) {
        return res.status(404).json({ error: "RFP not found" });
      }

      await storage.updateRfp(rfpId, { status: "analyzing" });

      const content = rfp.documentContent || "";
      if (!content) {
        await storage.updateRfp(rfpId, { status: "draft" });
        return res.status(400).json({ error: "No document content to analyze" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert RFP analyst. Extract key requirements from the given RFP document. 
            For each requirement:
            - Provide the exact text of the requirement
            - Categorize it into a section (e.g., "Technical Requirements", "Qualifications", "Budget", "Timeline", "Deliverables")
            - Assign a priority: high, medium, or low
            - Provide the approximate character position in the original text (start and end)
            
            Return your response as a JSON object with a "requirements" array containing objects with these fields:
            { "requirements": [{ "text": "...", "section": "...", "priority": "high|medium|low", "highlightStart": number, "highlightEnd": number }] }
            
            Only return valid JSON.`
          },
          {
            role: "user",
            content: `Analyze this RFP document and extract all key requirements:\n\n${content}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const rawResult = response.choices[0]?.message?.content || "{}";
      const analysisResult = JSON.parse(rawResult);
      const extractedRequirements = Array.isArray(analysisResult) 
        ? analysisResult 
        : (analysisResult.requirements || []);

      await storage.deleteRequirementsByRfp(rfpId);

      for (const req of extractedRequirements) {
        await storage.createRequirement({
          rfpId,
          text: req.text,
          section: req.section,
          priority: req.priority || "medium",
          highlightStart: req.highlightStart || null,
          highlightEnd: req.highlightEnd || null,
          status: "pending",
        });
      }

      await storage.updateRfp(rfpId, { status: "in_progress" });

      const requirements = await storage.getRequirementsByRfp(rfpId);
      res.json({ success: true, requirements });
    } catch (error) {
      console.error("Error analyzing RFP:", error);
      await storage.updateRfp(parseInt(req.params.id), { status: "draft" });
      res.status(500).json({ error: "Failed to analyze RFP" });
    }
  });

  // Requirements
  app.get("/api/rfps/:id/requirements", async (req: Request, res: Response) => {
    try {
      const requirements = await storage.getRequirementsByRfp(parseInt(req.params.id));
      res.json(requirements);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      res.status(500).json({ error: "Failed to fetch requirements" });
    }
  });

  app.patch("/api/requirements/:id", async (req: Request, res: Response) => {
    try {
      const requirement = await storage.updateRequirement(parseInt(req.params.id), req.body);
      if (!requirement) {
        return res.status(404).json({ error: "Requirement not found" });
      }
      res.json(requirement);
    } catch (error) {
      console.error("Error updating requirement:", error);
      res.status(500).json({ error: "Failed to update requirement" });
    }
  });

  // Templates
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(400).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const template = await storage.updateTemplate(parseInt(req.params.id), req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Response
  app.get("/api/rfps/:id/response", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      let response = await storage.getResponseByRfp(rfpId);
      
      if (!response) {
        const newResponse = await storage.createResponse({ rfpId, content: "" });
        response = { ...newResponse, sections: [] };
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching response:", error);
      res.status(500).json({ error: "Failed to fetch response" });
    }
  });

  app.patch("/api/rfps/:id/response", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      let response = await storage.getResponseByRfp(rfpId);
      
      if (!response) {
        const newResponse = await storage.createResponse({ rfpId, content: "" });
        response = { ...newResponse, sections: [] };
      }

      if (req.body.sections) {
        for (const section of req.body.sections) {
          if (section.id) {
            await storage.updateResponseSection(section.id, {
              title: section.title,
              content: section.content,
              orderIndex: section.orderIndex,
            });
          }
        }
      }

      const updated = await storage.getResponseByRfp(rfpId);
      res.json(updated);
    } catch (error) {
      console.error("Error updating response:", error);
      res.status(500).json({ error: "Failed to update response" });
    }
  });

  // Response Sections
  app.post("/api/rfps/:id/response/sections", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      let response = await storage.getResponseByRfp(rfpId);
      
      if (!response) {
        const newResponse = await storage.createResponse({ rfpId, content: "" });
        response = { ...newResponse, sections: [] };
      }

      const section = await storage.createResponseSection({
        responseId: response.id,
        title: req.body.title || "New Section",
        content: "",
        orderIndex: req.body.orderIndex || 0,
      });

      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({ error: "Failed to create section" });
    }
  });

  app.patch("/api/response-sections/:id", async (req: Request, res: Response) => {
    try {
      const section = await storage.updateResponseSection(parseInt(req.params.id), req.body);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("Error updating section:", error);
      res.status(500).json({ error: "Failed to update section" });
    }
  });

  app.delete("/api/response-sections/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteResponseSection(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ error: "Failed to delete section" });
    }
  });

  // Budget
  app.get("/api/rfps/:id/budget", async (req: Request, res: Response) => {
    try {
      const items = await storage.getBudgetItemsByRfp(parseInt(req.params.id));
      res.json(items);
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ error: "Failed to fetch budget" });
    }
  });

  app.post("/api/rfps/:id/budget", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      const items = await storage.saveBudgetItems(rfpId, req.body.items || []);
      res.json(items);
    } catch (error) {
      console.error("Error saving budget:", error);
      res.status(500).json({ error: "Failed to save budget" });
    }
  });

  // Insights
  app.get("/api/rfps/:id/insights", async (req: Request, res: Response) => {
    try {
      const insights = await storage.getInsightsByRfp(parseInt(req.params.id));
      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.post("/api/rfps/:id/insights", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      const response = await storage.getResponseByRfp(rfpId);
      
      if (!response || response.sections.length === 0) {
        return res.status(400).json({ error: "No response content to analyze" });
      }

      const content = response.sections.map(s => `## ${s.title}\n${s.content}`).join("\n\n");

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are a proposal writing expert. Analyze the proposal response and provide actionable insights to improve it.
            Focus on:
            1. Writing improvements - grammar, clarity, conciseness
            2. Inconsistencies - conflicting information, mismatched terminology
            3. Language matching - alignment with professional proposal standards and company tone
            
            Return your response as a JSON object with an "insights" array. Each insight should have:
            { type: "writing_improvement" | "inconsistency" | "language_match", text: string, suggestion: string }
            
            Provide 3-6 high-value insights. Only return valid JSON.`
          },
          {
            role: "user",
            content: `Analyze this proposal response and provide improvement insights:\n\n${content}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const result = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");
      const newInsights = result.insights || [];

      for (const insight of newInsights) {
        await storage.createInsight({
          responseId: response.id,
          type: insight.type,
          text: insight.text,
          suggestion: insight.suggestion,
          isResolved: false,
        });
      }

      const allInsights = await storage.getInsightsByRfp(rfpId);
      res.json(allInsights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.patch("/api/insights/:id", async (req: Request, res: Response) => {
    try {
      const insight = await storage.updateInsight(parseInt(req.params.id), req.body);
      if (!insight) {
        return res.status(404).json({ error: "Insight not found" });
      }
      res.json(insight);
    } catch (error) {
      console.error("Error updating insight:", error);
      res.status(500).json({ error: "Failed to update insight" });
    }
  });

  // Reviews
  app.get("/api/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/rfps/:id/reviews", async (req: Request, res: Response) => {
    try {
      const rfpId = parseInt(req.params.id);
      const review = await storage.createReview({
        rfpId,
        type: req.body.type,
        status: "pending",
      });

      if (req.body.type === "copy_editing" || req.body.type === "budget") {
        await storage.updateRfp(rfpId, { status: "review" });
      }

      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.patch("/api/reviews/:id", async (req: Request, res: Response) => {
    try {
      const review = await storage.updateReview(parseInt(req.params.id), req.body);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ error: "Failed to update review" });
    }
  });

  // Tasks (response sections as tasks)
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // AI Chat
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are an AI assistant for PM Command Center, a proposal management platform. You help proposal managers and consultants with:
- Understanding RFP requirements
- Drafting proposal response sections
- Budget calculations and estimates
- Best practices for government proposals
- Template suggestions and writing tips
- Review processes and compliance

Be helpful, professional, and concise. Provide actionable advice specific to proposal management.`,
        },
        ...history.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "I apologize, I couldn't generate a response.";
      res.json({ response });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ error: "Failed to generate AI response" });
    }
  });

  return httpServer;
}
