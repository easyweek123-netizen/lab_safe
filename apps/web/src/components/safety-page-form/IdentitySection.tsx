import { CATEGORIES } from '@labsafe/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { useMetaLists } from '../../api/meta';
import { TextArea } from '../TextArea';
import { TextField } from '../TextField';
import { fieldId, type SafetyPageFormValues } from './form-values';
import { PhotoField } from './PhotoField';
import { SectionFieldset } from './SectionFieldset';
import { SelectField } from './SelectField';

// The Identity group of the safety page form (PRD §4.1, S03.1 AC1, AC2). The categories are the
// shared PRD §4.2 list; the lab rooms come from `GET /api/meta/lists`, which the page has loaded
// before it shows the form (AC18).
export function IdentitySection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<SafetyPageFormValues>();
  const lists = useMetaLists();
  const rooms = (lists.data?.labRooms ?? []).map((room) => ({
    value: room.id,
    label: `${room.name} (${room.code})`,
  }));

  return (
    <SectionFieldset title="Identity">
      <TextField
        id={fieldId('name')}
        label="Name"
        type="text"
        autoComplete="off"
        registration={register('name')}
        error={errors.name?.message}
      />
      <Controller
        control={control}
        name="photoId"
        render={({ field, fieldState }) => (
          <PhotoField
            id={fieldId('photoId')}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        id={fieldId('manufacturer')}
        label="Manufacturer (optional)"
        type="text"
        autoComplete="off"
        registration={register('manufacturer')}
        error={errors.manufacturer?.message}
      />
      <TextField
        id={fieldId('model')}
        label="Model (optional)"
        type="text"
        autoComplete="off"
        registration={register('model')}
        error={errors.model?.message}
      />
      <SelectField
        id={fieldId('category')}
        label="Category"
        prompt="Choose a category"
        options={CATEGORIES}
        registration={register('category')}
        error={errors.category?.message}
      />
      <SelectField
        id={fieldId('labRoomId')}
        label="Lab room"
        prompt="Choose a lab room"
        options={rooms}
        registration={register('labRoomId')}
        error={errors.labRoomId?.message}
      />
      <TextArea
        id={fieldId('description')}
        label="Short description"
        hint="What it does, in 1–3 sentences"
        rows={3}
        registration={register('description')}
        error={errors.description?.message}
      />
      <TextField
        id={fieldId('responsibleName')}
        label="Responsible person's name"
        type="text"
        autoComplete="off"
        registration={register('responsibleName')}
        error={errors.responsibleName?.message}
      />
      <TextField
        id={fieldId('responsibleContact')}
        label="Responsible person's contact"
        hint="Email or phone extension"
        type="text"
        autoComplete="off"
        registration={register('responsibleContact')}
        error={errors.responsibleContact?.message}
      />
    </SectionFieldset>
  );
}
