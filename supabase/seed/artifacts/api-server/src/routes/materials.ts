import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, materialsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListMaterialsResponse,
  CreateMaterialBody,
  CreateMaterialResponse,
  DeleteMaterialParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/materials", async (req, res): Promise<void> => {
  const { courseId, type } = req.query;
  const conditions = [];
  if (courseId) {
    conditions.push(eq(materialsTable.courseId, Number(courseId)));
  }
  if (type && typeof type === "string") {
    conditions.push(eq(materialsTable.type, type));
  }
  const materials = await db.select().from(materialsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(materialsTable.createdAt));
  res.json(ListMaterialsResponse.parse(serialize(materials)));
});

router.post("/materials", async (req, res): Promise<void> => {
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [material] = await db.insert(materialsTable).values(parsed.data).returning();
  res.status(201).json(CreateMaterialResponse.parse(serialize(material)));
});

router.delete("/materials/:id", async (req, res): Promise<void> => {
  const params = DeleteMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [material] = await db.delete(materialsTable).where(eq(materialsTable.id, params.data.id)).returning();
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
