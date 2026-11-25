import { EMERGENCY_EQUIPMENT } from '@labsafe/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '../TextField';
import { Checkbox } from './Checkbox';
import { fieldId, type SafetyPageFormValues } from './form-values';
import { SectionFieldset } from './SectionFieldset';

// The Emergency info group of the safety page form (PRD §4.1, S03.1 AC1, AC3): the emergency
// phone number, then the six emergency items in PRD order, each a location or "Not
// applicable". Ticking "Not applicable" clears and disables the location.
export function EmergencySection() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<SafetyPageFormValues>();
  const equipment = useWatch({ control, name: 'emergencyEquipment' });

  return (
    <SectionFieldset title="Emergency info">
      <TextField
        id={fieldId('emergencyPhone')}
        label="Emergency phone number"
        type="text"
        autoComplete="off"
        required
        registration={register('emergencyPhone')}
        error={errors.emergencyPhone?.message}
      />
      {EMERGENCY_EQUIPMENT.map((item) => {
        const notApplicable = equipment[item.value].notApplicable;
        const path = `emergencyEquipment.${item.value}` as const;
        return (
          <fieldset key={item.value} className="min-w-0 space-y-2">
            <legend className="text-base font-semibold text-slate-900">{item.label}</legend>
            <TextField
              id={fieldId(path)}
              label={`Where is the ${item.label.toLowerCase()}?`}
              type="text"
              autoComplete="off"
              disabled={notApplicable}
              registration={register(`${path}.location`)}
              error={errors.emergencyEquipment?.[item.value]?.message}
            />
            <Checkbox
              id={`${fieldId(path)}-not-applicable`}
              label="Not applicable"
              {...register(`${path}.notApplicable`, {
                onChange: (event: { target: { checked: boolean } }) => {
                  if (event.target.checked) setValue(`${path}.location`, '');
                },
              })}
            />
          </fieldset>
        );
      })}
    </SectionFieldset>
  );
}
