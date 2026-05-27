import { cn } from "@/lib/utils"

type VariantDefinitions = Record<string, Record<string, string>>

type VariantSelection<T extends VariantDefinitions> = {
  [K in keyof T]?: keyof T[K] | null | undefined
} & {
  className?: string
}

type CvaConfig<T extends VariantDefinitions> = {
  variants?: T
  defaultVariants?: Partial<{
    [K in keyof T]: keyof T[K]
  }>
}

export type VariantProps<T> = T extends (props?: infer P) => string
  ? Omit<NonNullable<P>, "className">
  : never

export function cva<T extends VariantDefinitions>(
  base: string,
  config: CvaConfig<T> = {}
) {
  return (props: VariantSelection<T> = {}) => {
    const { className, ...selectedVariants } = props
    const selections = selectedVariants as unknown as Partial<{
      [K in keyof T]: keyof T[K] | null | undefined
    }>

    const variantClasses = Object.entries(config.variants ?? {}).map(
      ([variantName, variantOptions]) => {
        const key = variantName as keyof T
        const selected =
          selections[key] ??
          config.defaultVariants?.[key]

        if (!selected) {
          return undefined
        }

        return variantOptions[selected as string]
      }
    )

    return cn(base, variantClasses, className)
  }
}
