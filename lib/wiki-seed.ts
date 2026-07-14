import type { Json } from "@/types/supabase";

export type TipTapTextSegment = {
  text: string;
  bold?: boolean;
};

export function tiptapText(segment: string | TipTapTextSegment): Json {
  if (typeof segment === "string") {
    return { type: "text", text: segment } as Json;
  }

  const node: Record<string, unknown> = {
    type: "text",
    text: segment.text
  };

  if (segment.bold) {
    node.marks = [{ type: "bold" }];
  }

  return node as Json;
}

export function tiptapParagraph(segments: Array<string | TipTapTextSegment>): Json {
  return {
    type: "paragraph",
    content: segments.map((segment) => tiptapText(segment))
  } as Json;
}

export function tiptapHeading(text: string, level = 2): Json {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }]
  } as Json;
}

export function tiptapBulletList(items: Array<Array<string | TipTapTextSegment>>): Json {
  return {
    type: "bulletList",
    content: items.map((segments) => ({
      type: "listItem",
      content: [tiptapParagraph(segments)]
    }))
  } as Json;
}

export function tiptapCodeBlock(lines: string[]): Json {
  return {
    type: "codeBlock",
    content: [
      {
        type: "text",
        text: lines.join("\n")
      }
    ]
  } as Json;
}

export function tiptapDoc(content: Json[]): Json {
  return {
    type: "doc",
    content
  } as Json;
}
