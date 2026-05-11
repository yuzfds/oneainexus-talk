/**
 * Connection state.
 */
export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

/**
 * SDK client config.
 */
export interface OneainexusClientConfig {
  apiEndpoint: string;
  clientId: string;
  clientSecret: string;

  wsPath?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;

  enableAck?: boolean;
  messageQueueSize?: number;
  messageTimeout?: number;

  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

export type MessagePart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image';
      url: string;
      mimeType?: string;
      width?: number;
      height?: number;
      alt?: string;
      name?: string;
    }
  | {
      type: 'file';
      url: string;
      name: string;
      mimeType?: string;
      size?: number;
    };

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content?: string;
  parts?: MessagePart[];
}

/**
 * Received message emitted by the SDK.
 */
export interface ReceivedMessage {
  id: string;
  type:
    | 'auth_result'
    | 'chat'
    | 'chat_stream'
    | 'connected'
    | 'data'
    | 'error'
    | 'heartbeat'
    | 'text';
  content: string;
  parts?: MessagePart[];
  data?: unknown;
  timestamp: number;
  sessionId: string;
  requiresAck: boolean;
}

/**
 * Outgoing message options.
 */
export interface SendMessageOptions {
  sessionId?: string;
  metadata?: Record<string, unknown>;
  timeout?: number;
  waitForAck?: boolean;
}

/**
 * Send result.
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: number;
}

/**
 * Structured message payload.
 */
export interface StructuredMessage<T = unknown> {
  type: string;
  content: string;
  data?: T;
  sessionId?: string;
  parts?: MessagePart[];
  metadata?: Record<string, unknown>;
}

export type ClientStats = {
  messagesSent: number;
  messagesReceived: number;
  lastHeartbeat: number | null;
  reconnectCount: number;
};

export type SessionInfo = {
  sessionId: string;
  userId: string;
  createdAt: number;
};
