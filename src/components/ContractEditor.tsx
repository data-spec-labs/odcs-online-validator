import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { foldGutter, foldKeymap } from '@codemirror/language';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { EditorView, keymap, lineNumbers, placeholder } from '@codemirror/view';
import type { ContractFormat } from '../lib/parse';

export type ContractEditorHandle = {
  focus: () => void;
};

type ContractEditorProps = {
  value: string;
  onChange: (value: string) => void;
  format: ContractFormat;
  placeholder?: string;
  className?: string;
};

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#ffffff',
    fontSize: '0.875rem',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    lineHeight: '1.625',
  },
  '.cm-content': {
    padding: '0.75rem 0',
    color: '#0f172a',
    caretColor: '#4f46e5',
  },
  '.cm-gutters': {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    borderRight: '1px solid #e2e8f0',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  '.cm-foldGutter span': {
    color: '#94a3b8',
    cursor: 'pointer',
  },
  '.cm-foldGutter span:hover': {
    color: '#4f46e5',
  },
  '.cm-placeholder': {
    color: '#475569',
  },
});

const ContractEditor = forwardRef<ContractEditorHandle, ContractEditorProps>(
  function ContractEditor({ value, onChange, format, placeholder: placeholderText, className }, ref) {
    const cmRef = useRef<ReactCodeMirrorRef>(null);

    useImperativeHandle(ref, () => ({
      focus: () => cmRef.current?.view?.focus(),
    }));

    const extensions = useMemo(() => {
      const lang =
        format === 'json' ? json() :
        format === 'yaml' ? yaml() :
        yaml();

      const exts = [
        lineNumbers(),
        foldGutter(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...foldKeymap, indentWithTab]),
        lang,
        editorTheme,
      ];

      if (placeholderText) {
        exts.push(placeholder(placeholderText));
      }

      return exts;
    }, [format, placeholderText]);

    return (
      <div className={`h-full overflow-hidden rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-400 ${className ?? ''}`}>
        <CodeMirror
          ref={cmRef}
          value={value}
          height="100%"
          extensions={extensions}
          onChange={onChange}
          basicSetup={false}
          className="h-full [&_.cm-editor]:h-full"
        />
      </div>
    );
  },
);

export default ContractEditor;
