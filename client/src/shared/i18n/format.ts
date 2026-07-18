/**
 * Interpolates `{key}` placeholders in a dictionary string, e.g.
 * `format(t.lobby.time.minutesAgo, { n: 5 })` → `"5m ago"`.
 */
export function format(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}
