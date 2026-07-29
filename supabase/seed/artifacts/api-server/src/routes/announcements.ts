import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, announcementsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListAnnouncementsResponse,
  CreateAnnouncementBody,
  CreateAnnouncementResponse,
  DeleteAnnouncementParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/announcements", async (req, res): Promise<void> => {
  const { courseId } = req.query;
  let query = db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt)).$dynamic();
  if (courseId) {
    query = query.where(eq(announcementsTable.courseId, Number(courseId)));
  }
  const announcements = await query;
  res.json(ListAnnouncementsResponse.parse(serialize(announcements)));
});

router.post("/announcements", async (req, res): Promise<void> => {
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [announcement] = await db.insert(announcementsTable).values(parsed.data).returning();
  res.status(201).json(CreateAnnouncementResponse.parse(serialize(announcement)));
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const params = DeleteAnnouncementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [announcement] = await db.delete(announcementsTable).where(eq(announcementsTable.id, params.data.id)).returning();
  if (!announcement) {
    res.status(404).json({ error: "Announcement not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
