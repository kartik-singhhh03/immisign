import { toast } from "@/hooks/use-toast"

type ToastVariant = "default" | "destructive"

export function notifySuccess(title: string, description?: string) {
  toast({ title, description })
}

export function notifyError(title: string, description?: string) {
  toast({ title, description, variant: "destructive" as ToastVariant })
}

export function notifyInfo(title: string, description?: string) {
  toast({ title, description })
}
