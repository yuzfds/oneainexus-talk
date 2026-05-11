declare global {
  // eslint-disable-next-line no-var
  var __openclawWsErrorFilterInstalled: boolean | undefined
}

function isExpectedSocketReset(reason: unknown): boolean {
  if (!reason) {
    return false
  }

  if (reason instanceof AggregateError) {
    return reason.errors.some(isExpectedSocketReset)
  }

  if (!(reason instanceof Error)) {
    return false
  }

  const code = 'code' in reason ? String((reason as Error & { code?: unknown }).code ?? '') : ''
  return (
    code === 'ECONNRESET'
    || reason.message.includes('ECONNRESET')
    || reason.message.includes('socket hang up')
    || reason.message.includes('WebSocket is not open')
  )
}

export default defineNitroPlugin(() => {
  if (globalThis.__openclawWsErrorFilterInstalled) {
    return
  }

  globalThis.__openclawWsErrorFilterInstalled = true

  process.on('unhandledRejection', (reason) => {
    if (isExpectedSocketReset(reason)) {
      console.warn('[WS] Ignored expected socket reset during disconnect')
      return
    }

    console.error('[Nitro] Unhandled rejection:', reason)
  })
})
