/**
 * MySQL 数据库连接配置
 */

import mysql from 'mysql2/promise'

interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

/**
 * 获取数据库配置
 */
function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'openclaw_chat',
  }
}

// 连接池实例
let pool: mysql.Pool | null = null

/**
 * 获取数据库连接池
 */
export function useDB(): mysql.Pool {
  if (!pool) {
    const config = getDatabaseConfig()
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }
  return pool
}

/**
 * 执行查询
 */
export async function query<T>(sql: string, values?: unknown[]): Promise<T[]> {
  const db = useDB()
  const [rows] = await db.execute(sql, values as any)
  return rows as T[]
}

/**
 * 执行插入/更新/删除，返回影响行数
 */
export async function execute(sql: string, values?: unknown[]): Promise<{ affectedRows: number; insertId: number }> {
  const db = useDB()
  const [result] = await db.execute(sql, values as any)
  return result as { affectedRows: number; insertId: number }
}

/**
 * 关闭连接池
 */
export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
