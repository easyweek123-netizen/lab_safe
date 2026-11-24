// `/contribute` (S02.1 "UI states"): the contributor area, shown by `RequireAccount` only to an
// approved contributor or an admin. Empty in this story; E03 adds the safety pages.
export function ContributorAreaPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contributor area</h1>
      <p className="text-base text-slate-700">Here you will write and update safety pages.</p>
    </section>
  );
}
