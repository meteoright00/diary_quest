import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="dark"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-midnight-900 group-[.toaster]:text-slate-200 group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-md",
                    description: "group-[.toast]:text-slate-400",
                    actionButton:
                        "group-[.toast]:bg-magic-cyan group-[.toast]:text-midnight-900 group-[.toast]:font-bold",
                    cancelButton:
                        "group-[.toast]:bg-white/10 group-[.toast]:text-slate-300",
                    error: "group-[.toaster]:border-red-500/30 group-[.toaster]:bg-red-950/20",
                    success: "group-[.toaster]:border-green-500/30 group-[.toaster]:bg-green-950/20",
                    warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-950/20",
                    info: "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-950/20",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
