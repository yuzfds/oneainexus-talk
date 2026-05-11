import type { MessagePart } from '~/types'
import { query, execute } from './db'

export interface DBMessage {
  id: string
  app_id: string
  session_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  event_type?: string | null
  event_json?: string | null
  parts_json?: string | null
  created_at: Date
  is_deleted?: number
  deleted_at?: Date | null
}

type DBMessageRole = DBMessage['role']

type SaveMessageOptions = {
  eventType?: string
  event?: Record<string, unknown>
  parts?: MessagePart[]
}

function isMissingEventColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return /Unknown column 'event_(type|json)'/i.test(error.message)
}

function isMissingPartsColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return /Unknown column 'parts_json'/i.test(error.message)
}

export const useMessageManager = () => {
  return {
    /**
     * 创建会话占位记录（用于会话列表展示与会话存在性标记）
     */
    async createSession(appId: string, sessionId: string): Promise<boolean> {
      return this.saveMessage(
        appId,
        sessionId,
        'system',
        '[session_created]',
        {
          eventType: 'session_created',
          event: { source: 'chat_ui' },
        },
      )
    },

    /**
     * 保存一条消息
     */
    async saveMessage(
      appId: string,
      sessionId: string,
      role: DBMessageRole,
      content: string,
      options: SaveMessageOptions = {},
    ): Promise<boolean> {
      try {
        const id = crypto.randomUUID()
        const serializedEvent = options.event ? JSON.stringify(options.event) : null
        const serializedParts = options.parts?.length ? JSON.stringify(options.parts) : null
        let result

        try {
          result = await execute(
            'INSERT INTO messages (id, app_id, session_id, role, content, event_type, event_json, parts_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              id,
              appId || '',
              sessionId || '',
              role || 'user',
              content || '',
              options.eventType || null,
              serializedEvent,
              serializedParts,
            ],
          )
        } catch (error) {
          if (!isMissingEventColumnError(error) && !isMissingPartsColumnError(error)) {
            throw error
          }

          result = await execute(
            'INSERT INTO messages (id, app_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)',
            [id, appId || '', sessionId || '', role || 'user', content || ''],
          )
        }

        return result.affectedRows > 0
      } catch (error) {
        console.error('[DB] Failed to save message:', error)
        return false
      }
    },

    /**
     * 获取会话的历史消息
     */
    async getSessionMessages(appId: string, sessionId: string, limit = 50): Promise<DBMessage[]> {
      try {
        const safeLimit = Number(limit) > 0 ? Number(limit) : 50
        // 按照时间正序排列
        const messages = await query<DBMessage>(
          `SELECT *
           FROM messages
           WHERE app_id = ? AND session_id = ? AND is_deleted = 0 AND role <> 'system'
           ORDER BY created_at ASC
           LIMIT ${safeLimit}`,
          [appId, sessionId]
        )
        return messages
      } catch (error) {
        console.error('[DB] Failed to get session messages:', error)
        return []
      }
    },
    /**
     * 获取应用的会话列表
     */
    async getSessionList(appId: string): Promise<{ sessionId: string, title: string, updatedAt: Date }[]> {
      try {
        const sessions = await query<{ session_id: string, updated_at: Date }>(
          `SELECT session_id, MAX(created_at) as updated_at 
           FROM messages 
           WHERE app_id = ? AND is_deleted = 0
           GROUP BY session_id 
           ORDER BY updated_at DESC`,
          [appId]
        )
        
        const result = [];
        for (const s of sessions) {
           const firstMsg = await query<{content: string}>(
             `SELECT content
              FROM messages
              WHERE app_id = ? AND session_id = ? AND role = 'user' AND is_deleted = 0
              ORDER BY created_at ASC
              LIMIT 1`,
             [appId, s.session_id]
           );
           
           // 截取前 20 个字符作为标题
           let title = firstMsg[0]?.content || '新对话';
           if (title.length > 20) {
             title = title.substring(0, 20) + '...';
           }
           
           result.push({
             sessionId: s.session_id,
             title,
             updatedAt: s.updated_at
           });
        }
        return result;
      } catch (error) {
        console.error('[DB] Failed to get session list:', error)
        return []
      }
    },
    
    /**
     * 删除会话的所有消息
     */
    async deleteSession(appId: string, sessionId: string): Promise<boolean> {
      try {
        const result = await execute(
          `UPDATE messages
           SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
           WHERE app_id = ? AND session_id = ? AND is_deleted = 0`,
          [appId, sessionId]
        )
        return result.affectedRows > 0
      } catch (error) {
        console.error('[DB] Failed to delete session:', error)
        return false
      }
    }
  }
}
