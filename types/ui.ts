import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type BadgeVariant =
  | "default"
  | "signal"
  | "success"
  | "warning"
  | "danger"
  | "ghost";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";
export type SpinnerColor = "signal" | "white" | "graphite";

export type ModalSize = "sm" | "md" | "lg" | "xl";

export type ModalProps<TChildren extends ReactNode = ReactNode> = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: TChildren;
  size?: ModalSize;
  showCloseButton?: boolean;
};
