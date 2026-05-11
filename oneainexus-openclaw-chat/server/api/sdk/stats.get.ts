/**
 * GET /api/sdk/stats
 * 获取 SDK 连接统计
 */

import { useSDKManager } from '../../utils/sdkManager'

export default defineEventHandler(() => {
  const sdkManager = useSDKManager()
  return {
    success: true,
    data: sdkManager.getStats(),
  }
})
