import { Router } from "express";
import { findDiseaseBySlug, listDiseases } from "../models/diseaseModel.js";
const router = Router();
router.get("/", async (req, res, next) => { try { res.json({ diseases: await listDiseases() }); } catch (e) { next(e); } });
router.get("/:slug", async (req, res, next) => { try { const disease = await findDiseaseBySlug(req.params.slug); if (!disease) return res.status(404).json({ error: "Disease not found" }); res.json({ disease }); } catch (e) { next(e); } });
export default router;
