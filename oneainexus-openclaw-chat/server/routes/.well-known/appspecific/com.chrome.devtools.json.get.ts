import { setHeader } from 'h3'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/json; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300')
  return {}
})
