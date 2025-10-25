import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  label: string;
  id: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder, label, id }) => {
  const [open, setOpen] = useState(false);

  const handleToggle = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onChange([]);
    } else {
      onChange(options);
    }
  };

  if (options.length === 0) {
    return (
      <div style={{ flex: '1', minWidth: '120px' }}>
        <label htmlFor={id} style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {label}
        </label>
        <div style={{ fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '6px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
          No options available
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: '1', minWidth: '120px' }}>
      <label htmlFor={id} style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            style={{
              fontSize: '12px',
              width: '100%',
              minWidth: '120px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '6px',
              height: '28px',
              justifyContent: 'space-between',
              textAlign: 'left',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              lineHeight: '1.2',
            }}
          >
            {value.length === 0 ? "Select" : `${value.length} selected`}
            <ChevronDown style={{ width: '12px', height: '12px' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent style={{ width: 'auto', minWidth: '280px', maxWidth: '350px', maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '8px' }}>
            <Checkbox
              id={`${id}-select-all`}
              checked={value.length === options.length}
              indeterminate={value.length > 0 && value.length < options.length}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor={`${id}-select-all`} style={{ fontSize: '12px', marginLeft: '8px', cursor: 'pointer' }}>
              Select All
            </Label>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {options.map((option) => (
              <div key={option} style={{ display: 'flex', alignItems: 'flex-start', padding: '4px 0' }}>
                <Checkbox
                  id={`${id}-${option}`}
                  checked={value.includes(option)}
                  onCheckedChange={() => handleToggle(option)}
                />
                <Label htmlFor={`${id}-${option}`} style={{ fontSize: '12px', marginLeft: '8px', cursor: 'pointer', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.3', width: '100%' }}>
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MultiSelect;