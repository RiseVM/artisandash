import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Password input with an eye-icon toggle to reveal/mask the typed value.
 *
 * A security note on why this component does not (and cannot) display a
 * *stored* password: user passwords are stored as bcrypt hashes, which are
 * one-way by design. This toggle only reveals what the user is typing right
 * now — to reset a forgotten password, set a new one via the admin flow.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})
PasswordInput.displayName = "PasswordInput"
