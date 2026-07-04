import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { parseContract, extractApiVersion, detectFormat, needsPrettyPrint, prettyContract } from '../lib/parse';
import { validateContract, type ValidationResult } from '../lib/validate';
import ContractEditor, { type ContractEditorHandle } from './ContractEditor';

// ── Example contracts ──────────────────────────────────────────────────────

const EXAMPLE_MINIMAL = `apiVersion: v3.1.0
kind: DataContract
id: 53581432-6c55-4ba2-a65f-72344a91553a
name: orders_v1
version: 1.0.0
status: active
domain: commerce
tenant: AcmeCorp
description:
  purpose: Core order data for analytics.
  limitations: No PII included.
`;

const EXAMPLE_FULL = `apiVersion: v3.1.0
kind: DataContract
id: 7a1b2c3d-4e5f-6789-abcd-ef0123456789
name: payments_v2
version: 2.1.0
status: active
domain: finance
tenant: ClimateQuantumInc

description:
  purpose: Views built on top of the seller payment tables.
  limitations: Cannot be used in conjunction with days with full moons.
  usage: Twice a day, preferable before meals.

servers:
  - server: prod-postgres
    type: postgres
    host: db.example.com
    port: 5432
    database: payments_db
    schema: pp_access_views
    environment: prod

schema:
  - id: payments_tbl
    name: payments
    physicalName: tbl_payments
    physicalType: table
    description: Core payment transactions
    tags: [finance, payments]
    properties:
      - id: payment_id_prop
        name: payment_id
        primaryKey: true
        primaryKeyPosition: 1
        logicalType: string
        physicalType: varchar(36)
        required: true
        description: Unique payment identifier
        classification: restricted
      - id: amount_prop
        name: amount
        logicalType: number
        physicalType: decimal(18,2)
        required: true
        description: Payment amount
        classification: public
        quality:
          - metric: nullValues
            mustBe: 0
            description: Amount must not be null
      - id: currency_prop
        name: currency
        logicalType: string
        physicalType: varchar(3)
        required: true
        description: ISO 4217 currency code
        classification: public
    quality:
      - metric: rowCount
        mustBeGreaterThan: 1000
        description: Table must have data

price:
  priceAmount: 9.95
  priceCurrency: USD
  priceUnit: megabyte

team:
  name: payments-team
  members:
    - username: jsmith
      role: Owner
      dateIn: "2024-01-01"
    - username: alee
      role: Data Steward
      dateIn: "2024-03-15"

roles:
  - role: analyst_read
    access: read
    firstLevelApprovers: Team Lead
    secondLevelApprovers: Data Owner

slaProperties:
  - property: latency
    value: 4
    unit: d
  - property: retention
    value: 3
    unit: y
  - property: generalAvailability
    value: "2024-01-01T00:00:00Z"

support:
  - channel: "#payments-help"
    tool: slack
    scope: interactive

tags:
  - finance
  - payments

contractCreatedTs: "2024-09-17T11:58:08Z"
`;

const EXAMPLE_INVALID = `apiVersion: v3.1.0
kind: DataContract
# Missing required fields: id, version, status
name: broken_contract
unknownTopLevelField: this will fail strict validation
`;

const EXAMPLES = [
  { label: 'Minimal valid contract', value: EXAMPLE_MINIMAL },
  { label: 'Full contract (schema + quality + SLA)', value: EXAMPLE_FULL },
  { label: 'Invalid contract (to see errors)', value: EXAMPLE_INVALID },
];

// ── Types ──────────────────────────────────────────────────────────────────

type UIState =
  | { kind: 'empty' }
  | { kind: 'parsing-error'; message: string; format: string }
  | { kind: 'valid'; result: ValidationResult; format: string }
  | { kind: 'invalid'; result: ValidationResult; format: string };

// ── Main component ─────────────────────────────────────────────────────────

export default function Validator() {
  const [input, setInput] = useState('');
  const [uiState, setUiState] = useState<UIState>({ kind: 'empty' });
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<ContractEditorHandle>(null);

  const editorFormat = useMemo(() => detectFormat(input), [input]);

  const runValidation = useCallback((text: string) => {
    if (!text.trim()) {
      setUiState({ kind: 'empty' });
      return;
    }
    const parseResult = parseContract(text);
    if (!parseResult.ok) {
      setUiState({ kind: 'parsing-error', message: parseResult.error, format: parseResult.format });
      return;
    }

    if (needsPrettyPrint(text, parseResult.data, parseResult.format)) {
      const pretty = prettyContract(parseResult.data, parseResult.format);
      if (pretty !== text) {
        setInput(pretty);
      }
    }

    const apiVersion = extractApiVersion(parseResult.data);
    const result = validateContract(parseResult.data, apiVersion);
    setUiState(result.valid
      ? { kind: 'valid', result, format: parseResult.format }
      : { kind: 'invalid', result, format: parseResult.format }
    );
  }, []);

  // Debounced auto-validate
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runValidation(input), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, runValidation]);

  // Keyboard shortcut: Cmd/Ctrl + Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        runValidation(input);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [input, runValidation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLoadExample = (value: string) => {
    setInput(value);
    editorRef.current?.focus();
  };

  const handleClear = () => {
    setInput('');
    setCopied(false);
    setUiState({ kind: 'empty' });
    editorRef.current?.focus();
  };

  const PANEL_HEIGHT = 'h-72 md:h-full md:min-h-[12rem]';

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-3 md:gap-4 flex-1 min-h-0 md:items-stretch">
        {/* ── Left: Input Panel ── */}
        <div className="flex flex-col gap-2 min-h-0 md:h-full">
          <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Your Contract</span>
              {uiState.kind !== 'empty' && uiState.kind !== 'parsing-error' || uiState.kind === 'parsing-error' ? (
                <FormatBadge format={
                  uiState.kind === 'parsing-error' ? uiState.format :
                  uiState.kind === 'valid' || uiState.kind === 'invalid' ? uiState.format : 'unknown'
                } />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <ExamplesDropdown onSelect={handleLoadExample} />
              <button
                onClick={handleCopy}
                disabled={!input}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={handleClear}
                disabled={!input}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className={`relative flex-1 min-h-0 ${PANEL_HEIGHT}`}>
            <ContractEditor
              ref={editorRef}
              value={input}
              onChange={setInput}
              format={editorFormat}
              placeholder={`Paste your ODCS contract here…\n\napiVersion: v3.1.0\nkind: DataContract\nid: your-uuid\nversion: 1.0.0\nstatus: active`}
              className="h-full"
            />
          </div>
          <p className="text-[11px] text-slate-400 shrink-0 hidden md:block">
            Auto-validates · Cmd/Ctrl+Enter
          </p>
        </div>

        {/* ── Right: Results Panel ── */}
        <div className="flex flex-col gap-2 min-h-0 md:h-full">
          <span className="text-sm font-semibold text-slate-700 shrink-0">Validation Results</span>
          <div className={`flex-1 min-h-0 ${PANEL_HEIGHT}`}>
            <ResultsPanel state={uiState} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FormatBadge({ format }: { format: string }) {
  if (format === 'unknown') return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
      {format.toUpperCase()}
    </span>
  );
}

function ExamplesDropdown({ onSelect }: { onSelect: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors font-medium"
      >
        Load example ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded-xl bg-white shadow-lg border border-slate-200 overflow-hidden">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => { onSelect(ex.value); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsPanel({ state }: { state: UIState }) {
  const panelClass = 'h-full min-h-[12rem] rounded-xl overflow-auto';

  if (state.kind === 'empty') {
    return (
      <div className={`${panelClass} border-2 border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center gap-3 text-slate-600`}>
        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-700 text-center px-6">Paste an ODCS contract on the left to see validation results here.</p>
      </div>
    );
  }

  if (state.kind === 'parsing-error') {
    return (
      <div className={`${panelClass} border border-amber-200 bg-amber-50 p-5`}>
        <div className="flex items-start gap-3">
          <span className="text-amber-500 text-xl mt-0.5 shrink-0">⚠</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Syntax Error</p>
            <p className="text-amber-700 text-sm mt-1">Could not parse as {state.format !== 'unknown' ? state.format.toUpperCase() : 'YAML or JSON'}.</p>
            <pre className="mt-3 text-xs font-mono text-amber-800 bg-amber-100 rounded-lg p-3 whitespace-pre-wrap break-all">{state.message}</pre>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === 'valid') {
    const { result } = state;
    return (
      <div className={`${panelClass} border border-emerald-200 bg-emerald-50 p-5 flex flex-col gap-4`}>
        {result.versionWarning && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="text-amber-500 text-sm shrink-0">⚠</span>
            <p className="text-xs text-amber-700">{result.versionWarning}</p>
          </div>
        )}
        <div className="flex items-start gap-3">
          <span className="text-emerald-500 text-2xl shrink-0">✓</span>
          <div>
            <p className="font-bold text-emerald-800 text-base">Valid ODCS Contract!</p>
            <p className="text-emerald-700 text-sm mt-0.5">Your contract passes all schema checks.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <ContractStat label="Standard version" value={result.resolvedVersion} />
          <ContractStat label="Format" value={state.format.toUpperCase()} />
        </div>
      </div>
    );
  }

  // invalid
  const { result } = state;
  return (
    <div className={`${panelClass} border border-red-200 bg-red-50 flex flex-col`}>
      {/* Banner */}
      <div className="sticky top-0 bg-red-50 border-b border-red-200 px-5 py-4 flex items-center gap-3">
        <span className="text-red-500 text-2xl shrink-0">✗</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-red-800 text-base">
            {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} found
          </p>
          <p className="text-red-600 text-xs mt-0.5">
            Schema: {result.resolvedVersion}
            {result.versionWarning ? ' · ' + result.versionWarning : ''}
          </p>
        </div>
      </div>

      {/* Error list */}
      <ul className="divide-y divide-red-100 flex-1 overflow-auto">
        {result.errors.map((err, i) => (
          <li key={i} className="px-5 py-3">
            <div className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5 shrink-0 text-xs font-bold">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <p className="font-mono text-xs text-red-700 bg-red-100 inline-block px-1.5 py-0.5 rounded mb-1 break-all">
                  {err.path}
                </p>
                <p className="text-sm text-red-800">{err.message}</p>
                <p className="text-xs text-red-500 mt-0.5 font-mono">rule: {err.keyword}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContractStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-emerald-100 px-3 py-2">
      <p className="text-xs text-emerald-600 font-medium">{label}</p>
      <p className="text-sm font-semibold text-emerald-800 font-mono mt-0.5">{value}</p>
    </div>
  );
}
