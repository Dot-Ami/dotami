"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * "Look closer" (the calm first view, 2026-10-17, S2.5.30c): one menu button in the goal bar for the things
 * the goal bar can open in the right-hand panel, where each used to be a button of its own. Today *Compare
 * the two endings* (only on a road with a fork whose own pick moves steps) and *Others in this line of work*;
 * *About this job* joins it later (docs/architecture/research-kit.md § 4.2).
 *
 * The WAI-ARIA menu button pattern: the button says it has a menu and whether it is open; Enter, Space or
 * the down arrow opens it on its first item, the up arrow on its last; inside, the arrows, Home and End move
 * between the items, Enter or Space picks one, Escape closes it and puts focus back on the button, and Tab
 * or a click anywhere else closes it. Closed, the items aren't drawn, so the goal bar shows one control.
 */

export interface LookCloserItem {
  id: string;
  label: string;
  onSelect: () => void;
}

export function LookCloserMenu({ items }: { items: readonly LookCloserItem[] }) {
  const buttonId = useId();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  // Which item takes focus when the menu opens: the first, or the last (the up arrow).
  const [focusOnOpen, setFocusOnOpen] = useState<"first" | "last">("first");
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const itemEls = useRef<(HTMLButtonElement | null)[]>([]);

  // Opening puts focus on an item, as the pattern expects.
  useEffect(() => {
    if (!open) return;
    const list = itemEls.current.filter((el): el is HTMLButtonElement => el !== null);
    (focusOnOpen === "last" ? list[list.length - 1] : list[0])?.focus();
  }, [open, focusOnOpen]);

  // A press anywhere outside the button and the menu closes it.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menu.current?.contains(target) || button.current?.contains(target))) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  if (items.length === 0) return null;

  function openAt(where: "first" | "last") {
    setFocusOnOpen(where);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function onButtonKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAt("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt("last");
    }
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const list = itemEls.current.filter((el): el is HTMLButtonElement => el !== null);
    const at = list.findIndex((el) => el === document.activeElement);
    const move = (to: number) => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(list.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      // Focus moves on as Tab moves it; the menu just closes behind it.
      setOpen(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={button}
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openAt("first"))}
        onKeyDown={onButtonKey}
        className="inline-flex items-center gap-1 rounded-full border border-rule px-2 py-0 text-[11px] text-paper-dim hover:bg-ink max-md:min-h-8"
      >
        {words.goal.lookCloser}
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          onKeyDown={onMenuKey}
          className="absolute left-0 top-full z-50 mt-1 grid min-w-[240px] gap-0.5 rounded-md border border-rule bg-ink p-1 shadow-2xl"
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemEls.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              className="rounded-sm px-2.5 py-1.5 text-left text-[12px] text-paper-dim hover:bg-ink2 hover:text-paper focus:bg-ink2 focus:text-paper focus:outline-hidden max-md:min-h-8"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
