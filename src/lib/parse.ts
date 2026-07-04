import { parse as parseYaml, stringify as stringifyYaml, YAMLParseError } from 'yaml';

export type ParseResult =
  | { ok: true; data: unknown; format: 'yaml' | 'json' }
  | { ok: false; error: string; format: 'yaml' | 'json' | 'unknown' };

export type ContractFormat = 'yaml' | 'json' | 'unknown';

/** Detect likely input format before parsing (for editor language mode). */
export function detectFormat(input: string): ContractFormat {
  const trimmed = input.trim();
  if (!trimmed) return 'unknown';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'yaml';
}

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

/** Pretty-print parsed contract data, preserving key insertion order. */
export function prettyContract(data: unknown, format: 'yaml' | 'json'): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return stringifyYaml(data, {
    indent: 2,
    lineWidth: 0,
  });
}

/** True when input should be reformatted (minified or missing indentation). */
export function needsPrettyPrint(
  text: string,
  data: unknown,
  format: 'yaml' | 'json',
): boolean {
  const trimmed = text.trimEnd();

  if (format === 'json') {
    return prettyContract(data, 'json') !== trimmed;
  }

  // Single-line YAML is treated as minified.
  if (!trimmed.includes('\n')) return true;

  const pretty = prettyContract(data, 'yaml');
  if (pretty === trimmed) return false;

  // Multi-line YAML with nested indentation is already readable — leave as-is.
  const hasNestedIndent = trimmed.split('\n').some((line) => /^  \S/.test(line) || /^  - /.test(line));
  return !hasNestedIndent;
}
