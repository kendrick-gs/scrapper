"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "react-simple-code-editor";
import prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-liquid";
import "prismjs/themes/prism.css";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  language?: 'markup' | 'liquid';
};

export default function CodeEditor({ value, onChange, placeholder, className, language = 'markup' }: Props) {
  const [wrap, setWrap] = useState(true);

  const lineCount = useMemo(() => Math.max(1, value?.split(/\n/).length || 1), [value]);

  function copy() {
    navigator.clipboard.writeText(value || "");
  }

  return (
  <div className={cn("w-full relative", className)}>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-medium">HTML</span>
          <span>• {value?.length || 0} chars</span>
          <span>• {lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setWrap((w) => !w)} aria-label="Toggle wrap">
            {wrap ? "No Wrap" : "Wrap"}
          </Button>
          <Button variant="outline" size="sm" onClick={copy} aria-label="Copy HTML">Copy</Button>
        </div>
      </div>
      <div className={cn("rounded-md border bg-background transition-all min-h-[260px]")}
           style={{ overflow: "hidden" }}>
        <Editor
          value={value || ""}
          onValueChange={onChange}
          highlight={(code) => {
            const lang = prism.languages[language] || prism.languages.markup;
            return prism.highlight(code, lang, language);
          }}
          padding={12}
          textareaId="html-editor"
          textareaClassName={cn("font-mono text-sm leading-relaxed focus:outline-none", wrap ? "whitespace-pre-wrap" : "whitespace-pre")}
          placeholder={placeholder || "<p>Product description</p>"}
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
}
