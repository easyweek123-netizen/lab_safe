import { HAZARD_LEVELS } from '@labsafe/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '../TextField';
import { fieldId, type SafetyPageFormValues } from './form-values';
import { HAZARD_LEVEL_DEFINITIONS } from './hazard-level-definitions';
import { RadioGroup } from './RadioGroup';
import { SectionFieldset } from './SectionFieldset';

const LEVEL_OPTIONS = HAZARD_LEVELS.map((level) => ({
  value: level.value,
  label: level.label,
  description: HAZARD_LEVEL_DEFINITIONS[level.value],
}));

const TRAINING_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const;

// The Risk at a glance group of the safety page form (S03.1 AC1–AC3): the hazard level with the
// R5 definitions beside each choice, and whether training is required. "Who gives the training"
// shows only for Yes; `toContent` drops its value otherwise.
export function RiskSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<SafetyPageFormValues>();
  const training = useWatch({ control, name: 'trainingRequired' });

  return (
    <SectionFieldset title="Risk at a glance">
      <RadioGroup
        id={fieldId('hazardLevel')}
        label="Hazard level"
        options={LEVEL_OPTIONS}
        registration={register('hazardLevel')}
        required
        error={errors.hazardLevel?.message}
      />
      <RadioGroup
        id={fieldId('trainingRequired')}
        label="Training required before first use"
        options={TRAINING_OPTIONS}
        registration={register('trainingRequired')}
        required
        error={errors.trainingRequired?.message}
      />
      {training === 'yes' && (
        <TextField
          id={fieldId('trainingGivenBy')}
          label="Who gives the training"
          type="text"
          autoComplete="off"
          required
          registration={register('trainingGivenBy')}
          error={errors.trainingGivenBy?.message}
        />
      )}
    </SectionFieldset>
  );
}
