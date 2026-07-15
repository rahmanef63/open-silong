"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Roots = {
  leftEl: HTMLElement | null;
  rightEl: HTMLElement | null;
  setLeftEl: (el: HTMLElement | null) => void;
  setRightEl: (el: HTMLElement | null) => void;
};

const Ctx = createContext<Roots | null>(null);

export function PageHeaderSlotProvider({ children }: { children: ReactNode }) {
  const [leftEl, setLeftEl] = useState<HTMLElement | null>(null);
  const [rightEl, setRightEl] = useState<HTMLElement | null>(null);
  return (
    <Ctx.Provider value={{ leftEl, rightEl, setLeftEl, setRightEl }}>
      {children}
    </Ctx.Provider>
  );
}

export function PageHeaderLeftAnchor(props: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(Ctx);
  return <div ref={(el) => ctx?.setLeftEl(el)} {...props} />;
}

export function PageHeaderRightAnchor(props: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(Ctx);
  return <div ref={(el) => ctx?.setRightEl(el)} {...props} />;
}

/** Use either or both `left`/`right` to portal content into the shell topbar. */
export function PageHeaderSlot({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  const ctx = useContext(Ctx);
  return (
    <>
      {left && ctx?.leftEl ? createPortal(left, ctx.leftEl) : null}
      {right && ctx?.rightEl ? createPortal(right, ctx.rightEl) : null}
    </>
  );
}
