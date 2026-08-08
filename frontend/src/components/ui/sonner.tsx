"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      richColors
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Nen canh bao rieng cho tung loai toast - dung chung bang mau
          // trang thai cua he thong (globals.css) thay vi mau mac dinh cua
          // sonner, de loi/thanh cong/canh bao deu ro rang va dung theme.
          "--success-bg": "var(--success-subtle)",
          "--success-text": "var(--success-strong)",
          "--success-border": "var(--success)",
          "--warning-bg": "var(--warning-subtle)",
          "--warning-text": "var(--warning-strong)",
          "--warning-border": "var(--warning)",
          "--info-bg": "var(--info-subtle)",
          "--info-text": "var(--info-strong)",
          "--info-border": "var(--info)",
          "--error-bg": "var(--danger-subtle)",
          "--error-text": "var(--danger-strong)",
          "--error-border": "var(--danger)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
