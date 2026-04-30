/**
 * Input sanitization for widgets
 * Prevents crashes from invalid data passed by Claude or users
 */

/**
 * Sanitize a numeric value to be within a safe range
 * Used for slider values, amperage, voltage, etc.
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  // Check if value is a valid number
  if (typeof value !== "number" || !Number.isFinite(value)) {
    console.warn(
      `Invalid number value: ${value} (expected finite number between ${min} and ${max})`
    );
    return defaultValue;
  }

  // Clamp to valid range
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize a string value to be one of a set of allowed options
 * Used for process selection, wire types, etc.
 */
export function sanitizeString<T extends readonly string[]>(
  value: unknown,
  options: T,
  defaultValue: T[0]
): T[0] {
  // Check if value is a string and in the allowed set
  if (typeof value !== "string" || !options.includes(value)) {
    console.warn(
      `Invalid string value: "${value}" (expected one of: ${options.join(", ")})`
    );
    return defaultValue;
  }

  return value as T[0];
}

/**
 * Sanitize a tuple range [min, max] to ensure it's valid
 */
export function sanitizeRange(
  value: unknown,
  minBound: number,
  maxBound: number,
  defaultValue: [number, number]
): [number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  ) {
    console.warn(
      `Invalid range value: ${JSON.stringify(value)} (expected [number, number])`
    );
    return defaultValue;
  }

  const [min, max] = value as [number, number];

  // Ensure min < max and both within bounds
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    console.warn(`Invalid range: [${min}, ${max}] (min must be < max)`);
    return defaultValue;
  }

  const clampedMin = Math.max(minBound, min);
  const clampedMax = Math.min(maxBound, max);

  return [clampedMin, clampedMax];
}

/**
 * Widget prop validator interface
 * All widgets should implement this pattern
 */
export interface WidgetPropsValidator {
  validate(props: unknown): boolean;
  getDefaults(): Record<string, any>;
}

/**
 * Create a safe widget props object with fallback defaults
 */
export function safeWidgetProps<T extends Record<string, any>>(
  props: unknown,
  validator: WidgetPropsValidator,
  defaults: T
): T {
  if (typeof props !== "object" || props === null) {
    console.warn("Widget props is not an object, using defaults");
    return defaults;
  }

  if (!validator.validate(props)) {
    console.warn("Widget props validation failed, using defaults");
    return defaults;
  }

  return { ...defaults, ...props };
}
