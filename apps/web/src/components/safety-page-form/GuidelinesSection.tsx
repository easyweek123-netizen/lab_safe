import { useFormContext } from 'react-hook-form';
import { TextArea } from '../TextArea';
import { fieldId, type SafetyPageFormValues } from './form-values';
import { SectionFieldset } from './SectionFieldset';

/** The four guideline sections in PRD order (US4), each with its PRD §4.1 prompt. */
const GUIDELINES = [
  {
    field: 'beforeUse',
    label: 'Before use',
    prompt: 'Training, inspection, PPE, ventilation, setup',
  },
  {
    field: 'safeOperation',
    label: 'Safe operation',
    prompt:
      'Steps, operating limits (temperature, pressure, speed), clean-up and waste, normal shutdown',
  },
  {
    field: 'doNot',
    label: 'Do NOT',
    prompt: 'Prohibited actions, incompatible materials, known misuse',
  },
  {
    field: 'emergency',
    label: 'Emergency & first aid',
    prompt: 'Emergency shutdown; fire, spill, skin or eye contact, inhalation, injury',
  },
] as const satisfies readonly {
  field: keyof SafetyPageFormValues;
  label: string;
  prompt: string;
}[];

// The Guidelines group of the safety page form (S03.1 AC1).
export function GuidelinesSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SafetyPageFormValues>();

  return (
    <SectionFieldset title="Guidelines">
      {GUIDELINES.map((guideline) => (
        <TextArea
          key={guideline.field}
          id={fieldId(guideline.field)}
          label={guideline.label}
          hint={guideline.prompt}
          rows={6}
          registration={register(guideline.field)}
          error={errors[guideline.field]?.message}
        />
      ))}
    </SectionFieldset>
  );
}
