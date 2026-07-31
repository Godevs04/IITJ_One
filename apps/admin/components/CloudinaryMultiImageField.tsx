'use client';

import { CloudinaryUploadField } from './CloudinaryUploadField';
import { Button } from './Button';
import { Label } from './Field';

interface CloudinaryMultiImageFieldProps {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
}

/**
 * Multiple-image variant of CloudinaryUploadField — reuses it as-is (one
 * instance per image slot) rather than reimplementing the upload/signing
 * logic. The first entry doubles as the campaign's primary/single image for
 * older consumers that only read `visuals.imageUrl`.
 */
export function CloudinaryMultiImageField({
  label = 'Images',
  values,
  onChange,
  hint = 'The first image is used as the primary image wherever only one is shown.',
}: CloudinaryMultiImageFieldProps) {
  function setAt(index: number, url: string) {
    const next = [...values];
    if (url) next[index] = url;
    else next.splice(index, 1);
    onChange(next);
  }

  function addSlot() {
    onChange([...values, '']);
  }

  const slots = values.length > 0 ? values : [''];

  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-3">
        {slots.map((url, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              <CloudinaryUploadField
                label={`Image ${index + 1}${index === 0 ? ' (primary)' : ''}`}
                value={url}
                onChange={(v) => setAt(index, v)}
              />
            </div>
          </div>
        ))}
      </div>
      <Button variant="secondary" type="button" className="mt-2" onClick={addSlot}>
        Add another image
      </Button>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
