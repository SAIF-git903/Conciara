'use client'

import { CHAT_WIDGET_PREVIEW_MIN_WIDTH, CHAT_WIDGET_PREVIEW_MAX_WIDTH } from '@/lib/chat-widget-layout'

/**
 * Skeleton placeholder for the chat widget preview (Playground and Chat widget Live Preview).
 * Full-box pulsing skeleton that fills the preview area.
 */
export default function ChatWidgetPreviewSkeleton() {
  return (
    <div
      className="flex flex-1 min-h-0 w-full flex-col overflow-visible m-auto"
      style={{
        minWidth: CHAT_WIDGET_PREVIEW_MIN_WIDTH,
        maxWidth: CHAT_WIDGET_PREVIEW_MAX_WIDTH,
        borderRadius: 20,
      }}
    >
      <div
        className="flex-1 min-h-0 w-full rounded-2xl shadow-lg bg-slate-200 animate-pulse"
        style={{ borderRadius: 20 }}
      />
    </div>
  )
}
