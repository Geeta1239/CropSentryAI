import { Router } from "express";
import * as controller from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/auth.js";
const router = Router();
router.use(authenticate, authorize("admin"));
router.get("/users", controller.users);
router.get("/predictions", controller.predictions);
router.get("/metrics", controller.dashboard);
export default router;
