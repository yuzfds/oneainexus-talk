function stripTrailingSlash(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}

export default defineNitroPlugin((nitroApp) => {
  const baseURL = stripTrailingSlash(useRuntimeConfig().app.baseURL || '/')
  if (baseURL === '/') {
    return
  }

  const layers = (nitroApp.h3App as any)?.stack as Array<{ route?: string; handler?: any }> | undefined
  if (!Array.isArray(layers)) {
    return
  }

  for (const layer of layers) {
    if (layer?.route !== baseURL) {
      continue
    }
    const handler = layer.handler as any
    if (typeof handler !== 'function') {
      continue
    }
    if (handler.__websocket__ || handler.__resolve__) {
      continue
    }
    handler.__resolve__ = async () => undefined
  }
})
