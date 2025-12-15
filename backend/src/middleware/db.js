import { db } from "../config/db.js";

// Attaches the shared Drizzle instance so downstream handlers can call req.db.*
export function attachDb(req, res, next) {
  req.db = db;
  next();
}
