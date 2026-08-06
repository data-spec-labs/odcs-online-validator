export type YamlRepairResult = {
  text: string;
  changed: boolean;
};

function leadingSpaces(line: string): number {
  const m = line.match(/^( *)/);
  return m ? m[1].length : 0;
}

function setLeadingSpaces(line: string, spaces: number): string {
  return ' '.repeat(spaces) + line.trimStart();
}

/** Bare key or `key:` with empty/whitespace-only value — opens a nested block. */
function isBlockKeyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) return false;
  // key: or key:   (no value) — not key: value
  return /^[^#:\s][^#:\n]*:\s*(?:#.*)?$/.test(trimmed);
}

/**
 * Safe, deterministic YAML whitespace repairs only.
 * Does not invent nesting, rewrite values, or claim ODCS schema compliance.
 */
export function repairYamlWhitespace(input: string): YamlRepairResult {
  // 1. Normalize newlines
  let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Convert leading tabs to 2 spaces; strip trailing whitespace
  let lines = text.split('\n').map((line) => {
    let i = 0;
    let spaces = '';
    while (i < line.length) {
      const ch = line[i];
      if (ch === ' ') {
        spaces += ' ';
        i++;
      } else if (ch === '\t') {
        spaces += '  ';
        i++;
      } else {
        break;
      }
    }
    const rest = line.slice(i).replace(/[ \t]+$/g, '');
    return spaces + rest;
  });

  // 3. Snap odd indents down onto a 2-space grid (3→2, 5→4, 1→0)
  lines = lines.map((line) => {
    if (!line.trim()) return line;
    const n = leadingSpaces(line);
    const snapped = Math.floor(n / 2) * 2;
    return snapped === n ? line : setLeadingSpaces(line, snapped);
  });

  // 4. Align mapping siblings under block keys to the first child's column.
  //    Fixes "All mapping items must start at the same column" (e.g. 3 vs 2 spaces).
  lines = alignMappingSiblings(lines);

  // 5. If every positive indent is a multiple of 4, rescale to 2-space indent
  const indentWidths = lines
    .map((line) => {
      if (!line.trim()) return null;
      const n = leadingSpaces(line);
      return n > 0 ? n : null;
    })
    .filter((n): n is number => n !== null);

  const canRescale4to2 =
    indentWidths.length > 0 &&
    indentWidths.every((n) => n % 4 === 0) &&
    indentWidths.some((n) => n >= 4);

  if (canRescale4to2) {
    lines = lines.map((line) => {
      if (!line.trim()) return line;
      const spaces = leadingSpaces(line);
      if (spaces % 4 !== 0) return line;
      return setLeadingSpaces(line, (spaces / 4) * 2);
    });
  }

  text = lines.join('\n');
  return { text, changed: text !== input };
}

function alignMappingSiblings(lines: string[]): string[] {
  const out = [...lines];

  for (let i = 0; i < out.length; i++) {
    if (!isBlockKeyLine(out[i])) continue;

    const parentIndent = leadingSpaces(out[i]);
    const childIdx: number[] = [];

    for (let j = i + 1; j < out.length; j++) {
      if (!out[j].trim()) continue;
      const ind = leadingSpaces(out[j]);
      if (ind <= parentIndent) break;
      childIdx.push(j);
    }

    if (childIdx.length < 2) continue;

    // First non-empty child's indent is the canonical sibling column
    const siblingIndent = leadingSpaces(out[childIdx[0]]);

    for (const idx of childIdx) {
      const ind = leadingSpaces(out[idx]);
      // Near the sibling column, or between parent and sibling → align
      if (ind < siblingIndent || ind <= siblingIndent + 1) {
        if (ind !== siblingIndent) {
          out[idx] = setLeadingSpaces(out[idx], siblingIndent);
        }
      }
      // Deeper lines (nested under a previous sibling) left alone
    }
  }

  return out;
}
