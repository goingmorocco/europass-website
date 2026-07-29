import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, testimonialsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListTestimonialsResponse,
  CreateTestimonialBody,
  CreateTestimonialResponse,
  UpdateTestimonialParams,
  UpdateTestimonialBody,
  UpdateTestimonialResponse,
  DeleteTestimonialParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/testimonials", async (req, res): Promise<void> => {
  const { featured } = req.query;
  let query = db.select().from(testimonialsTable).orderBy(desc(testimonialsTable.createdAt)).$dynamic();
  if (featured === "true") {
    query = query.where(eq(testimonialsTable.isFeatured, true));
  }
  const testimonials = await query;
  res.json(ListTestimonialsResponse.parse(serialize(testimonials)));
});

router.post("/testimonials", async (req, res): Promise<void> => {
  const parsed = CreateTestimonialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [testimonial] = await db.insert(testimonialsTable).values(parsed.data).returning();
  res.status(201).json(CreateTestimonialResponse.parse(serialize(testimonial)));
});

router.patch("/testimonials/:id", async (req, res): Promise<void> => {
  const params = UpdateTestimonialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTestimonialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [testimonial] = await db.update(testimonialsTable).set(parsed.data).where(eq(testimonialsTable.id, params.data.id)).returning();
  if (!testimonial) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }
  res.json(UpdateTestimonialResponse.parse(serialize(testimonial)));
});

router.delete("/testimonials/:id", async (req, res): Promise<void> => {
  const params = DeleteTestimonialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [testimonial] = await db.delete(testimonialsTable).where(eq(testimonialsTable.id, params.data.id)).returning();
  if (!testimonial) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
