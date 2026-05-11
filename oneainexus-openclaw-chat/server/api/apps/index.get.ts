/**
 * GET /api/apps
 * 获取当前用户的所有应用列表
 * 需要用户登录认证
 */

import { useAppManager } from '~/server/utils/appManager'
import { requireUserAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // 验证用户登录
  const user = await requireUserAuth(event)

  const appManager = useAppManager()
  const apps = await appManager.getAppsByOwner(user.userName)

  return {
    success: true,
    data: apps,
  }
})
