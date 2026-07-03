import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import schemaV310 from '../schemas/v3.1.0.json';
import schemaV302 from '../schemas/v3.0.2.json';
import schemaV300 from '../schemas/v3.0.0.json';
import schemaV222 from '../schemas/v2.2.2.json';

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  resolvedVersion: string;
  versionWarning?: string;
}

// Map apiVersion strings to their bundled schema.
// For versions not in the map we fall back to the closest known schema.
const SCHEMA_MAP: Record<string, unknown> = {
  'v3.1.0': schemaV310,
  'v3.0.2': schemaV302,
  'v3.0.1': schemaV302,   // closest available
  'v3.0.0': schemaV300,
  'v2.2.2': schemaV222,
  'v2.2.1': schemaV222,
  'v2.2.0': schemaV222,
};

const LATEST_VERSION = 'v3.1.0';

function resolveSchema(apiVersion: string | undefined): {
  schema: unknown;
  resolvedVersion: string;
  warning?: string;
} {
  if (!apiVersion) {
    return {
      schema: SCHEMA_MAP[LATEST_VERSION],
      resolvedVersion: LATEST_VERSION,
      warning: `No apiVersion found — validating against latest (${LATEST_VERSION}).`,
    };
  }
  if (apiVersion in SCHEMA_MAP) {
    return { schema: SCHEMA_MAP[apiVersion], resolvedVersion: apiVersion };
  }
  // Unknown version — use latest with warning
  return {
    schema: SCHEMA_MAP[LATEST_VERSION],
    resolvedVersion: LATEST_VERSION,
    warning: `Unknown apiVersion "${apiVersion}" — validating against latest (${LATEST_VERSION}).`,
  };
}

// Build one AJV instance per schema (cached via module-level map).
const ajvCache = new Map<string, { validate: ReturnType<Ajv['compile']> }>();

function getValidator(version: string, schema: unknown) {
  if (ajvCache.has(version)) return ajvCache.get(version)!;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema as object);
  const entry = { validate };
  ajvCache.set(version, entry);
  return entry;
}

/** Convert AJV instancePath (/schema/0/name) to a human-readable form (schema[0].name). */
function prettifyPath(instancePath: string): string {
  if (!instancePath) return '(root)';
  return instancePath
    .replace(/^\//, '')
    .replace(/\/(\d+)/g, '[$1]')
    .replace(/\//g, '.');
}

export function validateContract(data: unknown, apiVersion: string | undefined): ValidationResult {
  const { schema, resolvedVersion, warning } = resolveSchema(apiVersion);
  const { validate } = getValidator(resolvedVersion, schema);

  const valid = validate(data) as boolean;

  const errors: ValidationError[] = valid
    ? []
    : (validate.errors ?? []).map((e) => ({
        path: prettifyPath(e.instancePath),
        message: e.message ?? 'Validation error',
        keyword: e.keyword,
        params: e.params as Record<string, unknown>,
      }));

  return { valid, errors, resolvedVersion, versionWarning: warning };
}
