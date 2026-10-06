// file:///c:/VS%20Code/project/backend/src/server.js
import http from "node:http";
import app from "./app.js";
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
server.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
