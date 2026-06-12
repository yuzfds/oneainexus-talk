import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'setup-entry.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['openclaw', 'openclaw/*'],
  noExternal: ['@oneainexus/chat-sdk', '@buape/carbon', 'zod'],
});
