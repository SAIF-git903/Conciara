/**
 * Round-trip between Markdown (API / DB) and HTML (TipTap document).
 */

import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'

const mdIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

/** TipTap expects at least an empty paragraph. */
export function markdownToHtml(markdown: string): string {
  const src = markdown?.trim() ?? ''
  if (!src) return '<p></p>'
  return mdIt.render(src)
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim()
}
