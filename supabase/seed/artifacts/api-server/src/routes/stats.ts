import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { db, coursesTable, teachersTable, enrollmentsTable, inquiriesTable, blogPostsTable } from "@workspace/db";
import { GetStatsOverviewResponse, GetRecentInquiriesResponse } from "@workspace/api-zod";
import { serialize } from "../lib/serialize";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [
    [{ totalCourses }],
    [{ totalTeachers }],
    [{ totalEnrollments }],
    [{ totalInquiries }],
    [{ pendingInquiries }],
    [{ totalBlogPosts }],
    recentEnrollments,
  ] = await Promise.all([
    db.select({ totalCourses: count() }).from(coursesTable),
    db.select({ totalTeachers: count() }).from(teachersTable),
    db.select({ totalEnrollments: count() }).from(enrollmentsTable),
    db.select({ totalInquiries: count() }).from(inquiriesTable),
    db.select({ pendingInquiries: count() }).from(inquiriesTable).where(eq(inquiriesTable.status, "pending")),
    db.select({ totalBlogPosts: count() }).from(blogPostsTable),
    db.select().from(enrollmentsTable).orderBy(desc(enrollmentsTable.createdAt)).limit(5),
  ]);

  res.json(GetStatsOverviewResponse.parse(serialize({
    totalCourses,
    totalTeachers,
    totalEnrollments,
    totalInquiries,
    pendingInquiries,
    totalBlogPosts,
    recentEnrollments,
  })));
});

router.get("/stats/recent-inquiries", async (_req, res): Promise<void> => {
  const inquiries = await db.select().from(inquiriesTable).orderBy(desc(inquiriesTable.createdAt)).limit(10);
  res.json(GetRecentInquiriesResponse.parse(serialize(inquiries)));
});

export default router;
