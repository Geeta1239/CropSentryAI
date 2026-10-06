import { query } from "../config/db.js";
export const createPrediction = async ({ userId, diseaseId, imagePath, imageMimeType, result }) => (await query(
    `INSERT INTO predictions (user_id, disease_id, image_path, image_mime_type, confidence, severity, symptoms, organic_recommendations, chemical_recommendations, provider)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
    [userId, diseaseId, imagePath, imageMimeType, result.confidence, result.severity, result.symptoms, result.organicRecommendations, result.chemicalRecommendations, result.provider]
)).rows[0];
export const listPredictionsForUser = async (userId) => (await query(
    `SELECT p.id, p.confidence, p.severity, p.symptoms, p.created_at, d.slug, d.name AS disease_name
     FROM predictions p JOIN diseases d ON d.id=p.disease_id WHERE p.user_id=$1 ORDER BY p.created_at DESC`, [userId]
)).rows;
export const findPredictionForUser = async (id, userId, isAdmin) => (await query(
    `SELECT p.*, d.slug, d.name AS disease_name, d.pathogen FROM predictions p JOIN diseases d ON d.id=p.disease_id
     WHERE p.id=$1 ${isAdmin ? "" : "AND p.user_id=$2"}`, isAdmin ? [id] : [id, userId]
)).rows[0];
export const listAllPredictions = async () => (await query(
    `SELECT p.id, p.confidence, p.severity, p.created_at, d.name AS disease_name, u.name AS user_name, u.email
     FROM predictions p JOIN diseases d ON d.id=p.disease_id JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100`
)).rows;
export const metrics = async () => (await query(
    `SELECT (SELECT count(*) FROM users WHERE role='farmer')::int AS farmers,
     (SELECT count(*) FROM predictions)::int AS predictions,
     (SELECT count(*) FROM diseases)::int AS diseases`
)).rows[0];
