import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root123456',
  database: process.env.MYSQL_DATABASE || 'openclaw_chat',
})

async function hasColumn(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  return rows[0].count > 0
}

async function hasIndex(tableName, indexName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  )
  return rows[0].count > 0
}

async function init() {
  try {
    await pool.query(`
CREATE TABLE IF NOT EXISTS apps (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL UNIQUE,
  client_secret VARCHAR(128) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  owner_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  callback_urls JSON NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_owner_id (owner_id),
  INDEX idx_is_deleted (is_deleted)
)
    `)

    if (!(await hasColumn('apps', 'is_deleted'))) {
      await pool.query(`
ALTER TABLE apps
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
  ADD INDEX idx_is_deleted (is_deleted)
      `)
    }

    await pool.query(`
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  app_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  content LONGTEXT NOT NULL,
  parts_json LONGTEXT NULL,
  event_type VARCHAR(50) NULL,
  event_json LONGTEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_session (app_id, session_id),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_created_at (created_at)
)
    `)
    if (!(await hasColumn('messages', 'is_deleted'))) {
      await pool.query(`
ALTER TABLE messages
  ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0
      `)
    }

    if (!(await hasColumn('messages', 'deleted_at'))) {
      await pool.query(`
ALTER TABLE messages
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
      `)
    }

    if (!(await hasColumn('messages', 'event_type'))) {
      await pool.query(`
ALTER TABLE messages
  ADD COLUMN event_type VARCHAR(50) NULL
      `)
    }

    if (!(await hasColumn('messages', 'parts_json'))) {
      await pool.query(`
ALTER TABLE messages
  ADD COLUMN parts_json LONGTEXT NULL
      `)
    }

    if (!(await hasColumn('messages', 'event_json'))) {
      await pool.query(`
ALTER TABLE messages
  ADD COLUMN event_json LONGTEXT NULL
      `)
    }

    if (!(await hasIndex('messages', 'idx_is_deleted'))) {
      await pool.query(`
CREATE INDEX idx_is_deleted ON messages (is_deleted)
      `)
    }

    await pool.query(`
ALTER TABLE messages
  MODIFY COLUMN role VARCHAR(20) NOT NULL,
  MODIFY COLUMN content LONGTEXT NOT NULL
    `)
    console.log('Table messages created successfully')
  } catch (e) {
    console.error(e)
  }
  process.exit(0)
}
init()
