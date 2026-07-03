import { parse as parseYaml, YAMLParseError } from 'yaml';

export type ParseResult =
  | { ok: true; data: unknown; format: 'yaml' | 'json' }
  | { ok: false; error: string; format: 'yaml' | 'json' | 'unknown' };

export function parseContract(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Input is empty.', format: 'unknown' };
  }

  // Try JSON first (fast path — JSON always starts with { or [)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      return { ok: true, data, format: 'json' };
    } catch (e) {
      return {
        ok: false,
        error: `Invalid JSON: ${(e as SyntaxError).message}`,
        format: 'json',
      };
    }
  }

  // Try YAML
  try {
    const data = parseYaml(trimmed);
    if (data === null || data === undefined) {
      return { ok: false, error: 'YAML parsed to empty document.', format: 'yaml' };
    }
    return { ok: true, data, format: 'yaml' };
  } catch (e) {
    const msg = e instanceof YAMLParseError ? e.message : String(e);
    return { ok: false, error: `Invalid YAML: ${msg}`, format: 'yaml' };
  }
}

/** Best-effort extraction of apiVersion from a parsed contract object. */
export function extractApiVersion(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'apiVersion' in data) {
    const v = (data as Record<string, unknown>).apiVersion;
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}
