// Tiny className combiner — drop-in replacement for clsx until we add the dep.
// Falsy values are skipped.

export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
