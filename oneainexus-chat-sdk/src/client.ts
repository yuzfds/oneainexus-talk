import EventEmitter from 'eventemitter3';
import WebSocket from 'isomorphic-ws';
import {
  ChatMessage,
  ConnectionState,
  OneainexusClientConfig,
  ReceivedMessage,
  SendMessageOptions,
  SendMessageResult,
  StructuredMessage,
  ClientStats,
  SessionInfo,
  MessagePart,
} from './types';

export type MessageListener = (message: ReceivedMessage, client: OneainexusChatClient) => void | Promise<void>;

function extractTextFromParts(parts?: MessagePart[]): string {
  if (!parts?.length) return '';

  return parts.map((part) => {
    switch (part.type) {
      case 'text':
        return part.text;
      case 'image':
        return part.alt || part.name || part.url;
      case 'file':
        return part.name || part.url;
      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

function normalizeChatMessage(message: ChatMessage): ChatMessage {
  if (message.parts?.length) {
    return {
      ...message,
      content: message.content ?? extractTextFromParts(message.parts),
    };
  }

  if (message.content) {
    return {
      ...message,
      parts: message.parts ?? [{ type: 'text', text: message.content }],
    };
  }

  return message;
}

export class OneainexusChatClient {
  private config: OneainexusClientConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.Disconnected;
  private emitter = new EventEmitter();
  
  private stats: ClientStats = {
    messagesSent: 0,
    messagesReceived: 0,
    lastHeartbeat: null,
    reconnectCount: 0,
  };
  private sessionInfo: SessionInfo | null = null;

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  
  // Pending messages waiting for ack
  private pendingAcks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: any }>();

  constructor(config: OneainexusClientConfig) {
    this.config = {
      wsPath: '/api/_ws',
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      enableAck: true,
      messageQueueSize: 100,
      messageTimeout: 60000,
      logLevel: 'info',
      ...config,
    };
  }

  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.emitter.emit('state-change', newState);
      this.log('debug', `State changed to: ${newState}`);
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]) {
    if (this.config.logLevel === 'silent') return;
    
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.config.logLevel as keyof typeof levels] ?? 1;
    
    if (levels[level] >= currentLevel) {
      console[level](`[OpenClawChat] ${message}`, ...args);
    }
  }

  /**
   * Connect to the server
   */
  public async connect(): Promise<void> {
    if (this.state === ConnectionState.Connected || this.state === ConnectionState.Connecting) {
      return;
    }

    this.setState(ConnectionState.Connecting);
    
    // Auth and connect
    try {
      // Step 1: Request connection ticket/token (optional, depending on backend implementation)
      // Here we simply connect using query params or headers
      const wsUrl = this.buildWsUrl();
      this.log('info', `Connecting to ${wsUrl}...`);
      
      return new Promise((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.log('info', 'Connected successfully. Waiting for auth...');
          // Don't set Connected state yet. We need to authenticate.
          
          // Send auth message
          this.ws!.send(JSON.stringify({
            type: 'auth',
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            data: {
              clientId: this.config.clientId,
              clientSecret: this.config.clientSecret
            }
          }));
        };

        this.ws.onmessage = (event: WebSocket.MessageEvent) => {
          const payload = JSON.parse(event.data.toString());
          
          if (payload.type === 'auth_result') {
            if (payload.data?.success) {
              this.log('info', 'Authenticated successfully');
              this.sessionInfo = {
                sessionId: payload.data.sessionId,
                userId: this.config.clientId,
                createdAt: Date.now()
              };
              this.setState(ConnectionState.Connected);
              this.reconnectAttempts = 0;
              this.stats.reconnectCount = 0;
              this.startHeartbeat();
              this.emitter.emit('connected');
              resolve();
            } else {
              const errorMsg = payload.data?.error || 'Authentication failed';
              this.log('error', errorMsg);
              this.setState(ConnectionState.Error);
              reject(new Error(errorMsg));
              this.ws?.close();
            }
            return;
          }
          
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event: WebSocket.CloseEvent) => {
          this.log('warn', `Connection closed: ${event.code} ${event.reason}`);
          this.stopHeartbeat();
          
          if (this.state === ConnectionState.Connecting) {
            reject(new Error(`Failed to connect: ${event.reason}`));
          }
          
          this.setState(ConnectionState.Disconnected);
          this.emitter.emit('disconnected');
          this.ws = null;
          
          this.handleReconnect();
        };

        this.ws.onerror = (error: WebSocket.ErrorEvent) => {
          this.log('error', 'WebSocket error', error);
          this.emitter.emit('error', error);
        };
      });
    } catch (error) {
      this.setState(ConnectionState.Error);
      this.log('error', 'Connection failed', error);
      throw error;
    }
  }

  private buildWsUrl(): string {
    const baseUrl = this.config.apiEndpoint.replace(/^http/, 'ws');
    const path = this.config.wsPath || '/api/_ws';
    const url = new URL(path, baseUrl);
    return url.toString();
  }

  private handleReconnect() {
    if (!this.config.reconnect) return;
    if (this.state === ConnectionState.Connecting || this.state === ConnectionState.Reconnecting) return;
    
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.log('error', 'Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnectCount++;
    this.setState(ConnectionState.Reconnecting);
    
    const delay = this.config.reconnectInterval || 3000;
    this.log('info', `Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error is already logged in connect()
      });
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (!this.config.heartbeatInterval) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ 
          type: 'heartbeat',
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          data: { timestamp: Date.now() }
        }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(data: WebSocket.Data) {
    try {
      const payload = JSON.parse(data.toString());
      
      // Handle system messages
      if (payload.type === 'heartbeat') {
        this.stats.lastHeartbeat = Date.now();
        return;
      }
      
      if (payload.type === 'chat_received') {
        const pending = this.pendingAcks.get(payload.data?.messageId || payload.id);
        if (pending) {
          clearTimeout(pending.timer);
          pending.resolve({
            success: true,
            messageId: payload.data?.messageId || payload.id,
            timestamp: Date.now()
          });
          this.pendingAcks.delete(payload.data?.messageId || payload.id);
        }
        return;
      }
      
      if (payload.type === 'session_info') {
        this.sessionInfo = payload.data;
        return;
      }

      // Handle user messages
      this.stats.messagesReceived++;
      const parts = payload.parts || payload.data?.parts;
      const message: ReceivedMessage = {
        id: payload.id || crypto.randomUUID(),
        type: payload.type || 'text',
        content: payload.content || payload.data?.content || extractTextFromParts(parts),
        parts,
        data: payload.data,
        timestamp: payload.timestamp || Date.now(),
        sessionId: payload.sessionId || payload.data?.sessionId || this.sessionInfo?.sessionId || '',
        requiresAck: !!payload.requiresAck,
      };

      this.emitter.emit('message', message, this);
      
    } catch (err) {
      this.log('error', 'Failed to parse message', err);
    }
  }

  /**
   * Disconnect from the server
   */
  public async disconnect(graceful: boolean = true): Promise<void> {
    if (this.state === ConnectionState.Disconnected) return;
    
    this.config.reconnect = false; // Disable reconnect on intentional disconnect
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    
    this.setState(ConnectionState.Disconnected);
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Send a chat message
   */
  public async sendMessage(content: string | ChatMessage | MessagePart[], options?: SendMessageOptions): Promise<SendMessageResult> {
    if (this.state !== ConnectionState.Connected || !this.ws) {
      throw new Error('Not connected to server');
    }

    const messageId = crypto.randomUUID();
    const normalizedMessage = Array.isArray(content)
      ? normalizeChatMessage({ role: 'user', parts: content })
      : typeof content === 'string'
        ? normalizeChatMessage({ role: 'user', content })
        : normalizeChatMessage(content);
    const payload = {
      id: messageId,
      type: 'chat',
      timestamp: Date.now(),
      data: {
        sessionId: options?.sessionId || this.sessionInfo?.sessionId,
        messages: [{
          role: normalizedMessage.role,
          content: normalizedMessage.content,
          parts: normalizedMessage.parts,
        }],
        metadata: options?.metadata
      }
    };

    return this.sendPayload(payload, options);
  }

  /**
   * Send a structured message
   */
  public async sendStructuredMessage<T = unknown>(message: StructuredMessage<T>, options?: SendMessageOptions): Promise<SendMessageResult> {
    if (this.state !== ConnectionState.Connected || !this.ws) {
      throw new Error('Not connected to server');
    }

    const messageId = crypto.randomUUID();
    const normalizedContent = message.content || extractTextFromParts(message.parts);
    const payload = {
      id: messageId,
      ...message,
      content: normalizedContent,
      timestamp: Date.now(),
    };

    return this.sendPayload(payload, options);
  }

  private sendPayload(payload: any, options?: SendMessageOptions): Promise<SendMessageResult> {
    const waitForAck = options?.waitForAck ?? this.config.enableAck;
    
    this.ws!.send(JSON.stringify(payload));
    this.stats.messagesSent++;

    if (!waitForAck) {
      return Promise.resolve({
        success: true,
        messageId: payload.id,
        timestamp: Date.now(),
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = options?.timeout || this.config.messageTimeout || 60000;
      const timer = setTimeout(() => {
        this.pendingAcks.delete(payload.id);
        resolve({
          success: false,
          error: 'Message ack timeout',
          timestamp: Date.now(),
        });
      }, timeout);

      this.pendingAcks.set(payload.id, { resolve, reject, timer });
    });
  }

  /**
   * Register a message listener
   */
  public onMessage(listener: MessageListener): () => void {
    this.emitter.on('message', listener);
    return () => this.offMessage(listener);
  }

  public onceMessage(listener: MessageListener): void {
    this.emitter.once('message', listener);
  }

  public offMessage(listener: MessageListener): void {
    this.emitter.off('message', listener);
  }

  public onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.emitter.on('state-change', listener);
    return () => this.emitter.off('state-change', listener);
  }

  public onError(listener: (error: Error) => void): () => void {
    this.emitter.on('error', listener);
    return () => this.emitter.off('error', listener);
  }

  /**
   * Acknowledge a message
   */
  public async acknowledge(messageId: string): Promise<void> {
    if (this.state !== ConnectionState.Connected || !this.ws) return;
    this.ws.send(JSON.stringify({ type: 'ack', messageId }));
  }

  public async acknowledgeBatch(messageIds: string[]): Promise<void> {
    if (this.state !== ConnectionState.Connected || !this.ws) return;
    this.ws.send(JSON.stringify({ type: 'ack_batch', messageIds }));
  }

  public getStats(): ClientStats {
    return { ...this.stats };
  }

  public getSessionInfo(): SessionInfo | null {
    return this.sessionInfo ? { ...this.sessionInfo } : null;
  }
}
