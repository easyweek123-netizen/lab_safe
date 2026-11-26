// A contributor's text as typed: React text (never HTML) with its line breaks kept (S04.1 AC5).
export function ViewText({ text }: { text: string }) {
  return <p className="text-base break-words whitespace-pre-line text-slate-800">{text}</p>;
}
