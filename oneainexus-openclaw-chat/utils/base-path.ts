function normalizeBaseURL(baseURL: string): string {
  const withLeadingSlash = baseURL.startsWith('/') ? baseURL : `/${baseURL}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export function withAppBasePath(baseURL: string, path: string): string {
  const normalizedPath = path.replace(/^\/+/, '')
  return `${normalizeBaseURL(baseURL)}${normalizedPath}`
}
