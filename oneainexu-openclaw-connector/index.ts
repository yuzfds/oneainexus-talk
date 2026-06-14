import { defineChannelPluginEntry, type OpenClawPluginApi, type PluginRuntime } from 'openclaw/plugin-sdk/core';
import { oneainexusPlugin } from './src/channel.js';
import { runtimeStore } from './src/runtime-store.js';
import { registerToolEventHooks } from './src/tool-events.js';
import { CONNECTOR_VERSION_LABEL } from './src/version.js';

function registerFullRuntime(api: OpenClawPluginApi): void {
  api.logger.info(
    `Registering ${CONNECTOR_VERSION_LABEL}; registrationMode=${api.registrationMode}; ` +
      `registerHook=${typeof api.registerHook === 'function' ? 'yes' : 'no'}; ` +
      `registerChannel=${typeof api.registerChannel === 'function' ? 'yes' : 'no'}.`,
  );
  registerToolEventHooks(api);
}

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
  description: 'Bridge OpenClaw with agent-app-backend via the Oneainexus Chat SDK.',
  plugin: oneainexusPlugin,
  setRuntime: runtimeStore.setRuntime,
  registerFull: registerFullRuntime,
});

export default entry;
