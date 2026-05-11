/**
 * Markdown 渲染 Composable
 * 本小姐设计的优雅实现！(￣▽￣)ﾉ
 */

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const md = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      } catch {
        // 忽略错误
      }
    }
    // MarkdownIt 会自动处理未高亮的代码块的转义，但为了安全，我们可以自己转义
    return '' // 返回空字符串会让 MarkdownIt 使用默认的 escapeHtml
  },
})

export const useMarkdown = () => {
  const render = (content: string): string => {
    if (!content) return ''
    return md.render(content)
  }

  return {
    render,
  }
}
