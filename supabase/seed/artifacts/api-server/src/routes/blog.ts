import { Router, type IRouter } from "express";
import { eq, desc, and, ilike } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import { serialize } from "../lib/serialize";
import {
  ListBlogPostsResponse,
  CreateBlogPostBody,
  CreateBlogPostResponse,
  GetBlogPostParams,
  GetBlogPostResponse,
  UpdateBlogPostParams,
  UpdateBlogPostBody,
  UpdateBlogPostResponse,
  DeleteBlogPostParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/blog", async (req, res): Promise<void> => {
  const { category, search } = req.query;
  const conditions = [eq(blogPostsTable.isPublished, true)];
  if (category && typeof category === "string") {
    conditions.push(eq(blogPostsTable.category, category));
  }
  if (search && typeof search === "string") {
    conditions.push(ilike(blogPostsTable.title, `%${search}%`));
  }
  const posts = await db.select().from(blogPostsTable)
    .where(and(...conditions))
    .orderBy(desc(blogPostsTable.publishedAt));
  res.json(ListBlogPostsResponse.parse(serialize(posts)));
});

router.post("/blog", async (req, res): Promise<void> => {
  const parsed = CreateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [post] = await db.insert(blogPostsTable).values(parsed.data).returning();
  res.status(201).json(CreateBlogPostResponse.parse(serialize(post)));
});

router.get("/blog/:id", async (req, res): Promise<void> => {
  const params = GetBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, params.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(GetBlogPostResponse.parse(serialize(post)));
});

router.patch("/blog/:id", async (req, res): Promise<void> => {
  const params = UpdateBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [post] = await db.update(blogPostsTable).set(parsed.data).where(eq(blogPostsTable.id, params.data.id)).returning();
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(UpdateBlogPostResponse.parse(serialize(post)));
});

router.delete("/blog/:id", async (req, res): Promise<void> => {
  const params = DeleteBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [post] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, params.data.id)).returning();
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
