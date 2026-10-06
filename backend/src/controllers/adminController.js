import { query } from "../config/db.js";
import { listAllPredictions, metrics } from "../models/predictionModel.js";
export async function users(req, res, next) { try { res.json({ users: (await query("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 100")).rows }); } catch (e) { next(e); } }
export async function predictions(req, res, next) { try { res.json({ predictions: await listAllPredictions() }); } catch (e) { next(e); } }
export async function dashboard(req, res, next) { try { res.json({ metrics: await metrics() }); } catch (e) { next(e); } }
