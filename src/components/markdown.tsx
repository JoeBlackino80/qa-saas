import { Fragment, type ReactNode } from "react";

// Minimal markdown renderer for AI text: **bold**, "- " bullets, "1." numbered
// lists, "#" headings, blank-line paragraphs. Also bolds a short leading
// "Label:" so structured AI reports read like titled points. No dependencies.
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m)
      return (
        <strong key={i} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}

// Bold a leading "Label:" (short, capitalised) for structured report lines.
function renderBody(text: string): ReactNode {
  if (/\*\*/.test(text)) return <>{renderInline(text)}</>;
  const m = text.match(/^([A-ZÁ-Ža-zá-ž][^:.!?]{2,48}?):\s+(.+)$/);
  if (m && m[1].split(" ").length <= 7) {
    return (
      <>
        <strong className="font-semibold text-foreground">{m[1]}:</strong>{" "}
        {m[2]}
      </>
    );
  }
  return <>{renderInline(text)}</>;
}

export function Markdown({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let ul: string[] = [];
  let ol: string[] = [];
  let key = 0;

  const flush = () => {
    if (ul.length) {
      const items = [...ul];
      blocks.push(
        <ul key={key++} className="flex flex-col gap-2">
          {items.map((li, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{renderBody(li)}</span>
            </li>
          ))}
        </ul>,
      );
      ul = [];
    }
    if (ol.length) {
      const items = [...ol];
      blocks.push(
        <ol key={key++} className="flex flex-col gap-2.5">
          {items.map((li, i) => (
            <li key={i} className="flex gap-3">
              <span className="tabular grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-px">{renderBody(li)}</span>
            </li>
          ))}
        </ol>,
      );
      ol = [];
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
      if (ol.length) flush();
      ul.push(bullet[1]);
      continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (ul.length) flush();
      ol.push(numbered[1]);
      continue;
    }
    flush();
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p
          key={key++}
          className="mt-1 text-[15px] font-semibold text-foreground"
        >
          {renderInline(heading[1])}
        </p>,
      );
      continue;
    }
    blocks.push(<p key={key++}>{renderBody(line)}</p>);
  }
  flush();

  return (
    <div
      className={`flex flex-col gap-3 text-sm leading-relaxed text-foreground/80 ${className}`}
    >
      {blocks}
    </div>
  );
}
