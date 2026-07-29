import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, faqsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListFaqsResponse,
  CreateFaqBody,
  CreateFaqResponse,
  UpdateFaqParams,
  UpdateFaqBody,
  UpdateFaqResponse,
  DeleteFaqParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/faqs", async (req, res): Promise<void> => {
  const { category } = req.query;
  let query = db.select().from(faqsTable).orderBy(asc(faqsTable.sortOrder)).$dynamic();
  if (category && typeof category === "string") {
    query = query.where(eq(faqsTable.category, category));
  }
  const faqs = await query;
  res.json(ListFaqsResponse.parse(serialize(faqs)));
});

router.post("/faqs", async (req, res): Promise<void> => {
  const parsed = CreateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [faq] = await db.insert(faqsTable).values(parsed.data).returning();
  res.status(201).json(CreateFaqResponse.parse(serialize(faq)));
});

router.patch("/faqs/:id", async (req, res): Promise<void> => {
  const params = UpdateFaqParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFaqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [faq] = await db.update(faqsTable).set(parsed.data).where(eq(faqsTable.id, params.data.id)).returning();
  if (!faq) {
    res.status(404).json({ error: "FAQ not found" });
    return;
  }
  res.json(UpdateFaqResponse.parse(serialize(faq)));
});

router.delete("/faqs/:id", async (req, res): Promise<void> => {
  const params = DeleteFaqParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [faq] = await db.delete(faqsTable).where(eq(faqsTable.id, params.data.id)).returning();
  if (!faq) {
    res.status(404).json({ error: "FAQ not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
