import { Pool, PoolClient } from 'pg'

// Lazy singleton — pool is only created on first query, not at module load.
// This lets `next build` succeed without DATABASE_URL set.
let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return _pool
}

/** Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... */
function toPositional(sql: string): string {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await getPool().query(toPositional(sql), params)
  return rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const { rows } = await getPool().query(toPositional(sql), params)
  return rows[0] as T | undefined
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await getPool().query(toPositional(sql), params)
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
