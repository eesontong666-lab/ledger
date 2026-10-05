"use client";

import { useRef, useState, type ChangeEvent } from "react";

function formatMoney(raw: string): string {
  let cleaned = raw.replace(/[^\d.]/g, "");

  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  const [intRaw, decRaw] = cleaned.split(".");
  const intPart = (intRaw ?? "").replace(/^0+(?=\d)/, "");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decRaw !== undefined) {
    return `${withCommas}.${decRaw.slice(0, 2)}`;
  }
  return cleaned.endsWith(".") ? `${withCommas}.` : withCommas;
}

function countDigitsBefore(value: string, cursor: number): number {
  return value.slice(0, cursor).replace(/[^\d]/g, "").length;
}

function cursorForDigitCount(value: string, digitCount: number): number {
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i])) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return value.length;
}

export function MoneyInput({
  name,
  defaultValue,
  placeholder,
  required,
  className = "",
}: {
  name: string;
  defaultValue?: number | string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(() =>
    defaultValue !== undefined && defaultValue !== "" ? formatMoney(String(defaultValue)) : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const cursor = el.selectionStart ?? el.value.length;
    const digitCount = countDigitsBefore(el.value, cursor);
    const formatted = formatMoney(el.value);
    setValue(formatted);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const pos = cursorForDigitCount(formatted, digitCount);
      inputRef.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      name={name}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
