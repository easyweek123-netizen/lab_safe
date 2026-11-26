import { HAZARD_PICTOGRAMS, HAZARD_TYPES, PROTECTIVE_EQUIPMENT } from '@labsafe/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Checkbox } from './Checkbox';
import { CheckboxWithNote } from './CheckboxWithNote';
import { ChoiceGroup } from './ChoiceGroup';
import {
  fieldId,
  toggleHazard,
  togglePictogram,
  toggleProtectiveEquipment,
  type SafetyPageFormValues,
} from './form-values';
import { GHS_SYMBOLS } from '../ghs-symbols';
import { SectionFieldset } from './SectionFieldset';

/** A choice's checkbox id: the first gets the field's own id (the error summary links to it). */
function choiceId(field: string, index: number, value: string): string {
  return index === 0 ? fieldId(field) : `${fieldId(field)}-${value}`;
}

// The Hazards and protection group of the safety page form (PRD §4.1, S03.1 AC1–AC3): hazard
// types with a required note each, "No significant hazards", GHS pictograms with symbol and
// name, PPE items with an optional note each, and "No PPE beyond standard lab attire". The
// "none" choices stay usable next to ticked items; the schema refuses both on submit (design
// open question 6). Ticked items are held in PRD order, so `hazards.2.note` names one input.
export function HazardsSection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<SafetyPageFormValues>();

  return (
    <SectionFieldset title="Hazards and protection">
      <Controller
        control={control}
        name="hazards"
        render={({ field }) => (
          <ChoiceGroup
            id={fieldId('hazards')}
            legend="Hazards"
            hint="Tick every hazard of this instrument and say how it arises."
            error={errors.hazards?.message}
          >
            {HAZARD_TYPES.map((hazard, typeIndex) => {
              const index = field.value.findIndex((choice) => choice.type === hazard.value);
              const choice = index === -1 ? undefined : field.value[index];
              const noteId = fieldId(`hazards.${index}.note`);
              return (
                <CheckboxWithNote
                  key={hazard.value}
                  id={choiceId('hazards', typeIndex, hazard.value)}
                  label={hazard.label}
                  checked={choice !== undefined}
                  onCheckedChange={(ticked) =>
                    field.onChange(toggleHazard(field.value, hazard.value, ticked))
                  }
                  noteId={noteId}
                  noteLabel={`How does the ${hazard.label} hazard arise?`}
                  note={choice?.note ?? ''}
                  onNoteChange={(note) =>
                    field.onChange(
                      field.value.map((item) =>
                        item.type === hazard.value ? { ...item, note } : item,
                      ),
                    )
                  }
                  noteRequired
                  noteError={index === -1 ? undefined : errors.hazards?.[index]?.note?.message}
                />
              );
            })}
          </ChoiceGroup>
        )}
      />
      <Checkbox
        id={fieldId('noSignificantHazards')}
        label="No significant hazards"
        error={errors.noSignificantHazards?.message}
        {...register('noSignificantHazards')}
      />

      <Controller
        control={control}
        name="pictograms"
        render={({ field }) => (
          <ChoiceGroup
            id={fieldId('pictograms')}
            legend="GHS pictograms (optional)"
            error={errors.pictograms?.message}
            columns
          >
            {HAZARD_PICTOGRAMS.map((pictogram, index) => (
              <Checkbox
                key={pictogram.value}
                id={choiceId('pictograms', index, pictogram.value)}
                label={
                  <>
                    <img
                      src={GHS_SYMBOLS[pictogram.value]}
                      alt=""
                      width={48}
                      height={48}
                      className="size-12 shrink-0"
                    />
                    <span>{pictogram.label}</span>
                  </>
                }
                checked={field.value.includes(pictogram.value)}
                onChange={(event) =>
                  field.onChange(
                    togglePictogram(field.value, pictogram.value, event.target.checked),
                  )
                }
              />
            ))}
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="protectiveEquipment"
        render={({ field }) => (
          <ChoiceGroup
            id={fieldId('protectiveEquipment')}
            legend="Personal protective equipment (PPE)"
            error={errors.protectiveEquipment?.message}
          >
            {PROTECTIVE_EQUIPMENT.map((ppe, itemIndex) => {
              const index = field.value.findIndex((choice) => choice.item === ppe.value);
              const choice = index === -1 ? undefined : field.value[index];
              return (
                <CheckboxWithNote
                  key={ppe.value}
                  id={choiceId('protectiveEquipment', itemIndex, ppe.value)}
                  label={ppe.label}
                  checked={choice !== undefined}
                  onCheckedChange={(ticked) =>
                    field.onChange(toggleProtectiveEquipment(field.value, ppe.value, ticked))
                  }
                  noteId={fieldId(`protectiveEquipment.${index}.note`)}
                  noteLabel={`Note for ${ppe.label}, optional`}
                  note={choice?.note ?? ''}
                  onNoteChange={(note) =>
                    field.onChange(
                      field.value.map((item) =>
                        item.item === ppe.value ? { ...item, note } : item,
                      ),
                    )
                  }
                  noteRequired={false}
                  noteError={
                    index === -1 ? undefined : errors.protectiveEquipment?.[index]?.note?.message
                  }
                />
              );
            })}
          </ChoiceGroup>
        )}
      />
      <Checkbox
        id={fieldId('standardLabAttireOnly')}
        label="No PPE beyond standard lab attire"
        error={errors.standardLabAttireOnly?.message}
        {...register('standardLabAttireOnly')}
      />
    </SectionFieldset>
  );
}
