import { SafetyPageContent, SafetyPageDisplay } from '@labsafe/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { adminUser, approvedUser, rotavapContent, rotavapDisplay } from '../../test/msw';
import { GHS_SYMBOLS } from '../ghs-symbols';
import { SafetyPageView } from './SafetyPageView';

/** `rotavapDisplay` with every optional field filled in, and two of each list. */
const fullPage = SafetyPageDisplay.parse({
  ...rotavapDisplay,
  content: SafetyPageContent.parse({
    ...rotavapContent,
    model: 'Hei-VAP Core',
    hazards: [
      { type: 'HOT_SURFACE', note: 'The water bath reaches 90 °C.' },
      { type: 'VACUUM', note: 'The flask can implode under vacuum.' },
    ],
    pictograms: ['FLAMMABLE', 'HARMFUL_IRRITANT'],
    protectiveEquipment: [
      { item: 'SAFETY_GLASSES', note: 'With side shields.' },
      { item: 'LAB_COAT', note: 'Buttoned up.' },
    ],
  }),
});

/** `fullPage` with some content fields replaced. */
function pageWith(changes: Partial<SafetyPageContent>): SafetyPageDisplay {
  return SafetyPageDisplay.parse({
    ...fullPage,
    content: SafetyPageContent.parse({ ...fullPage.content, ...changes }),
  });
}

/** Fails unless each element comes after the one before it in the document. */
function expectInOrder(elements: HTMLElement[]) {
  elements.slice(1).forEach((element, index) => {
    const before = elements[index];
    expect(before, `element ${index} exists`).toBeDefined();
    if (before === undefined) return;
    const following = before.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(following, `"${element.textContent}" comes after "${before.textContent}"`).toBeTruthy();
  });
}

function region(name: string) {
  return screen.getByRole('region', { name });
}

describe('SafetyPageView', () => {
  it('S04.1 AC5 shows every field in the order of the page', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    const hazards = region('Hazards');
    const ppe = region('Protective equipment');
    expectInOrder([
      screen.getByRole('heading', { level: 2, name: 'Rotary evaporator' }),
      screen.getByText('Manufacturer: Büchi'),
      screen.getByText('Model: Hei-VAP Core'),
      region('At a glance'),
      screen.getByRole('img', { name: 'Photo of Rotary evaporator' }),
      screen.getByText('Separation & evaporation'),
      screen.getByText('Teaching lab 1 (LAB-101)'),
      screen.getByText('Removes solvents under reduced pressure.'),
      screen.getByText('Dr. Lee'),
      screen.getByText('lee@lab.test'),
      hazards,
      within(hazards).getByText('Hot surface / heat'),
      within(hazards).getByText('The water bath reaches 90 °C.'),
      within(hazards).getByText('Vacuum / implosion'),
      within(hazards).getByText('The flask can implode under vacuum.'),
      region('GHS pictograms'),
      ppe,
      within(ppe).getByText('Safety glasses'),
      within(ppe).getByText('With side shields.'),
      within(ppe).getByText('Lab coat'),
      within(ppe).getByText('Buttoned up.'),
      region('Before use'),
      region('Safe operation'),
      region('Do NOT'),
      region('Emergency & first aid'),
    ]);
  });

  it('S04.1 AC5 puts the at-a-glance block first: hazard level as a word with an icon, training, hazards, PPE and the emergency number', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    const glance = region('At a glance');
    const level = within(glance).getByText('Hazard level: Medium');
    // The icon is decorative: the word carries the meaning, never the colour alone.
    const icon = level.parentElement?.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(
      within(glance).getByText('Training required before first use: Yes, given by Dr. Lee'),
    ).toBeInTheDocument();
    const hazardNames = within(glance).getByRole('list', { name: 'Hazards' });
    expect(
      within(hazardNames)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Hot surface / heat', 'Vacuum / implosion']);
    const ppeNames = within(glance).getByRole('list', { name: 'Protective equipment' });
    expect(
      within(ppeNames)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Safety glasses', 'Lab coat']);
    // Names only: the notes are further down.
    expect(within(glance).queryByText('With side shields.')).not.toBeInTheDocument();
    expect(within(glance).getByText(/^Emergency:/)).toHaveTextContent('Emergency: 112');
    expect(within(glance).getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112');
    // Before the photo, so a phone shows it first.
    expectInOrder([glance, screen.getByRole('img', { name: 'Photo of Rotary evaporator' })]);
  });

  it.each([
    ['LOW', 'Low'],
    ['HIGH', 'High'],
  ] as const)('S04.1 AC5 shows hazard level %s as the word "%s"', (hazardLevel, word) => {
    const page =
      hazardLevel === 'LOW'
        ? pageWith({ hazardLevel, trainingRequired: false, trainingGivenBy: null })
        : pageWith({ hazardLevel });
    render(<SafetyPageView page={page} headingLevel={2} />);

    expect(within(region('At a glance')).getByText(`Hazard level: ${word}`)).toBeInTheDocument();
  });

  it('S04.1 AC5 says "Training required before first use: No" when no training is needed', () => {
    render(
      <SafetyPageView
        page={pageWith({ trainingRequired: false, trainingGivenBy: null })}
        headingLevel={2}
      />,
    );

    expect(
      within(region('At a glance')).getByText('Training required before first use: No'),
    ).toBeInTheDocument();
  });

  it('S04.1 AC5 shows each GHS pictogram as a decorative symbol with its name', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    const pictograms = region('GHS pictograms');
    const items = within(pictograms).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Flammable',
      'Harmful/irritant (exclamation mark)',
    ]);
    const symbols = items.map((item) => item.querySelector('img'));
    expect(symbols[0]).toHaveAttribute('src', GHS_SYMBOLS.FLAMMABLE);
    expect(symbols[0]).toHaveAttribute('alt', '');
    expect(symbols[1]).toHaveAttribute('src', GHS_SYMBOLS.HARMFUL_IRRITANT);
    expect(symbols[1]).toHaveAttribute('alt', '');
  });

  it('S04.1 AC5 shows "No significant hazards" and "No PPE beyond standard lab attire" when chosen', () => {
    render(
      <SafetyPageView
        page={pageWith({
          hazards: [],
          noSignificantHazards: true,
          protectiveEquipment: [],
          standardLabAttireOnly: true,
        })}
        headingLevel={2}
      />,
    );

    const glance = region('At a glance');
    expect(within(glance).getByText('No significant hazards')).toBeInTheDocument();
    expect(within(glance).getByText('No PPE beyond standard lab attire')).toBeInTheDocument();
    expect(within(region('Hazards')).getByText('No significant hazards')).toBeInTheDocument();
    expect(
      within(region('Protective equipment')).getByText('No PPE beyond standard lab attire'),
    ).toBeInTheDocument();
    expect(within(region('Hazards')).queryByRole('list')).not.toBeInTheDocument();
  });

  it('S04.1 AC5 shows the lab room as "<name> (<code>)" and the category with its PRD label', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    expect(screen.getByText('Teaching lab 1 (LAB-101)')).toBeInTheDocument();
    expect(screen.getByText('Separation & evaporation')).toBeInTheDocument();
    expect(screen.queryByText('SEPARATION_EVAPORATION')).not.toBeInTheDocument();
  });

  it('S04.1 AC5 starts Emergency & first aid with the phone number, then the six equipment items, then the text', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    const emergency = region('Emergency & first aid');
    const phone = within(emergency).getByText(/^Emergency phone number:/);
    expect(phone).toHaveTextContent('Emergency phone number: 112');
    const equipment = within(emergency).getByRole('list', { name: 'Emergency equipment' });
    expect(
      within(equipment)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Eyewash: Next to the door',
      'Safety shower: Corridor, room 1.02',
      'Fire extinguisher: Left of the fume hood',
      'Spill kit: Under the sink',
      'First-aid kit: On the wall by the door',
      'Emergency stop: Not applicable',
    ]);
    expectInOrder([
      phone,
      equipment,
      within(emergency).getByText('Stop the bath, vent the system and call for help.'),
    ]);
  });

  it('S04.1 AC5 leaves out an empty manufacturer, model, pictograms and PPE note, with no empty heading', () => {
    render(
      <SafetyPageView
        page={pageWith({
          manufacturer: null,
          model: null,
          pictograms: [],
          protectiveEquipment: [{ item: 'SAFETY_GLASSES', note: null }],
        })}
        headingLevel={2}
      />,
    );

    expect(screen.queryByText(/^Manufacturer:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Model:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'GHS pictograms' })).not.toBeInTheDocument();
    const ppeItem = within(region('Protective equipment')).getByRole('listitem');
    expect(ppeItem).toHaveTextContent(/^Safety glasses$/);
  });

  it('S04.1 AC5 keeps line breaks and shows HTML as typed text, never running it', () => {
    const typed = 'Check the glassware.\nThen <b>switch on</b> the bath.';
    const { container } = render(
      <SafetyPageView
        page={pageWith({
          beforeUse: typed,
          hazards: [{ type: 'HOT_SURFACE', note: '<img src=x onerror=alert(1)>' }],
        })}
        headingLevel={2}
      />,
    );

    const text = within(region('Before use')).getByText(/Check the glassware/);
    expect(text.textContent).toBe(typed);
    expect(text).toHaveClass('whitespace-pre-line');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(within(region('Hazards')).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  it('S04.1 AC5 shows no contributor name and no email of the contributor', () => {
    const { container } = render(<SafetyPageView page={fullPage} headingLevel={2} />);

    expect(container).not.toHaveTextContent(approvedUser.name);
    expect(container).not.toHaveTextContent(approvedUser.email);
    expect(container).not.toHaveTextContent(/Submitted/);
  });

  it('S04.1 AC5 shows an emergency number that is not only digits and separators as plain text', () => {
    render(
      <SafetyPageView page={pageWith({ emergencyPhone: '112 or ext. 4444' })} headingLevel={2} />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(within(region('At a glance')).getByText(/^Emergency:/)).toHaveTextContent(
      'Emergency: 112 or ext. 4444',
    );
  });

  it('S04.1 AC5 links a number with spaces, +, - and brackets', () => {
    render(
      <SafetyPageView
        page={pageWith({ emergencyPhone: '+43 (732) 2468-1234' })}
        headingLevel={2}
      />,
    );

    const links = screen.getAllByRole('link', { name: '+43 (732) 2468-1234' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', 'tel:+437322468-1234');
  });

  it.each([1, 2] as const)(
    'S04.1 AC5 gives the name heading level %i and keeps the headings below it in order',
    (headingLevel) => {
      render(<SafetyPageView page={fullPage} headingLevel={headingLevel} />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveAccessibleName('Rotary evaporator');
      expect(headings[0]?.tagName).toBe(`H${headingLevel}`);
      const below = headings.slice(1).map((heading) => heading.tagName);
      expect(new Set(below)).toEqual(new Set([`H${headingLevel + 1}`]));
      expect(headings.slice(1).map((heading) => heading.textContent)).toEqual([
        'At a glance',
        'Hazards',
        'GHS pictograms',
        'Protective equipment',
        'Before use',
        'Safe operation',
        'Do NOT',
        'Emergency & first aid',
      ]);
    },
  );

  it('S04.1 AC5 shows the photo of the page with alt text', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    expect(screen.getByRole('img', { name: 'Photo of Rotary evaporator' })).toHaveAttribute(
      'src',
      `/api/photos/${fullPage.content.photoId}`,
    );
  });

  it('S04.1 AC5 shows no "Last approved" line for a page that was never approved', () => {
    render(<SafetyPageView page={fullPage} headingLevel={2} />);

    expect(screen.queryByText(/Last approved/)).not.toBeInTheDocument();
  });

  it('S04.1 AC5 shows "Last approved <date> by <name>" when the page was approved', () => {
    render(
      <SafetyPageView
        page={{
          ...fullPage,
          lastApproved: { at: '2026-11-25T12:00:00.000Z', approverName: adminUser.name },
        }}
        headingLevel={1}
      />,
    );

    expect(screen.getByText(/^Last approved/)).toHaveTextContent(
      'Last approved 25 Nov 2026 by Adam Admin',
    );
  });
});
