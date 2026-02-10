// HTMLの簡易サニタイズを行うユーティリティ
const DANGEROUS_TAGS_RE = /<\/?(script|style|iframe|object|embed|link|meta)[^>]*?>/gi
const EVENT_HANDLER_ATTR_RE = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_PROTOCOL_RE = /\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi
const STYLE_ATTR_RE = /\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi

export const sanitizeHtml = (input: string): string => {
  if (!input) return ''

  let sanitized = input
  sanitized = sanitized.replace(DANGEROUS_TAGS_RE, '')
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_RE, '')
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL_RE, ' $1=$2#$2')
  sanitized = sanitized.replace(STYLE_ATTR_RE, '')

  return sanitized
}
