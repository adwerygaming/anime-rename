import path from "node:path";
import { QuickDB } from "quick.db";

const filePath = path.join(process.cwd(), "anime-rename.db");
const db = new QuickDB({ filePath });

export default db;