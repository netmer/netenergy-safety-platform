
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsRight, type LucideIcon, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type TSidebarContext = {
  isCollapsed: boolean
}

const SidebarContext = React.createContext<TSidebarContext | undefined>(
  undefined
)

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

type TSidebarProvider = {
  children: React.ReactNode
  isCollapsed?: boolean
}

const SidebarProvider = ({
  children,
  isCollapsed = false,
}: TSidebarProvider) => {
  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

const sidebarVariants = cva(
  "h-screen shrink-0 transition-[width] duration-300 ease-in-out flex flex-col border-r bg-card",
  {
    variants: {
      isCollapsed: {
        true: "w-[70px]",
        false: "w-64",
      },
    },
  }
)

type TSidebar = React.HTMLAttributes<HTMLDivElement> &
  Partial<VariantProps<typeof sidebarVariants>>

const Sidebar = React.forwardRef<HTMLDivElement, TSidebar>(
  ({ className, children, ...props }, ref) => {
    const { isCollapsed } = useSidebar()
    return (
      <aside
        ref={ref}
        data-collapsed={isCollapsed}
        className={cn(
          "group/sidebar fixed top-0 left-0 z-40",
          sidebarVariants({ isCollapsed }),
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"


const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-grow overflow-y-auto overflow-x-hidden pt-4 custom-scrollbar",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("border-t p-3 mt-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, children, ...props }, ref) => {
  return (
    <ul ref={ref} className={cn("space-y-1.5 p-3", className)} {...props}>
      {children}
    </ul>
  )
})
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, children, ...props }, ref) => {
  return (
    <li ref={ref} className={cn("", className)} {...props}>
      {children}
    </li>
  )
})
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "flex h-10 w-full items-center justify-start gap-3 rounded-xl text-sm font-medium transition-all duration-200",
  {
    variants: {
      isActive: {
        true: "bg-primary text-primary-foreground shadow-md shadow-primary/20",
        false:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  }
)

type TSidebarMenuButton = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    Icon?: LucideIcon
    isSubmenu?: boolean
    asChild?: boolean
  }

const SidebarMenuButton = React.forwardRef<
  HTMLDivElement,
  TSidebarMenuButton
>(
  (
    {
      className,
      isActive,
      children,
      asChild,
      isSubmenu,
      Icon,
      ...props
    },
    ref) => {
    const { isCollapsed } = useSidebar()
    const content = (
      <>
        {Icon && (
          <div className="flex size-5 items-center justify-center">
            <Icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
          </div>
        )}
        <span
          className={cn(
            "max-w-40 truncate transition-all",
            isCollapsed && "hidden",
            isSubmenu && "pl-5"
          )}
        >
          {children}
        </span>
      </>
    )

    return (
      <div
        ref={ref}
        className={cn(
          "cursor-pointer",
          sidebarMenuButtonVariants({ isActive }),
          isCollapsed ? "justify-center px-0 mx-auto w-10" : "px-3",
          className
        )}
        {...props}
      >
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger className="flex h-full w-full items-center justify-center">
                {content}
              </TooltipTrigger>
              <TooltipContent
                side="right"
                align="center"
                className="bg-slate-900 text-white border-none rounded-lg"
              >
                {children}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          content
        )}
      </div>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarSubmenu = React.forwardRef<
  HTMLDivElement,
  TSidebarMenuButton & {
    title: string
  }
>(({ className, children, title, Icon, ...props }, ref) => {
  const { isCollapsed } = useSidebar()
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible
      ref={ref}
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
      {...props}
    >
      <CollapsibleTrigger className="w-full">
        <SidebarMenuButton Icon={Icon} isActive={props.isActive}>
          {title}
          {!isCollapsed && (
            <ChevronRight
              className={cn(
                "ml-auto h-4 w-4 transition-transform",
                isOpen && "rotate-90"
              )}
            />
          )}
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
})
SidebarSubmenu.displayName = "SidebarSubmenu"

const SidebarToggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(
        "size-9 text-muted-foreground transition-transform duration-300 ease-in-out hover:bg-accent hover:text-accent-foreground group-data-[collapsed=true]/sidebar:-rotate-180",
        className
      )}
      {...props}
    >
      <ChevronsRight className="h-5 w-5" />
    </Button>
  )
})
SidebarToggle.displayName = "SidebarToggle"

const SidebarHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("flex h-14 items-center border-b px-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

const SidebarGroup = ({
  className,
  label,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string }) => {
  const { isCollapsed } = useSidebar()
  return (
    <div className={cn("px-3 py-2", className)} {...props}>
      {label && !isCollapsed && (
        <h4 className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
          {label}
        </h4>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
}


export {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarToggle,
  SidebarSubmenu,
  SidebarGroup
}
