import { CATEGORIES, SafetyPageContent } from '@labsafe/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { metaListsFixture, rotavapContent } from '../../test/msw';
import {
  emptyFormValues,
  fieldId,
  fromContent,
  toContent,
  type SafetyPageFormValues,
} from './form-values';
import { GuidelinesSection } from './GuidelinesSection';
import { IdentitySection } from './IdentitySection';
import { RiskSection } from './RiskSection';

// The exact R5 wording of the PRD (docs/prd/PRD.md R5), first letter capitalised.
const R5 = {
  LOW: 'Minor risk with standard lab PPE.',
  MEDIUM:
    'Misuse can cause an injury that needs first aid or medical care (hot surfaces, glass under vacuum, corrosive splashes).',
  HIGH: 'Misuse can cause serious injury or death, or training is needed before first use (high voltage, cryogens, pressure vessels, class 3B/4 lasers, X-ray).',
};

const PROMPTS = [
  ['Before use', 'Training, inspection, PPE, ventilation, setup'],
  [
    'Safe operation',
    'Steps, operating limits (temperature, pressure, speed), clean-up and waste, normal shutdown',
  ],
  ['Do NOT', 'Prohibited actions, incompatible materials, known misuse'],
  [
    'Emergency & first aid',
    'Emergency shutdown; fire, spill, skin or eye contact, inhalation, injury',
  ],
] as const;

/** The three sections inside one react-hook-form form, as FE-04's form will hold them. */
function TestForm({ onValues }: { onValues?: (values: SafetyPageFormValues) => void }) {
  const form = useForm<SafetyPageFormValues>({ defaultValues: emptyFormValues });
  const showErrors = () => {
    form.setError('name', { type: 'server', message: "Enter the instrument's name" });
    form.setError('description', { type: 'server', message: 'Enter a short description' });
    form.setError('hazardLevel', { type: 'server', message: 'Choose a hazard level' });
    form.setError('trainingGivenBy', { type: 'server', message: 'Enter who gives the training' });
    form.setError('beforeUse', { type: 'server', message: 'Fill in Before use' });
  };
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => void form.handleSubmit((values) => onValues?.(values))(event)}
      >
        <IdentitySection />
        <RiskSection />
        <GuidelinesSection />
        <button type="button" onClick={showErrors}>
          Show errors
        </button>
        <button type="submit">Send</button>
      </form>
    </FormProvider>
  );
}

function renderForm(onValues?: (values: SafetyPageFormValues) => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <TestForm onValues={onValues} />
    </QueryClientProvider>,
  );
  return { user };
}

describe('Identity, Risk at a glance and Guidelines sections', () => {
  it('S03.1 AC1 shows the Identity, Risk at a glance and Guidelines groups with their fields', async () => {
    renderForm();

    for (const name of ['Identity', 'Risk at a glance', 'Guidelines']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }

    const identity = within(screen.getByRole('group', { name: 'Identity' }));
    expect(identity.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(identity.getByLabelText('Photo')).toHaveAttribute('type', 'file');
    expect(identity.getByRole('textbox', { name: 'Manufacturer (optional)' })).toBeInTheDocument();
    expect(identity.getByRole('textbox', { name: 'Model (optional)' })).toBeInTheDocument();
    expect(identity.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
    expect(
      await identity.findByRole('option', { name: 'Teaching lab 1 (LAB-101)' }),
    ).toBeInTheDocument();
    expect(identity.getByRole('combobox', { name: 'Lab room' })).toBeInTheDocument();
    expect(
      identity.getByRole('textbox', { name: 'Short description' }),
    ).toHaveAccessibleDescription('What it does, in 1–3 sentences');
    expect(
      identity.getByRole('textbox', { name: "Responsible person's name" }),
    ).toBeInTheDocument();
    expect(
      identity.getByRole('textbox', { name: "Responsible person's contact" }),
    ).toHaveAccessibleDescription('Email or phone extension');

    const risk = within(screen.getByRole('group', { name: 'Risk at a glance' }));
    expect(risk.getByRole('radiogroup', { name: 'Hazard level' })).toBeInTheDocument();
    expect(
      risk.getByRole('radiogroup', { name: 'Training required before first use' }),
    ).toBeInTheDocument();

    expect(screen.queryByText(/last approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/approver|approved by/i)).not.toBeInTheDocument();
  });

  it('S03.1 AC1 shows the guideline sections in order, each with its PRD prompt as its hint', () => {
    renderForm();

    const guidelines = within(screen.getByRole('group', { name: 'Guidelines' }));
    const areas = guidelines.getAllByRole('textbox');
    expect(areas.map((area) => area.tagName)).toEqual([
      'TEXTAREA',
      'TEXTAREA',
      'TEXTAREA',
      'TEXTAREA',
    ]);
    PROMPTS.forEach(([label, prompt], index) => {
      expect(areas[index]).toHaveAccessibleName(label);
      expect(areas[index]).toHaveAccessibleDescription(prompt);
    });
  });

  it('S03.1 AC1 shows the R5 definitions word for word next to each hazard level', () => {
    renderForm();

    const levels = within(screen.getByRole('radiogroup', { name: 'Hazard level' }));
    expect(levels.getByRole('radio', { name: 'Low' })).toHaveAccessibleDescription(R5.LOW);
    expect(levels.getByRole('radio', { name: 'Medium' })).toHaveAccessibleDescription(R5.MEDIUM);
    expect(levels.getByRole('radio', { name: 'High' })).toHaveAccessibleDescription(R5.HIGH);
    for (const text of Object.values(R5)) {
      expect(levels.getByText(text)).toBeVisible();
    }
  });

  it('S03.1 AC2 offers exactly the PRD categories in PRD order and no free-text entry', () => {
    renderForm();

    const category = screen.getByRole('combobox', { name: 'Category' });
    const options = within(category).getAllByRole('option');
    // The first option is the disabled prompt; it can't be chosen as a value.
    expect(options[0]).toBeDisabled();
    expect(options.slice(1).map((option) => option.textContent)).toEqual(
      CATEGORIES.map((item) => item.label),
    );
    expect(options.slice(1).map((option) => option.getAttribute('value'))).toEqual(
      CATEGORIES.map((item) => item.value),
    );
    expect(screen.queryByRole('textbox', { name: /other|specify/i })).not.toBeInTheDocument();
  });

  it('S03.1 AC2 offers exactly the lab rooms of GET /api/meta/lists', async () => {
    renderForm();

    const room = screen.getByRole('combobox', { name: 'Lab room' });
    await within(room).findByRole('option', { name: 'Teaching lab 2 (LAB-102)' });
    const options = within(room).getAllByRole('option');
    expect(options[0]).toBeDisabled();
    expect(options.slice(1).map((option) => option.getAttribute('value'))).toEqual(
      metaListsFixture.labRooms.map((item) => item.id),
    );
  });

  it('S03.1 AC2 labels every hazard level in words', () => {
    renderForm();

    const levels = within(screen.getByRole('radiogroup', { name: 'Hazard level' }));
    expect(levels.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'LOW',
      'MEDIUM',
      'HIGH',
    ]);
    expect(levels.getByText('Low')).toBeVisible();
    expect(levels.getByText('Medium')).toBeVisible();
    expect(levels.getByText('High')).toBeVisible();
  });

  it('S03.1 AC3 shows a required "Who gives the training" only while training is Yes', async () => {
    const { user } = renderForm();

    expect(
      screen.queryByRole('textbox', { name: 'Who gives the training' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    const trainer = screen.getByRole('textbox', { name: 'Who gives the training' });
    expect(trainer).toBeRequired();

    await user.click(screen.getByRole('radio', { name: 'No' }));
    expect(
      screen.queryByRole('textbox', { name: 'Who gives the training' }),
    ).not.toBeInTheDocument();
  });

  it('S03.1 AC3 does not send "Who gives the training" when training is No', async () => {
    let sent: SafetyPageFormValues | undefined;
    const { user } = renderForm((values) => {
      sent = values;
    });

    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.type(screen.getByRole('textbox', { name: 'Who gives the training' }), 'Dr. Lee');
    await user.click(screen.getByRole('radio', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(sent).toBeDefined();
    const content = toContent(sent ?? emptyFormValues);
    expect(content.trainingRequired).toBe(false);
    expect(content.trainingGivenBy).toBeNull();
  });

  it('S03.1 AC3 sends "Who gives the training" when training is Yes', async () => {
    let sent: SafetyPageFormValues | undefined;
    const { user } = renderForm((values) => {
      sent = values;
    });

    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.type(screen.getByRole('textbox', { name: 'Who gives the training' }), 'Dr. Lee');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const content = toContent(sent ?? emptyFormValues);
    expect(content.trainingRequired).toBe(true);
    expect(content.trainingGivenBy).toBe('Dr. Lee');
  });

  it('S03.1 AC9 shows each message as the description of its input', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'Show errors' }));

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
      "Enter the instrument's name",
    );
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInvalid();
    expect(screen.getByRole('textbox', { name: 'Short description' })).toHaveAccessibleDescription(
      'What it does, in 1–3 sentences Enter a short description',
    );
    expect(screen.getByRole('radiogroup', { name: 'Hazard level' })).toHaveAccessibleDescription(
      'Choose a hazard level',
    );
    expect(
      screen.getByRole('textbox', { name: 'Who gives the training' }),
    ).toHaveAccessibleDescription('Enter who gives the training');
    expect(screen.getByRole('textbox', { name: 'Before use' })).toHaveAccessibleDescription(
      'Training, inspection, PPE, ventilation, setup Fill in Before use',
    );
  });

  it('S03.1 AC9 gives the first input of each field the id the error summary links to', () => {
    renderForm();

    expect(document.getElementById(fieldId('name'))).toBe(
      screen.getByRole('textbox', { name: 'Name' }),
    );
    expect(document.getElementById(fieldId('photoId'))).toBe(screen.getByLabelText('Photo'));
    expect(document.getElementById(fieldId('hazardLevel'))).toBe(
      screen.getByRole('radio', { name: 'Low' }),
    );
    expect(document.getElementById(fieldId('trainingRequired'))).toBe(
      screen.getByRole('radio', { name: 'Yes' }),
    );
    expect(document.getElementById(fieldId('doNot'))).toBe(
      screen.getByRole('textbox', { name: 'Do NOT' }),
    );
  });
});

describe('form-values mapping', () => {
  it('S03.1 AC9 maps the empty form so the shared schema names every field of these sections', () => {
    const result = SafetyPageContent.safeParse(toContent(emptyFormValues));

    expect(result.success).toBe(false);
    const paths = new Set(result.error?.issues.map((issue) => issue.path.join('.')));
    for (const path of [
      'name',
      'photoId',
      'category',
      'labRoomId',
      'description',
      'responsibleName',
      'responsibleContact',
      'hazardLevel',
      'trainingRequired',
      'beforeUse',
      'safeOperation',
      'doNot',
      'emergency',
    ]) {
      expect(paths).toContain(path);
    }
    expect(paths).not.toContain('manufacturer');
    expect(paths).not.toContain('model');
    expect(paths).not.toContain('trainingGivenBy');
  });

  it('S03.1 AC3 maps a stored page into the form and back without change', () => {
    const values = fromContent(rotavapContent);

    expect(values.trainingRequired).toBe('yes');
    expect(values.model).toBe('');
    expect(toContent(values)).toEqual({
      name: rotavapContent.name,
      photoId: rotavapContent.photoId,
      manufacturer: rotavapContent.manufacturer,
      model: '',
      category: rotavapContent.category,
      labRoomId: rotavapContent.labRoomId,
      description: rotavapContent.description,
      responsibleName: rotavapContent.responsibleName,
      responsibleContact: rotavapContent.responsibleContact,
      hazardLevel: rotavapContent.hazardLevel,
      trainingRequired: true,
      trainingGivenBy: rotavapContent.trainingGivenBy,
      hazards: rotavapContent.hazards,
      noSignificantHazards: rotavapContent.noSignificantHazards,
      pictograms: rotavapContent.pictograms,
      protectiveEquipment: [{ item: 'SAFETY_GLASSES', note: '' }],
      standardLabAttireOnly: rotavapContent.standardLabAttireOnly,
      beforeUse: rotavapContent.beforeUse,
      safeOperation: rotavapContent.safeOperation,
      doNot: rotavapContent.doNot,
      emergency: rotavapContent.emergency,
      emergencyPhone: rotavapContent.emergencyPhone,
      emergencyEquipment: rotavapContent.emergencyEquipment,
    });
  });
});
