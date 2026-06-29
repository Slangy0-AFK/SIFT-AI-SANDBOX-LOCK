"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const SelectContext = React.createContext({ 
  isMobile: false, 
  open: false, 
  setOpen: () => {}, 
  value: undefined, 
  onValueChange: () => {},
  items: {},
  registerItem: () => {}
})

const Select = ({ children, onValueChange, value, defaultValue, open: controlledOpen, onOpenChange, ...props }) => {
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;
  const [internalValue, setInternalValue] = React.useState(value || defaultValue);
  const [items, setItems] = React.useState({});

  const handleValueChange = (v) => {
    setInternalValue(v);
    onValueChange?.(v);
    setOpen(false);
  };

  const registerItem = React.useCallback((val, label) => {
    setItems((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  }, []);

  const contextValue = React.useMemo(() => ({
    isMobile,
    open,
    setOpen,
    value: value !== undefined ? value : internalValue,
    onValueChange: handleValueChange,
    items,
    registerItem
  }), [isMobile, open, setOpen, value, internalValue, items, registerItem]);

  if (isMobile) {
    return (
      <SelectContext.Provider value={contextValue}>
        <Drawer open={open} onOpenChange={setOpen}>
          {children}
        </Drawer>
      </SelectContext.Provider>
    )
  }

  return (
    <SelectContext.Provider value={contextValue}>
      <SelectPrimitive.Root open={open} onOpenChange={setOpen} onValueChange={handleValueChange} value={contextValue.value} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  )
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = React.forwardRef(({ className, children, placeholder, ...props }, ref) => {
  const { isMobile, value, items } = React.useContext(SelectContext);
  
  if (isMobile) {
    const displayValue = items[value] || placeholder || children;
    return <span ref={ref} className={cn("truncate", className)} {...props}>{displayValue}</span>
  }
  return <SelectPrimitive.Value ref={ref} className={className} placeholder={placeholder} {...props}>{children}</SelectPrimitive.Value>
})
SelectValue.displayName = "SelectValue"

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isMobile } = React.useContext(SelectContext)
  
  if (isMobile) {
    return (
      <DrawerTrigger asChild>
        <button
          ref={ref}
          className={cn(
            "flex min-h-[44px] w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
          )}
          {...props}>
          {children}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </DrawerTrigger>
    )
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex min-h-[44px] w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const { isMobile } = React.useContext(SelectContext)

  if (isMobile) {
    return (
      <DrawerContent className={cn("mt-4 border bg-popover text-popover-foreground", className)}>
        <div className="mt-4 flex flex-col gap-1 p-4 pb-8">
          {children}
        </div>
      </DrawerContent>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => {
  const { isMobile } = React.useContext(SelectContext)
  if (isMobile) {
    return <div ref={ref} className={cn("px-2 py-2 text-sm font-semibold", className)} {...props} />
  }
  return <SelectPrimitive.Label ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
})
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { isMobile, value: selectedValue, onValueChange, registerItem } = React.useContext(SelectContext)

  React.useEffect(() => {
    if (value !== undefined) {
      registerItem(value, children);
    }
  }, [value, children, registerItem]);

  if (isMobile) {
    const isSelected = selectedValue === value
    return (
      <button
        ref={ref}
        onClick={() => onValueChange(value)}
        className={cn(
          "relative flex min-h-[44px] w-full cursor-pointer select-none items-center rounded-sm py-3 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          isSelected && "bg-accent text-accent-foreground",
          className
        )}
        {...props}>
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        <span>{children}</span>
      </button>
    )
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex min-h-[44px] w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => {
  const { isMobile } = React.useContext(SelectContext)
  if (isMobile) {
    return <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
  }
  return <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
})
SelectSeparator.displayName = "SelectSeparator"

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}