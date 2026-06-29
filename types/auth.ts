export type Rol = "admin" | "miembro";

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  google_calendar_token: string | null;
  activo: boolean;
  created_at: string;
};

export type AuthSession = {
  user: Usuario;
  accessToken: string;
};
