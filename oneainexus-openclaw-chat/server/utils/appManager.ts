/**
 * 应用管理服务
 * 本小姐设计的优雅数据访问层！(￣▽￣)ﾉ
 */

import type { App, AuthResult, AppStatus, CreateAppRequest } from '~/types'
import { query, execute } from './db'

/** 数据库应用行 */
interface AppRow {
  id: string
  client_id: string
  client_secret: string
  name: string
  description: string | null
  owner_id: string
  status: string
  callback_urls: string | null
  created_at: Date
  updated_at: Date
}

/**
 * 将数据库行转换为 App 对象
 */
function rowToApp(row: AppRow): App {
  let callbackUrls: string[] | undefined
  if (row.callback_urls) {
    try {
      callbackUrls = JSON.parse(row.callback_urls)
    } catch {
      // 忽略解析错误
    }
  }

  return {
    id: row.id,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    name: row.name,
    description: row.description || undefined,
    ownerId: row.owner_id,
    status: row.status as AppStatus,
    callbackUrls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 生成客户端 ID
 */
function generateClientId(): string {
  const prefix = 'oc'
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return `${prefix}_${random}`
}

/**
 * 生成客户端密钥
 */
function generateClientSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 应用管理器
 */
class AppManager {
  /**
   * 创建新应用
   */
  async createApp(ownerId: string, request: CreateAppRequest): Promise<App> {
    const now = new Date()
    const app: App = {
      id: crypto.randomUUID(),
      clientId: generateClientId(),
      clientSecret: generateClientSecret(),
      name: request.name,
      description: request.description,
      ownerId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    await execute(
      `INSERT INTO apps (id, client_id, client_secret, name, description, owner_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        app.id,
        app.clientId,
        app.clientSecret,
        app.name,
        app.description || null,
        app.ownerId,
        app.status,
        app.createdAt,
        app.updatedAt,
      ]
    )

    return app
  }

  /**
   * 根据 ID 获取应用
   */
  async getAppById(appId: string): Promise<App | null> {
    const rows = await query<AppRow>(
      'SELECT * FROM apps WHERE id = ? AND is_deleted = 0',
      [appId]
    )

    const row = rows[0]
    if (!row) {
      return null
    }

    return rowToApp(row)
  }

  /**
   * 根据 Client ID 获取应用
   */
  async getAppByClientId(clientId: string): Promise<App | null> {
    const rows = await query<AppRow>(
      'SELECT * FROM apps WHERE client_id = ? AND is_deleted = 0',
      [clientId]
    )

    const row = rows[0]
    if (!row) {
      return null
    }

    return rowToApp(row)
  }

  /**
   * 获取用户的所有应用
   */
  async getAppsByOwner(ownerId: string): Promise<App[]> {
    const rows = await query<AppRow>(
      'SELECT * FROM apps WHERE owner_id = ? AND is_deleted = 0 ORDER BY created_at DESC',
      [ownerId]
    )

    return rows.map(rowToApp)
  }

  /**
   * 删除应用（软删除）
   */
  async deleteApp(appId: string): Promise<boolean> {
    const result = await execute(
      'UPDATE apps SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND is_deleted = 0',
      [appId]
    )

    return result.affectedRows > 0
  }

  /**
   * 更新应用状态
   */
  async updateAppStatus(appId: string, status: AppStatus): Promise<boolean> {
    const result = await execute(
      'UPDATE apps SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, appId]
    )

    return result.affectedRows > 0
  }

  /**
   * 重新生成密钥
   */
  async regenerateSecret(appId: string): Promise<string | null> {
    const newSecret = generateClientSecret()

    const result = await execute(
      'UPDATE apps SET client_secret = ?, updated_at = NOW() WHERE id = ?',
      [newSecret, appId]
    )

    if (result.affectedRows === 0) {
      return null
    }

    return newSecret
  }

  /**
   * 验证客户端凭证
   */
  async authenticate(clientId: string, clientSecret: string): Promise<AuthResult> {
    const app = await this.getAppByClientId(clientId)

    if (!app) {
      return { success: false, error: 'Invalid client_id' }
    }

    if (app.status !== 'active') {
      return { success: false, error: 'Application is disabled' }
    }

    if (app.clientSecret !== clientSecret) {
      return { success: false, error: 'Invalid client_secret' }
    }

    return { success: true, app }
  }

  /**
   * 更新应用信息
   */
  async updateApp(appId: string, data: { name?: string; description?: string }): Promise<boolean> {
    const fields: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }

    if (data.description !== undefined) {
      fields.push('description = ?')
      values.push(data.description)
    }

    if (fields.length === 0) {
      return false
    }

    fields.push('updated_at = NOW()')
    values.push(appId)

    const result = await execute(
      `UPDATE apps SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    return result.affectedRows > 0
  }
}

// 单例实例
let appManagerInstance: AppManager | null = null

export function useAppManager(): AppManager {
  if (!appManagerInstance) {
    appManagerInstance = new AppManager()
  }
  return appManagerInstance
}
