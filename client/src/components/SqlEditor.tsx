import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-sql";
import "prismjs/themes/prism-tomorrow.css"; // Dark theme usually looks better for code

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SqlEditor({ value, onChange, disabled }: SqlEditorProps) {
  return (
    <div className="relative font-mono text-sm border border-border rounded-xl overflow-hidden bg-[#2d2d2d] shadow-inner h-full min-h-[300px]">
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) => highlight(code, languages.sql, "sql")}
        padding={16}
        disabled={disabled}
        textareaClassName="focus:outline-none"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 14,
          backgroundColor: "transparent",
          color: "#f8f8f2",
          minHeight: "100%",
        }}
      />
    </div>
  );
}
