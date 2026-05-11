/**
 * POST /api/apps
 * 创建新应用
 * 需要用户登录认证
 */

import { z } from 'zod'
import type { CreateAppResponse } from '~/types'
import { useAppManager } from '~/server/utils/appManager'
import { requireUserAuth } from '~/server/utils/auth'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  callbackUrls: z.array(z.string().url()).optional(),
  rateLimit: z.object({
    maxRequests: z.number().int().min(1).max(10000).optional(),
    dailyLimit: z.number().int().min(1).optional(),
  }).optional(),
})

export default defineEventHandler(async (event): Promise<CreateAppResponse> => {
  // 验证用户登录
  const user = await requireUserAuth(event)

  const body = await readBody(event)
  const parsed = createSchema.parse(body)

  const appManager = useAppManager()

  // 创建应用，使用当前用户的 userName 作为 ownerId
  const app = await appManager.createApp(user.userName, {
    name: parsed.name,
    description: parsed.description,
  })

  return {
    success: true,
    app: {
      id: app.id,
      clientId: app.clientId,
      clientSecret: app.clientSecret,  // 只在创建时返回一次！
      name: app.name,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt,
    },
  } as CreateAppResponse
})
