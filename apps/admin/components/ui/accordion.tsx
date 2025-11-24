"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  children: React.ReactNode;
  type?: "single" | "multiple";
  defaultValue?: string;
  className?: string;
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

const AccordionContext = React.createContext<{
  openItems: Set<string>;
  toggleItem: (value: string) => void;
  type: "single" | "multiple";
}>({
  openItems: new Set(),
  toggleItem: () => {},
  type: "single",
});

const AccordionItemContext = React.createContext<{ value: string } | null>(null);

const Accordion = ({ children, type = "single", defaultValue, className }: AccordionProps) => {
  const [openItems, setOpenItems] = React.useState<Set<string>>(
    defaultValue ? new Set([defaultValue]) : new Set()
  );

  const toggleItem = React.useCallback((value: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (type === "single") {
        next.clear();
        if (!prev.has(value)) {
          next.add(value);
        }
      } else {
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
      }
      return next;
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn("w-full", className)}>{children}</div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = ({ value, children, className }: AccordionItemProps) => {
  const { openItems } = React.useContext(AccordionContext);
  const isOpen = openItems.has(value);

  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={cn("border-b", className)} data-state={isOpen ? "open" : "closed"}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
};

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ children, className, onClick, ...props }, ref) => {
  const { toggleItem, openItems } = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);
  const isOpen = itemContext ? openItems.has(itemContext.value) : false;

  const handleClick = () => {
    if (itemContext?.value) {
      toggleItem(itemContext.value);
    }
    onClick?.();
  };

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      onClick={handleClick}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ children, className, ...props }, ref) => {
  const { openItems } = React.useContext(AccordionContext);
  const itemContext = React.useContext(AccordionItemContext);
  const isOpen = itemContext ? openItems.has(itemContext.value) : false;

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all duration-300 ease-in-out",
        isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      <div className={cn("pb-4 pt-0")}>{children}</div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

