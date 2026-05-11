import { defineChannelPluginEntry, type OpenClawPluginApi, type PluginRuntime } from 'openclaw/plugin-sdk/core';
import { oneainexusPlugin } from './src/channel.js';
import { runtimeStore } from './src/runtime-store.js';

const entry: {
  id: string;
  name: string;
  description: string;
  configSchema: NonNullable<typeof oneainexusPlugin.configSchema>;
  register: (api: OpenClawPluginApi) => void;
  channelPlugin: typeof oneainexusPlugin;
  setChannelRuntime?: (runtime: PluginRuntime) => void;
} = defineChannelPluginEntry({
  id: 'oneainexus-openclaw-connector',
  name: 'Oneainexus Chat',
  description: 'Bridge OpenClaw with oneainexus-openclaw-chat via the Oneainexus Chat SDK.',
  plugin: oneainexusPlugin,
  setRuntime: runtimeStore.setRuntime,
});

export default entry;
