/**
 * Chat-related types.
 */

export type MessageRole = 'user' | 'robot' | 'tool';
export type ApiMessageRole = Exclude<MessageRole, 'tool'>;

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

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  parts?: MessagePart[];
  eventType?: string;
  event?: Record<string, unknown>;
  timestamp: number;
  sessionId?: string;
}

export interface ApiChatMessage {
  role: ApiMessageRole;
  content?: string;
  parts?: MessagePart[];
}

export interface StreamChunk {
  type: 'chat_stream';
  content?: string;
  parts?: MessagePart[];
  eventType?: string;
  kind?: string;
  event?: Record<string, unknown>;
  done?: boolean;
  finishReason?: string;
}

export interface ChatRequest {
  messages: ApiChatMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
}

export type SSEEventType = 'connected' | 'message' | 'done' | 'error' | 'heartbeat';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  data: T;
  timestamp: number;
}

export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

export interface ClientStats {
  connectedAt?: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectCount: number;
  lastHeartbeatAt?: number;
}
