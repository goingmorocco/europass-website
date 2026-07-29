import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import teachersRouter from "./teachers";
import blogRouter from "./blog";
import faqsRouter from "./faqs";
import inquiriesRouter from "./inquiries";
import testimonialsRouter from "./testimonials";
import enrollmentsRouter from "./enrollments";
import materialsRouter from "./materials";
import announcementsRouter from "./announcements";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(teachersRouter);
router.use(blogRouter);
router.use(faqsRouter);
router.use(inquiriesRouter);
router.use(testimonialsRouter);
router.use(enrollmentsRouter);
router.use(materialsRouter);
router.use(announcementsRouter);
router.use(statsRouter);

export default router;
