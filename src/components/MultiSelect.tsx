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
    onChange(newValue.length === 0 ? [] : newValue); // Manage selected values without "All" logic
  };

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
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              padding: '6px',
              height: '28px',
              justifyContent: 'space-between',
              textAlign: 'left',
            }}
          >
            {value.length === 0 ? "Select" : `${value.length} selected`}
            <ChevronDown style={{ width: '12px', height: '12px' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent style={{ width: '200px', maxHeight: '300px', overflowY: 'auto' }}>
          {options.map((option) => (
            <div key={option} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
              <Checkbox
                id={`${id}-${option}`}
                checked={value.includes(option)}
                onCheckedChange={() => handleToggle(option)}
              />
              <Label htmlFor={`${id}-${option}`} style={{ fontSize: '12px', marginLeft: '8px' }}>
                {option}
              </Label>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MultiSelect;