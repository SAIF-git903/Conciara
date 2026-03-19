'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback } from 'react'
import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuLink,
  LuList,
  LuListOrdered,
  LuCode,
  LuQuote,
  LuUndo2,
  LuRedo2,
} from 'react-icons/lu'
import { cn } from '@/lib/utils'
import { markdownToHtml, htmlToMarkdown } from '@/lib/qa-editor-markdown'

const editorShellClass =
  'min-h-[120px] px-3 py-2.5 text-sm text-slate-900 focus:outline-none leading-relaxed ' +
  '[&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 ' +
  '[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 ' +
  '[&_strong]:font-semibold [&_em]:italic ' +
  '[&_a]:text-[var(--v2-primary)] [&_a]:underline ' +
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 ' +
  '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] ' +
  '[&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:text-slate-100 ' +
  '[&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold'

type ToolbarButtonProps = {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800',
        isActive && 'bg-slate-200 text-slate-900',
        disabled && 'pointer-events-none opacity-40'
      )}
    >
      {children}
    </button>
  )
}

function QaEditorToolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const setLink = useCallback(() => {
    if (!editor || disabled) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor, disabled])

  if (!editor) return null

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
      <ToolbarButton
        title="Bold"
        disabled={disabled}
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <LuBold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        disabled={disabled}
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <LuItalic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        disabled={disabled}
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <LuUnderline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        disabled={disabled}
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <LuStrikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        disabled={disabled}
        isActive={editor.isActive('link')}
        onClick={setLink}
      >
        <LuLink className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-0.5 w-px self-stretch bg-slate-200" aria-hidden />
      <ToolbarButton
        title="Bullet list"
        disabled={disabled}
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <LuList className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        disabled={disabled}
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <LuListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        disabled={disabled}
        isActive={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <LuCode className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        disabled={disabled}
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <LuQuote className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-0.5 w-px self-stretch bg-slate-200" aria-hidden />
      <ToolbarButton
        title="Undo"
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <LuUndo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <LuRedo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

export type QaAnswerEditorProps = {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /**
   * Pass a new key when the logical document changes (e.g. another Q&A row, or after reset).
   * TipTap remounts so content matches `value` without fragile markdown round-trip sync.
   */
  instanceKey: string
}

export default function QaAnswerEditor({
  value,
  onChange,
  placeholder = 'Write the answer…',
  disabled = false,
  className,
  instanceKey,
}: QaAnswerEditorProps) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Underline,
        TiptapLink.configure({
          openOnClick: false,
          autolink: true,
          protocols: ['http', 'https'],
          defaultProtocol: 'https',
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: markdownToHtml(value),
      editable: !disabled,
      editorProps: {
        attributes: {
          class: editorShellClass,
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (ed.isEmpty) {
          onChange('')
          return
        }
        onChange(htmlToMarkdown(ed.getHTML()))
      },
    },
    [instanceKey]
  )

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  return (
    <div
      className={cn(
        'qa-answer-editor rounded-lg border border-slate-200 bg-white focus-within:border-[var(--v2-primary)] focus-within:ring-1 focus-within:ring-[var(--v2-primary)]',
        disabled && 'pointer-events-none opacity-60',
        className
      )}
    >
      <QaEditorToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} className="rounded-b-lg [&_.ProseMirror]:min-h-[120px]" />
    </div>
  )
}
