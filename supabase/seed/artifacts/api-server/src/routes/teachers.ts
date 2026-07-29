import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, teachersTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListTeachersResponse,
  CreateTeacherBody,
  CreateTeacherResponse,
  GetTeacherParams,
  GetTeacherResponse,
  UpdateTeacherParams,
  UpdateTeacherBody,
  UpdateTeacherResponse,
  DeleteTeacherParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/teachers", async (_req, res): Promise<void> => {
  const teachers = await db.select().from(teachersTable).where(eq(teachersTable.isActive, true)).orderBy(asc(teachersTable.sortOrder));
  res.json(ListTeachersResponse.parse(serialize(teachers)));
});

router.post("/teachers", async (req, res): Promise<void> => {
  const parsed = CreateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [teacher] = await db.insert(teachersTable).values(parsed.data).returning();
  res.status(201).json(CreateTeacherResponse.parse(serialize(teacher)));
});

router.get("/teachers/:id", async (req, res): Promise<void> => {
  const params = GetTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, params.data.id));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.json(GetTeacherResponse.parse(serialize(teacher)));
});

router.patch("/teachers/:id", async (req, res): Promise<void> => {
  const params = UpdateTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [teacher] = await db.update(teachersTable).set(parsed.data).where(eq(teachersTable.id, params.data.id)).returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.json(UpdateTeacherResponse.parse(serialize(teacher)));
});

router.delete("/teachers/:id", async (req, res): Promise<void> => {
  const params = DeleteTeacherParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [teacher] = await db.delete(teachersTable).where(eq(teachersTable.id, params.data.id)).returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
