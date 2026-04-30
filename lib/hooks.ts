/**
 * Custom hooks for widgets
 */

import { useState } from "react";

/**
 * Initialize state value from a set of options, defaulting to a fallback.
 * Common pattern in interactive widgets where Claude can pass a default via props.
 *
 * @param defaultValue - The value to try to use (e.g., from Claude props)
 * @param options - Allowed values
 * @param fallback - Default if defaultValue is not in options
 */
export function useInitialValue<T extends readonly string[]>(
  defaultValue: string | undefined,
  options: T,
  fallback: T[0]
): [T[0], (v: T[0]) => void] {
  const initial = (options as readonly string[]).includes(defaultValue ?? "")
    ? (defaultValue as T[0])
    : fallback;
  const [value, setValue] = useState<T[0]>(initial);
  return [value, setValue];
}
