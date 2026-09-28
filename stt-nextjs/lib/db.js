// Shared Postgres pool (Neon, via Vercel Marketplace). One pool per
// serverless instance, same pattern as the /api/sync/* and /api/data/*
// functions in the vercel-app project.
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  }
  return pool;
}

module.exports = { getPool };
