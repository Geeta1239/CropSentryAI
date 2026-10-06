import { query } from "../config/db.js";
export const listDiseases = async () => (await query("SELECT slug, name, pathogen, severity, symptoms, organic_recommendations, chemical_recommendations FROM diseases ORDER BY name")).rows;
export const findDiseaseBySlug = async (slug) => (await query("SELECT * FROM diseases WHERE slug = $1", [slug])).rows[0];
