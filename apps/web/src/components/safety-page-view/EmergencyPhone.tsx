/** Only digits, spaces, `+`, `-`, `(` and `)`, with at least one digit (E04 design "Security"). */
const DIALLABLE = /^(?=.*\d)[\d +\-()]+$/;

// The emergency phone number: a `tel:` link when it is only a number, otherwise plain text, so
// nothing a contributor typed becomes another kind of link.
export function EmergencyPhone({ phone }: { phone: string }) {
  if (!DIALLABLE.test(phone)) return <span className="break-words">{phone}</span>;
  return (
    <a
      href={`tel:${phone.replace(/[ ()]/g, '')}`}
      className="inline-block rounded font-semibold text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      {phone}
    </a>
  );
}
