import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import diseaseRoutes from "./routes/diseaseRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { getModelInfo } from "./services/predictionService.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "100kb" }));
app.use("/uploads", express.static(env.uploadDir));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionRoutes);
app.get("/api/model", async (req, res, next) => {
    try {
        res.json({ model: await getModelInfo() });
    } catch (error) {
        next(error);
    }
});
app.use("/api/diseases", diseaseRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
