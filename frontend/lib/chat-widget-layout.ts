/**
 * Shared layout dimensions and default theme for Chat Widget (settings) and Playground
 * so both screens use the same widths and default colors (hex so they render in the widget).
 */

/** Left column width (form / agent info) on large screens */
export const CHAT_WIDGET_LEFT_WIDTH = 400

/** Preview column: min/max width of the chat window container */
export const CHAT_WIDGET_PREVIEW_MIN_WIDTH = 280
export const CHAT_WIDGET_PREVIEW_MAX_WIDTH = 400

/** Default window dimensions for skin config */
export const DEFAULT_WINDOW = {
  width: 384,
  height: 600,
  minWidth: 320,
  minHeight: 400,
  borderRadius: 20,
} as const

/** Default theme colors (hex) so they work in Playground and embed without needing a saved config */
export const DEFAULT_THEME = {
  primaryColor: '#348369',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  borderColor: '#e5e7eb',
} as const
