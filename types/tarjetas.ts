export type TipoTarjeta = "debito" | "credito" | "prepaga";

export type Tarjeta = {
  id: string;
  alias: string;
  banco: string | null;
  titular: string | null;
  ultimos_4: string;
  vencimiento: string | null;
  tipo: TipoTarjeta;
  uso_habitual: string | null;
  notas: string | null;
  created_at: string;
};

export type CreateTarjetaInput = {
  alias: string;
  banco?: string | null;
  titular?: string | null;
  ultimos_4: string;
  vencimiento?: string | null;
  tipo: TipoTarjeta;
  uso_habitual?: string | null;
  notas?: string | null;
};

export type UpdateTarjetaInput = Partial<CreateTarjetaInput>;
