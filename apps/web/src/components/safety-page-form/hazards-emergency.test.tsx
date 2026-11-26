import {
  EMERGENCY_EQUIPMENT,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  SafetyPageContent,
} from '@labsafe/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { rotavapContent } from '../../test/msw';
import { EmergencySection } from './EmergencySection';
import {
  emptyFormValues,
  fieldId,
  fromContent,
  toContent,
  type SafetyPageFormValues,
} from './form-values';
import { GHS_SYMBOLS } from '../ghs-symbols';
import { HazardsSection } from './HazardsSection';

/** The two sections inside one react-hook-form form, as FE-04's form will hold them. */
function TestForm({
  onValues,
  serverErrors = [],
}: {
  onValues?: (values: SafetyPageFormValues) => void;
  serverErrors?: readonly { path: string; message: string }[];
}) {
  const form = useForm<SafetyPageFormValues>({ defaultValues: emptyFormValues });
  const showErrors = () => {
    for (const { path, message } of serverErrors) {
      form.setError(path as keyof SafetyPageFormValues, { type: 'server', message });
    }
  };
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit((values) => onValues?.(values))(event)}
      >
        <HazardsSection />
        <EmergencySection />
        <button type="button" onClick={showErrors}>
          Show errors
        </button>
        <button type="submit">Send</button>
      </form>
    </FormProvider>
  );
}

function renderForm(props: Parameters<typeof TestForm>[0] = {}) {
  const user = userEvent.setup();
  render(<TestForm {...props} />);
  return { user };
}

/** Renders the form, lets `act` fill it in, sends it and returns what `toContent` makes of it. */
async function contentAfter(act: (user: ReturnType<typeof userEvent.setup>) => Promise<void>) {
  let sent: SafetyPageFormValues | undefined;
  const { user } = renderForm({
    onValues: (values) => {
      sent = values;
    },
  });
  await act(user);
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(sent).toBeDefined();
  return toContent(sent ?? emptyFormValues);
}

function hazardsGroup() {
  return within(screen.getByRole('group', { name: 'Hazards' }));
}

function ppeGroup() {
  return within(screen.getByRole('group', { name: 'Personal protective equipment (PPE)' }));
}

describe('Hazards and protection, and Emergency info sections', () => {
  it('S03.1 AC1 shows the Hazards and protection and Emergency info groups with their fields', () => {
    renderForm();

    for (const name of ['Hazards and protection', 'Emergency info']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }

    const hazards = within(screen.getByRole('group', { name: 'Hazards and protection' }));
    expect(hazards.getByRole('group', { name: 'Hazards' })).toBeInTheDocument();
    expect(hazards.getByRole('checkbox', { name: 'No significant hazards' })).toBeInTheDocument();
    expect(hazards.getByRole('group', { name: 'GHS pictograms (optional)' })).toBeInTheDocument();
    expect(
      hazards.getByRole('group', { name: 'Personal protective equipment (PPE)' }),
    ).toBeInTheDocument();
    expect(
      hazards.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }),
    ).toBeInTheDocument();

    const emergency = within(screen.getByRole('group', { name: 'Emergency info' }));
    expect(emergency.getByRole('textbox', { name: 'Emergency phone number' })).toBeRequired();
    for (const item of EMERGENCY_EQUIPMENT) {
      expect(emergency.getByRole('group', { name: item.label })).toBeInTheDocument();
    }
  });

  it('S03.1 AC1 shows the emergency phone number first, then the six emergency items in PRD order', () => {
    renderForm();

    const emergency = screen.getByRole('group', { name: 'Emergency info' });
    const textboxes = within(emergency).getAllByRole('textbox');
    expect(textboxes[0]).toHaveAccessibleName('Emergency phone number');
    expect(textboxes.slice(1).map((box) => box.getAttribute('id'))).toEqual(
      EMERGENCY_EQUIPMENT.map((item) => fieldId(`emergencyEquipment.${item.value}`)),
    );
    expect(
      within(emergency)
        .getAllByRole('group')
        .map((group) => group.querySelector('legend')?.textContent),
    ).toEqual(EMERGENCY_EQUIPMENT.map((item) => item.label));
  });

  it('S03.1 AC2 offers exactly the PRD hazard types in PRD order and no free-text entry', () => {
    renderForm();

    expect(
      hazardsGroup()
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(HAZARD_TYPES.map((item) => item.label));
    expect(hazardsGroup().queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /other|specify/i })).not.toBeInTheDocument();
  });

  it('S03.1 AC2 offers exactly the PRD PPE items in PRD order and no free-text entry', () => {
    renderForm();

    expect(
      ppeGroup()
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent),
    ).toEqual(PROTECTIVE_EQUIPMENT.map((item) => item.label));
    expect(ppeGroup().queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('S03.1 AC2 shows every GHS pictogram with its symbol and its name, in PRD order', () => {
    renderForm();

    const group = within(screen.getByRole('group', { name: 'GHS pictograms (optional)' }));
    const boxes = group.getAllByRole('checkbox');
    expect(boxes).toHaveLength(HAZARD_PICTOGRAMS.length);
    HAZARD_PICTOGRAMS.forEach((pictogram, index) => {
      const box = boxes[index];
      expect(box).toHaveAccessibleName(pictogram.label);
      const label = box?.closest('label');
      expect(label).toHaveTextContent(pictogram.label);
      const image = label?.querySelector('img');
      expect(image).toHaveAttribute('src', GHS_SYMBOLS[pictogram.value]);
      // The symbol is decorative: the label's words name it.
      expect(image).toHaveAttribute('alt', '');
    });
    expect(new Set(Object.values(GHS_SYMBOLS)).size).toBe(HAZARD_PICTOGRAMS.length);
  });

  it('S03.1 AC3 shows a required "How does this hazard arise?" note for each ticked hazard', async () => {
    const { user } = renderForm();

    expect(
      screen.queryByRole('textbox', { name: 'How does the Electrical hazard arise?' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Electrical' }));
    await user.click(screen.getByRole('checkbox', { name: 'Laser' }));

    expect(
      screen.getByRole('textbox', { name: 'How does the Electrical hazard arise?' }),
    ).toBeRequired();
    expect(
      screen.getByRole('textbox', { name: 'How does the Laser hazard arise?' }),
    ).toBeRequired();

    await user.click(screen.getByRole('checkbox', { name: 'Electrical' }));
    expect(
      screen.queryByRole('textbox', { name: 'How does the Electrical hazard arise?' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'How does the Laser hazard arise?' })).toBeVisible();
  });

  it('S03.1 AC3 shows an optional note for each ticked PPE item', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('checkbox', { name: 'Lab coat' }));
    const note = screen.getByRole('textbox', { name: 'Note for Lab coat, optional' });
    expect(note).not.toBeRequired();

    await user.click(screen.getByRole('checkbox', { name: 'Lab coat' }));
    expect(
      screen.queryByRole('textbox', { name: 'Note for Lab coat, optional' }),
    ).not.toBeInTheDocument();
  });

  it('S03.1 AC3 keeps "No significant hazards" and "No PPE beyond standard lab attire" usable next to ticked items', async () => {
    const content = await contentAfter(async (user) => {
      await user.click(screen.getByRole('checkbox', { name: 'Noise' }));
      await user.click(screen.getByRole('checkbox', { name: 'No significant hazards' }));
      await user.click(screen.getByRole('checkbox', { name: 'Hearing protection' }));
      await user.click(screen.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }));
    });

    expect(content.noSignificantHazards).toBe(true);
    expect(content.standardLabAttireOnly).toBe(true);
    expect(content.hazards).toEqual([{ type: 'NOISE', note: '' }]);
    expect(content.protectiveEquipment).toEqual([{ item: 'HEARING_PROTECTION', note: '' }]);
  });

  it('S03.1 AC3 gives each emergency item a location and a "Not applicable" that clears and disables it', async () => {
    const { user } = renderForm();

    for (const item of EMERGENCY_EQUIPMENT) {
      const group = within(screen.getByRole('group', { name: item.label }));
      expect(group.getByRole('textbox')).toBeEnabled();
      expect(group.getByRole('checkbox', { name: 'Not applicable' })).not.toBeChecked();
    }

    const eyewash = within(screen.getByRole('group', { name: 'Eyewash' }));
    const location = eyewash.getByRole('textbox', { name: 'Where is the eyewash?' });
    await user.type(location, 'Next to the door');
    await user.click(eyewash.getByRole('checkbox', { name: 'Not applicable' }));

    expect(location).toBeDisabled();
    expect(location).toHaveValue('');

    await user.click(eyewash.getByRole('checkbox', { name: 'Not applicable' }));
    expect(location).toBeEnabled();
    expect(location).toHaveValue('');
  });

  it('S03.1 AC3 sends a location, or "Not applicable" without a location, for each emergency item', async () => {
    const content = await contentAfter(async (user) => {
      await user.type(screen.getByRole('textbox', { name: 'Emergency phone number' }), '112');
      await user.type(
        screen.getByRole('textbox', { name: 'Where is the eyewash?' }),
        'Next to the door',
      );
      const stop = within(screen.getByRole('group', { name: 'Emergency stop' }));
      await user.type(stop.getByRole('textbox'), 'On the bench');
      await user.click(stop.getByRole('checkbox', { name: 'Not applicable' }));
    });

    expect(content.emergencyPhone).toBe('112');
    expect(content.emergencyEquipment).toEqual({
      EYEWASH: { kind: 'LOCATION', location: 'Next to the door' },
      SAFETY_SHOWER: { kind: 'LOCATION', location: '' },
      FIRE_EXTINGUISHER: { kind: 'LOCATION', location: '' },
      SPILL_KIT: { kind: 'LOCATION', location: '' },
      FIRST_AID_KIT: { kind: 'LOCATION', location: '' },
      EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' },
    });
  });

  it('S03.1 AC3 sends hazards, pictograms and PPE items in PRD order with their notes', async () => {
    const content = await contentAfter(async (user) => {
      await user.click(screen.getByRole('checkbox', { name: 'Laser' }));
      await user.click(screen.getByRole('checkbox', { name: 'Electrical' }));
      await user.type(
        screen.getByRole('textbox', { name: 'How does the Laser hazard arise?' }),
        'Class 4 beam',
      );
      await user.type(
        screen.getByRole('textbox', { name: 'How does the Electrical hazard arise?' }),
        'Mains supply',
      );
      await user.click(screen.getByRole('checkbox', { name: 'Toxic (skull)' }));
      await user.click(screen.getByRole('checkbox', { name: 'Explosive' }));
      await user.click(screen.getByRole('checkbox', { name: 'Lab coat' }));
      await user.click(screen.getByRole('checkbox', { name: 'Safety glasses' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Note for Lab coat, optional' }),
        'Buttoned up',
      );
    });

    expect(content.hazards).toEqual([
      { type: 'ELECTRICAL', note: 'Mains supply' },
      { type: 'LASER', note: 'Class 4 beam' },
    ]);
    expect(content.pictograms).toEqual(['EXPLOSIVE', 'TOXIC']);
    expect(content.protectiveEquipment).toEqual([
      { item: 'SAFETY_GLASSES', note: '' },
      { item: 'LAB_COAT', note: 'Buttoned up' },
    ]);
    expect(content.noSignificantHazards).toBe(false);
    expect(content.standardLabAttireOnly).toBe(false);

    const parsed = SafetyPageContent.safeParse(content);
    const paths = parsed.error?.issues.map((issue) => issue.path.join('.')) ?? [];
    expect(paths.filter((path) => path.startsWith('protectiveEquipment'))).toEqual([]);
  });

  it('S03.1 AC3 shows a message on the note of the ticked hazard its issue path names', async () => {
    const { user } = renderForm({
      serverErrors: [
        { path: 'hazards', message: "Choose at least one hazard, or 'No significant hazards'" },
        { path: 'hazards.1.note', message: 'Describe how this hazard arises' },
        { path: 'protectiveEquipment.0.note', message: 'PPE note must be at most 200 characters' },
        {
          path: 'noSignificantHazards',
          message: "Choose hazards or 'No significant hazards', not both.",
        },
        {
          path: 'standardLabAttireOnly',
          message: "Choose PPE items or 'No PPE beyond standard lab attire', not both.",
        },
        {
          path: 'emergencyEquipment.SPILL_KIT',
          message: "Give a location or choose 'Not applicable'",
        },
        { path: 'emergencyPhone', message: 'Enter the emergency phone number' },
      ],
    });

    // Ticked in another order than PRD order: index 1 is still the second hazard of the PRD list.
    await user.click(screen.getByRole('checkbox', { name: 'Noise' }));
    await user.click(screen.getByRole('checkbox', { name: 'Electrical' }));
    await user.click(screen.getByRole('checkbox', { name: 'Face shield' }));
    await user.click(screen.getByRole('button', { name: 'Show errors' }));

    expect(
      screen.getByRole('textbox', { name: 'How does the Noise hazard arise?' }),
    ).toHaveAccessibleDescription('Describe how this hazard arises');
    expect(
      screen.getByRole('textbox', { name: 'How does the Electrical hazard arise?' }),
    ).not.toHaveAccessibleDescription();
    expect(
      screen.getByRole('textbox', { name: 'Note for Face shield, optional' }),
    ).toHaveAccessibleDescription('PPE note must be at most 200 characters');
    expect(screen.getByRole('group', { name: 'Hazards' })).toHaveAccessibleDescription(
      "Tick every hazard of this instrument and say how it arises. Choose at least one hazard, or 'No significant hazards'",
    );
    expect(
      screen.getByRole('checkbox', { name: 'No significant hazards' }),
    ).toHaveAccessibleDescription("Choose hazards or 'No significant hazards', not both.");
    expect(
      screen.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }),
    ).toHaveAccessibleDescription(
      "Choose PPE items or 'No PPE beyond standard lab attire', not both.",
    );
    expect(
      screen.getByRole('textbox', { name: 'Where is the spill kit?' }),
    ).toHaveAccessibleDescription("Give a location or choose 'Not applicable'");
    expect(screen.getByRole('textbox', { name: 'Emergency phone number' })).toBeInvalid();
  });

  it('S03.1 AC3 gives the first input of each field the id the error summary links to', async () => {
    const { user } = renderForm();

    expect(document.getElementById(fieldId('hazards'))).toBe(
      screen.getByRole('checkbox', { name: 'Electrical' }),
    );
    expect(document.getElementById(fieldId('noSignificantHazards'))).toBe(
      screen.getByRole('checkbox', { name: 'No significant hazards' }),
    );
    expect(document.getElementById(fieldId('pictograms'))).toBe(
      screen.getByRole('checkbox', { name: 'Explosive' }),
    );
    expect(document.getElementById(fieldId('protectiveEquipment'))).toBe(
      screen.getByRole('checkbox', { name: 'Safety glasses' }),
    );
    expect(document.getElementById(fieldId('standardLabAttireOnly'))).toBe(
      screen.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }),
    );
    expect(document.getElementById(fieldId('emergencyPhone'))).toBe(
      screen.getByRole('textbox', { name: 'Emergency phone number' }),
    );
    expect(document.getElementById(fieldId('emergencyEquipment.FIRST_AID_KIT'))).toBe(
      screen.getByRole('textbox', { name: 'Where is the first-aid kit?' }),
    );

    await user.click(screen.getByRole('checkbox', { name: 'Vacuum / implosion' }));
    await user.click(screen.getByRole('checkbox', { name: 'Electrical' }));
    expect(document.getElementById(fieldId('hazards.1.note'))).toBe(
      screen.getByRole('textbox', { name: 'How does the Vacuum / implosion hazard arise?' }),
    );
  });
});

describe('form-values mapping of Hazards and protection, and Emergency info', () => {
  it('S03.1 AC3 maps the empty form so the shared schema names hazards, PPE, the phone and each emergency item', () => {
    const result = SafetyPageContent.safeParse(toContent(emptyFormValues));

    expect(result.success).toBe(false);
    const issues = new Map(
      result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
    expect(issues.get('hazards')).toBe("Choose at least one hazard, or 'No significant hazards'");
    expect(issues.get('protectiveEquipment')).toBe(
      "Choose at least one PPE item, or 'No PPE beyond standard lab attire'",
    );
    expect(issues.get('emergencyPhone')).toBe('Enter the emergency phone number');
    for (const item of EMERGENCY_EQUIPMENT) {
      expect(issues.get(`emergencyEquipment.${item.value}`)).toBe(
        "Give a location or choose 'Not applicable'",
      );
    }
    expect(issues.has('pictograms')).toBe(false);
    expect(issues.has('noSignificantHazards')).toBe(false);
    expect(issues.has('standardLabAttireOnly')).toBe(false);
  });

  it('S03.1 AC3 maps a stored page into these sections and back without change', () => {
    const values = fromContent(rotavapContent);

    expect(values.protectiveEquipment).toEqual([{ item: 'SAFETY_GLASSES', note: '' }]);
    expect(values.emergencyEquipment.EMERGENCY_STOP).toEqual({
      location: '',
      notApplicable: true,
    });

    const parsed = SafetyPageContent.parse(toContent(values));
    expect(parsed.hazards).toEqual(rotavapContent.hazards);
    expect(parsed.noSignificantHazards).toBe(rotavapContent.noSignificantHazards);
    expect(parsed.pictograms).toEqual(rotavapContent.pictograms);
    expect(parsed.protectiveEquipment).toEqual(rotavapContent.protectiveEquipment);
    expect(parsed.standardLabAttireOnly).toBe(rotavapContent.standardLabAttireOnly);
    expect(parsed.emergencyPhone).toBe(rotavapContent.emergencyPhone);
    expect(parsed.emergencyEquipment).toEqual(rotavapContent.emergencyEquipment);
  });
});
