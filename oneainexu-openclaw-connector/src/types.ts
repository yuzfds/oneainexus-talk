import type { MessagePart, ReceivedMessage } from '@oneainexus/chat-sdk';

export const CHANNEL_ID = 'oneainexus';
export const DEFAULT_ACCOUNT_ID = 'default';
export const DEFAULT_DM_POLICY = 'open';

export type OneainexusAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  configured: boolean;
  apiEndpoint?: string;
  wsPath?: string;
  clientId?: string;
  clientSecret?: string;
  allowFrom: string[];
  dmPolicy: string;
};

export type SDKChatTurn = {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  parts?: MessagePart[];
};

export type SDKChatEnvelope = {
  sessionId?: string;
  stream?: boolean;
  messages?: SDKChatTurn[];
};

export type InboundMessageContext = {
  account: OneainexusAccount;
  accountId: string;
  sessionId: string;
  target: string;
  rawMessage: ReceivedMessage;
  envelope: SDKChatEnvelope;
};

