import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, inquiriesTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListInquiriesResponse,
  CreateInquiryBody,
  CreateInquiryResponse,
  UpdateInquiryParams,
  UpdateInquiryBody,
  UpdateInquiryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inquiries", async (req, res): Promise<void> => {
  const { type, status } = req.query;
  const conditions = [];
  if (type && typeof type === "string") {
    conditions.push(eq(inquiriesTable.type, type));
  }
  if (status && typeof status === "string") {
    conditions.push(eq(inquiriesTable.status, status));
  }
  const inquiries = await db.select().from(inquiriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(inquiriesTable.createdAt));
  res.json(ListInquiriesResponse.parse(serialize(inquiries)));
});

router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [inquiry] = await db.insert(inquiriesTable).values({ ...parsed.data, status: "pending" }).returning();
  res.status(201).json(CreateInquiryResponse.parse(serialize(inquiry)));
});

router.patch("/inquiries/:id", async (req, res): Promise<void> => {
  const params = UpdateInquiryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [inquiry] = await db.update(inquiriesTable).set(parsed.data).where(eq(inquiriesTable.id, params.data.id)).returning();
  if (!inquiry) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }
  res.json(UpdateInquiryResponse.parse(serialize(inquiry)));
});

export default router;
