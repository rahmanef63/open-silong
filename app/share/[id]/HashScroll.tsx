"use client";
import { useEffect } from "react";

export function HashScroll() {
  useEffect(() => {
    const scroll = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-brand", "rounded-md");
      window.setTimeout(() => el.classList.remove("ring-2", "ring-brand", "rounded-md"), 1600);
    };
    if (window.location.hash) window.setTimeout(scroll, 60);
    window.addEventListener("hashchange", scroll);
    return () => window.removeEventListener("hashchange", scroll);
  }, []);
  return null;
}
