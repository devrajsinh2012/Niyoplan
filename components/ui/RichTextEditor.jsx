'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ToolbarButton = ({ onClick, isActive, disabled, children, title }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    disabled={disabled}
    title={title}
    className={twMerge(
      "p-1.5 rounded-md transition-colors hover:bg-[var(--bg-panel-hover)] flex items-center justify-center min-w-[32px] min-h-[32px]",
      isActive ? "bg-[var(--accent-subtle)] text-[var(--accent-primary)] shadow-sm" : "text-[var(--text-secondary)]",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const RichTextEditor = ({ value, onChange, placeholder, className }) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: twMerge(
          "prose prose-sm max-w-none focus:outline-none min-h-[150px] overflow-y-auto px-4 py-3 text-[var(--text-primary)]",
          // Force visibility of markers regardless of theme detection
          "marker:text-[var(--text-primary)]",
          "prose-ul:list-disc prose-ol:list-decimal",
          "prose-blockquote:border-l-4 prose-blockquote:border-[var(--border-strong)] prose-blockquote:pl-4 prose-blockquote:italic",
          // Dark mode support
          "[data-theme=dark]_&:prose-invert",
          className
        ),
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full flex flex-col border-2 border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] overflow-hidden focus-within:border-[#0052CC] transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[var(--bg-panel)] border-b border-[var(--border-subtle)]/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough (Ctrl+Shift+X)"
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <div className="w-[1px] h-4 bg-[var(--border-subtle)] mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code (Ctrl+E)"
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List (Ctrl+Shift+8)"
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List (Ctrl+Shift+7)"
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote (Ctrl+Shift+9)"
        >
          <Quote size={16} />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
