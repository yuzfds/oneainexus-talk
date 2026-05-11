/**
 * 用户信息类型定义
 */

/** 用户信息 */
export interface UserInfo {
  /** 用户名 */
  userName: string
  /** 昵称 */
  nickname: string
  /** 邮箱 */
  email: string
  /** 手机号 */
  phoneNum: string
  /** 组织/机构 */
  organization: string
  /** 头像 ID */
  faceId: number
  /** 头像 URL */
  faceUrl: string
  /** 用户 ID */
  userId: string | null
  /** 个人简介 */
  personalProfile: string | null
  /** 研究方向 */
  researchDirection: string | null
  /** 专业特长 */
  speciality: string | null
}

/** 认证响应 */
export interface AuthResponse {
  /** 响应码 */
  code: string
  /** 是否成功 */
  success: boolean
  /** 响应消息 */
  message: string
  /** HTTP 响应码 */
  responseCode: number
  /** 用户数据 */
  data: UserInfo
}

/** 认证状态 */
export interface AuthState {
  /** 是否已认证 */
  isAuthenticated: boolean
  /** 用户信息 */
  user: UserInfo | null
  /** 认证 token */
  token: string | null
  /** 加载中 */
  loading: boolean
  /** 错误信息 */
  error: string | null
}
