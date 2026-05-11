/**
 * POST /api/apps/:appId/regenerate-secret
 * 重新生成应用密钥
 * 需要用户登录认证，且只能操作自己的应用
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

  // 先检查应用是否存在且属于当前用户
  const app = await appManager.getAppById(appId)

  if (!app) {
    throw createError({
      statusCode: 404,
      message: 'Application not found',
    })
  }

  // 验证应用所有权：只能操作自己的应用
  if (app.ownerId !== user.userName) {
    throw createError({
      statusCode: 403,
      message: 'Access denied: You do not own this application',
    })
  }

  const newSecret = await appManager.regenerateSecret(appId)

  return {
    success: true,
    clientSecret: newSecret,  // 只在重新生成时返回！
    message: 'Secret regenerated. Please save it securely.',
  }
})
