"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import type { Json } from "@/types/supabase";
import { ListIcon, TareasIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createEmptyTipTapContent } from "@/lib/notas";

type RichTextEditorProps = {
  content: Json | null | undefined;
  onChange: (content: Json) => void;
  placeholder?: string;
  className?: string;
  imageUploadUrl?: string | null;
};

function BoldIcon() {
  return <span className="text-sm font-title">B</span>;
}

function ItalicIcon() {
  return <span className="text-sm italic">I</span>;
}

function HeadingIcon() {
  return <span className="text-sm font-title">H2</span>;
}

function ToolbarButton({
  active,
  onClick,
  title,
  children
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-component transition-colors duration-fast ease-fast",
        active ? "bg-signal-light text-signal" : "text-graphite hover:bg-paper hover:text-carbon"
      )}
    >
      {children}
    </button>
  );
}

async function uploadNoteImage(file: File, uploadUrl: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData
  });

  const payload = (await response.json()) as { data?: { url?: string }; error?: string };

  if (!response.ok || !payload.data?.url) {
    throw new Error(payload.error ?? "No se pudo subir la imagen.");
  }

  return payload.data.url;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Empezá a escribir...",
  className,
  imageUploadUrl
}: RichTextEditorProps) {
  const serializedContent = useMemo(
    () => JSON.stringify(content ?? createEmptyTipTapContent()),
    [content]
  );
  const lastSerializedRef = useRef<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2]
        }
      }),
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "my-4 max-w-full rounded-card shadow-soft"
        }
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content: (content ?? createEmptyTipTapContent()) as never,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none break-words focus:outline-none [&_.ProseMirror]:outline-none"
      },
      handlePaste: (_view, event) => {
        if (!imageUploadUrl) {
          return false;
        }

        const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (files.length === 0) {
          return false;
        }

        event.preventDefault();
        void handleImageFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        if (!imageUploadUrl) {
          return false;
        }

        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (files.length === 0) {
          return false;
        }

        event.preventDefault();
        void handleImageFiles(files);
        return true;
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      const nextContent = currentEditor.getJSON();
      lastSerializedRef.current = JSON.stringify(nextContent);
      onChange(nextContent);
    }
  });

  const handleImageFiles = useCallback(
    async (files: File[]) => {
      if (!imageUploadUrl || files.length === 0) {
        return;
      }

      setUploadingImages((current) => current + files.length);

      try {
        for (const file of files) {
          const url = await uploadNoteImage(file, imageUploadUrl);
          editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
        }
      } finally {
        setUploadingImages((current) => Math.max(0, current - files.length));
      }
    },
    [editor, imageUploadUrl]
  );

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (lastSerializedRef.current === serializedContent) {
      return;
    }

    lastSerializedRef.current = serializedContent;
    editor.commands.setContent((content ?? createEmptyTipTapContent()) as never, {
      emitUpdate: false
    });
  }, [content, editor, serializedContent]);

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {uploadingImages > 0 ? (
        <div className="pointer-events-none absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-pill bg-white/90 px-3 py-1 text-xs font-label text-graphite shadow-modal">
          <span className="h-3 w-3 animate-spinner rounded-full border-2 border-signal border-t-transparent" />
          Subiendo imagen...
        </div>
      ) : null}

      <div className="flex-shrink-0 border-b border-line-soft py-3">
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton
            title="Negrita"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton
            title="Cursiva"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton
            title="Lista"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <ListIcon />
          </ToolbarButton>
          <ToolbarButton
            title="Checklist"
            active={editor?.isActive("taskList")}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <TareasIcon />
          </ToolbarButton>
          <ToolbarButton
            title="Título"
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <HeadingIcon />
          </ToolbarButton>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-4",
          "[&_.ProseMirror]:min-h-[360px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:break-words",
          "[&_.ProseMirror_p]:mb-3 [&_.ProseMirror_p]:text-sm [&_.ProseMirror_p]:leading-7 [&_.ProseMirror_p]:text-carbon [&_.ProseMirror_p]:break-words",
          "[&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:font-title [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:text-carbon",
          "[&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc",
          "[&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal",
          "[&_.ProseMirror_li]:mb-1 [&_.ProseMirror_li]:break-words",
          "[&_.ProseMirror_task-list]:my-3 [&_.ProseMirror_task-list]:space-y-2 [&_.ProseMirror_task-list]:pl-0",
          "[&_.ProseMirror_li[data-type='taskItem']]:flex [&_.ProseMirror_li[data-type='taskItem']]:items-start [&_.ProseMirror_li[data-type='taskItem']]:gap-2",
          "[&_.ProseMirror_li[data-type='taskItem']_input]:mt-1 [&_.ProseMirror_li[data-type='taskItem']_input]:accent-signal",
          "[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-card [&_img]:shadow-soft"
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
