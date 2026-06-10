"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const immimateFieldClass =
  "immimate-field h-11 w-full px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/15 disabled:cursor-not-allowed"

export const ImmiMateInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input ref={ref} className={cn(immimateFieldClass, className)} {...props} />
))
ImmiMateInput.displayName = "ImmiMateInput"

export const ImmiMateTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn(
      "immimate-field min-h-[120px] w-full px-3 py-2.5 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/15 disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  />
))
ImmiMateTextarea.displayName = "ImmiMateTextarea"

export const ImmiMateDatePicker = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => (
  <ImmiMateInput ref={ref} type="date" className={className} {...props} />
))
ImmiMateDatePicker.displayName = "ImmiMateDatePicker"

export function ImmiMateSelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof SelectTrigger>) {
  return <SelectTrigger className={cn(immimateFieldClass, className)} {...props} />
}

export function ImmiMateFieldSelect({
  value,
  onValueChange,
  placeholder,
  options,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <ImmiMateSelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </ImmiMateSelectTrigger>
      <SelectContent className="immimate-scroll">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export {
  Select as ImmiMateSelect,
  SelectContent as ImmiMateSelectContent,
  SelectItem as ImmiMateSelectItem,
  SelectValue as ImmiMateSelectValue,
}
