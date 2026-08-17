"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getPiezaImageUrl } from "@/components/contenido/PiezaCard";
import type { PiezaContenido, WorkspaceContenido } from "@/types/contenido";

const EMPTY_WORKSPACE: WorkspaceContenido = { strokes: [], texts: [] };

function pointsToPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

type Props = { pieza: PiezaContenido | null; isOpen: boolean; onClose: () => void; onSave: (data: WorkspaceContenido) => Promise<void> };

export function PiezaWorkspaceModal({ pieza, isOpen, onClose, onSave }: Props) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceContenido>(EMPTY_WORKSPACE);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setWorkspace(pieza?.workspace_data ?? EMPTY_WORKSPACE);
  }, [isOpen, pieza]);

  function pointFromEvent(event: PointerEvent) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((event.clientX - rect.left) / rect.width) * 1000, y: ((event.clientY - rect.top) / rect.height) * 1000 };
  }

  function startDrawing(event: PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing(true);
    setWorkspace((current) => ({ ...current, strokes: [...current.strokes, { points: [pointFromEvent(event)], color: "#ef5b4d", width: 7 }] }));
  }

  function draw(event: PointerEvent) {
    if (!drawing) return;
    const point = pointFromEvent(event);
    setWorkspace((current) => ({ ...current, strokes: current.strokes.map((stroke, index) => index === current.strokes.length - 1 ? { ...stroke, points: [...stroke.points, point] } : stroke) }));
  }

  function addText() {
    const text = window.prompt("Texto de la corrección");
    if (!text?.trim()) return;
    setWorkspace((current) => ({ ...current, texts: [...current.texts, { x: 80, y: 100 + current.texts.length * 60, text: text.trim(), color: "#ef5b4d" }] }));
  }

  async function save() {
    setSaving(true);
    try { await onSave(workspace); onClose(); } finally { setSaving(false); }
  }

  const imageUrl = pieza ? getPiezaImageUrl(pieza) : null;
  return <Modal isOpen={isOpen && Boolean(pieza)} onClose={onClose} title="Workspace" size="xl">
    {!pieza ? null : <div className="space-y-4">
      <p className="text-sm text-graphite">Dibujá sobre el creativo o agregá textos para dejarle correcciones a Luli.</p>
      <div ref={surfaceRef} className="relative mx-auto max-h-[65vh] max-w-3xl overflow-hidden rounded-md border border-line bg-slate-950" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)}>
        {imageUrl ? <img src={imageUrl} alt={pieza.titulo} className="block max-h-[65vh] w-full object-contain" /> : <div className="flex aspect-video items-center justify-center text-sm text-white/70">Subí un creativo para usar el Workspace.</div>}
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {workspace.strokes.map((stroke, index) => <path key={`stroke-${index}`} d={pointsToPath(stroke.points)} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.width} />)}
          {workspace.texts.map((item, index) => <text key={`text-${index}`} x={item.x} y={item.y} fill={item.color} fontSize="32" fontWeight="700" stroke="white" strokeWidth="5" paintOrder="stroke">{item.text}</text>)}
        </svg>
      </div>
      <div className="flex flex-wrap justify-between gap-2"><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={addText}>+ Agregar texto</Button><Button variant="ghost" size="sm" onClick={() => setWorkspace(EMPTY_WORKSPACE)}>Limpiar anotaciones</Button></div><Button loading={saving} onClick={() => void save()}>Guardar correcciones</Button></div>
    </div>}
  </Modal>;
}
