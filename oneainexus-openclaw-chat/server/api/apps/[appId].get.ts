/**
 * GET /api/apps/:appId
 * 获取单个应用详情
 * 需要用户登录认证，且只能查看自己的应用
 */

import { useAppManager } from '~/server/utils/appManager'
import { requireUserAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // 验证用户登录
  const user = await requireUserAuth(event)

  const appId = getRouterParam(event, 'appId')

  if (!appId) {
    throw createError({
      statusCode: 400,
      message: 'Missing appId',
    })
  }

  const appManager = useAppManager()
  const app = await appManager.getAppById(appId)

  if (!app) {
    throw createError({
      statusCode: 404,
      message: 'Application not found',
    })
  }

  // 验证应用所有权：只能查看自己的应用
  if (app.ownerId !== user.userName) {
    throw createError({
      statusCode: 403,
      message: 'Access denied: You do not own this application',
    })
  }

  // 返回应用信息（由于是拥有者，可以返回 clientSecret 供模拟 SDK 使用）
  return {
    success: true,
    data: {
      id: app.id,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      name: app.name,
      description: app.description,
      status: app.status,
      callbackUrls: app.callbackUrls,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    },
  }
})
