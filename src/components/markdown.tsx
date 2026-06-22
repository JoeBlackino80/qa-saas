import { Fragment, type ReactNode } from "react";

// Minimal markdown renderer for AI reports: **bold**, "- " bullets, "#" headings,
// blank-line paragraph breaks. No external dependency, no raw markup on screen.
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i} className="font-semibold text-foreground">{m[1]}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flush = () => {
    if (list.length) {
      const items = [...list];
      blocks.push(
        <ul key={key++} className="ml-1 flex flex-col gap-1.5">
          {items.map((li, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{renderInline(li)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flush();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={key++} className="font-semibold text-foreground">
          {renderInline(heading[1])}
        </p>,
      );
      continue;
    }
    blocks.push(<p key={key++}>{renderInline(line)}</p>);
  }
  flush();

  return (
    <div className={`flex flex-col gap-2.5 text-sm leading-relaxed text-foreground/80 ${className}`}>
      {blocks}
    </div>
  );
}
