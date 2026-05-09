import React from "react";

const STOP_WORDS = new Set(["の", "は", "が", "を", "に", "で", "と", "も", "か", "へ", "から", "まで", "より", "って", "て", "た", "だ", "です", "ます", "する", "した", "して", "ない", "ある", "いる", "れる", "られる", "こと", "もの", "ため", "よう", "など", "about", "the", "is", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with"]);

export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const keywords = query
    .split(/[\s、。？！　]+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  if (keywords.length === 0) return text;

  const pattern = new RegExp(`(${keywords.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
