CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer','admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS diseases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(160) NOT NULL, pathogen TEXT, severity VARCHAR(20) NOT NULL,
    symptoms TEXT NOT NULL, organic_recommendations JSONB NOT NULL DEFAULT '[]',
    chemical_recommendations JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disease_id UUID NOT NULL REFERENCES diseases(id), image_path TEXT NOT NULL, image_mime_type VARCHAR(80) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100), severity VARCHAR(20) NOT NULL,
    symptoms TEXT NOT NULL, organic_recommendations JSONB NOT NULL, chemical_recommendations JSONB NOT NULL,
    provider VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS predictions_user_created_idx ON predictions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS treatment_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), disease_id UUID NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('organic','chemical')), recommendation TEXT NOT NULL
);
INSERT INTO diseases (slug,name,pathogen,severity,symptoms,organic_recommendations,chemical_recommendations) VALUES
('blight','Bacterial Blight','Xanthomonas citri pv. malvacearum','high','Water-soaked angular lesions, vein blighting, and boll rot.','["Neem cake soil application","Pseudomonas fluorescens foliar spray"]','["Copper Oxychloride 50 WP @ 2.5g/L","Streptocycline @ 0.1g/L"]'),
('fusarium','Fusarium Wilt','Fusarium oxysporum f. sp. vasinfectum','medium','Lower leaf yellowing, marginal necrosis, vascular browning, and wilting.','["Rotate with non-host crops","Trichoderma-enriched farmyard manure"]','["Carbendazim 50 WP root drench @ 1g/L"]'),
('alternaria','Alternaria Leaf Spot','Alternaria macrospora','medium','Brown circular spots with concentric rings and a shot-hole effect.','["Neem leaf extract spray","Bacillus subtilis bio-control"]','["Mancozeb 75 WP @ 2g/L","Propiconazole 25 EC @ 1ml/L"]'),
('curl','Cotton Leaf Curl Virus','Begomovirus / whitefly vector','high','Curled leaf margins, thickened veins, enations, and stunted growth.','["Yellow sticky traps","Verticillium lecanii spray"]','["Diafenthiuron 50 WP @ 1g/L","Thiamethoxam 25 WG @ 0.3g/L"]')
ON CONFLICT (slug) DO NOTHING;
