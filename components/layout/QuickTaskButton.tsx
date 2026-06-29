"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useTareas } from "@/lib/hooks/useTareas";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { Usuario } from "@/types/auth";
import { TareaModal } from "@/components/tareas/TareaModal";

type QuickTaskButtonProps = {
  usuario: Usuario | null;
  proyectos: TaskProjectOption[];
  usuarios: TaskUserOption[];
};

export function QuickTaskButton({ usuario, proyectos, usuarios }: QuickTaskButtonProps) {
  const { createTarea } = useTareas();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 rounded-full shadow-modal"
      >
        + Tarea rápida
      </Button>

      <TareaModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        proyectos={proyectos}
        usuarios={usuarios}
        defaultResponsableId={usuario?.id ?? undefined}
        onSave={async (input) => {
          await createTarea({
            ...input,
            responsable_id: input.responsable_id ?? usuario?.id ?? undefined
          });
        }}
      />
    </>
  );
}
