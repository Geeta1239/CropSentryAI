import { Router } from "express";
import * as controller from "../controllers/predictionController.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { upload, verifyImageMagicBytes } from "../middleware/upload.js";

const router = Router();

router.post("/", optionalAuthenticate, upload, verifyImageMagicBytes, controller.create);

// History and detail endpoints require authentication
router.get("/", authenticate, controller.list);
router.get("/:id", authenticate, controller.getOne);

export default router;
