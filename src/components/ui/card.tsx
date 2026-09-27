import * as React from "react"

import { cn } from "@/lib/utils"

// The shell only. shadcn's card ships a header, title, description, action,
// content and footer alongside it; this theme lays out its cards itself, so all
// six were unused from the moment they were vendored. Restore one from upstream
// if a card ever needs it.
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "surface-card flex flex-col gap-6 bg-card py-6 text-card-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Card }
