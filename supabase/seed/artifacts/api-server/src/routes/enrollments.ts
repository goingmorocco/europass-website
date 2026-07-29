import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, enrollmentsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListEnrollmentsResponse,
  CreateEnrollmentBody,
  CreateEnrollmentResponse,
  UpdateEnrollmentParams,
  UpdateEnrollmentBody,
  UpdateEnrollmentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/enrollments", async (req, res): Promise<void> => {
  const { status } = req.query;
  const conditions = [];
  if (status && typeof status === "string") {
    conditions.push(eq(enrollmentsTable.status, status));
  }
  const enrollments = await db.select().from(enrollmentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(enrollmentsTable.createdAt));
  res.json(ListEnrollmentsResponse.parse(serialize(enrollments)));
});

router.post("/enrollments", async (req, res): Promise<void> => {
  const parsed = CreateEnrollmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [enrollment] = await db.insert(enrollmentsTable).values({ ...parsed.data, status: "pending" }).returning();
  res.status(201).json(CreateEnrollmentResponse.parse(serialize(enrollment)));
});

router.patch("/enrollments/:id", async (req, res): Promise<void> => {
  const params = UpdateEnrollmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEnrollmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [enrollment] = await db.update(enrollmentsTable).set(parsed.data).where(eq(enrollmentsTable.id, params.data.id)).returning();
  if (!enrollment) {
    res.status(404).json({ error: "Enrollment not found" });
    return;
  }
  res.json(UpdateEnrollmentResponse.parse(serialize(enrollment)));
});

export default router;
