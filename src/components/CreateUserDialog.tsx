import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreateUserDialogProps {
  onSuccess: () => void;
}

const Combobox = ({
  options,
  value,
  onValueChange,
  placeholder,
  allowCustom = true
}: {
  options: string[],
  value: string,
  onValueChange: (val: string) => void,
  placeholder: string,
  allowCustom?: boolean
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const hasExactMatch = options.some(opt => opt.toLowerCase() === search.toLowerCase());
  const showAddOption = allowCustom && search && !hasExactMatch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm font-normal bg-white"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty className="p-0">
              {showAddOption ? (
                <div
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-blue-600 font-medium"
                  onClick={() => {
                    onValueChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{search}"
                </div>
              ) : (
                <div className="py-6 text-center text-sm">No results found.</div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const CreateUserDialog = ({ onSuccess }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('General');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const [departments, setDepartments] = useState([
    'Administrators',
    'Customer Support',
    'Technology Team',
    'Production Team',
    'QA Team',
    'DevOps',
    'Procurement Team',
    'Planning Team',
    'Finance',
    'Supply Chain Management',
    'SAP Analyst',
  ]);

  const [locations, setLocations] = useState([
    'General',
    'Bhiwandi',
    'Ghaziabad',
    'Hyderabad',
    'Trichy',
    'Kolkata',
  ]);

  const roles = [
    { value: 'Super Admin', label: 'Super Admin', description: 'Full access' },
    { value: 'Admin', label: 'Admin', description: 'Read, Write, Execute' },
    { value: 'Operator', label: 'Operator', description: 'Read, Write' },
    { value: 'Reporter', label: 'Reporter', description: 'Read' },
  ];

  const validateForm = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }
    if (!department) {
      setErrorMessage('Please select a department.');
      return false;
    }
    if (!role) {
      setErrorMessage('Please select a role.');
      return false;
    }
    if (!location) {
      setErrorMessage('Please select a location.');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            department,
            role,
            location,
          },
        },
      });
      if (authError) throw authError;

      const { error: insertError } = await (supabase as any).from('users').insert({
        id: authData.user?.id,
        email,
        full_name: name || null,
        department,
        role,
        location,
      });
      if (insertError) throw insertError;

      toast({ title: 'Success', description: 'User created successfully! Please ask the new user to check their email and log in.' });
      onSuccess();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating user:', error);
      setErrorMessage('Failed to create user. Please try again.');
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setRole('');
    setLocation('General');
    setErrorMessage('');
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    if (val && !departments.includes(val)) {
      setDepartments(prev => [...prev, val]);
    }
  };

  const handleLocationChange = (val: string) => {
    setLocation(val);
    if (val && !locations.includes(val)) {
      setLocations(prev => [...prev, val]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="text-sm">Create new users</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px] text-sm">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        {errorMessage && (
          <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
        )}
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm"
              placeholder="Email"
            />
          </div>
          <div>
            <Label htmlFor="name" className="text-sm">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm">Password (min 6 characters) *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-sm"
              placeholder="Password"
            />
          </div>
          <div>
            <Label className="text-sm">Select Department *</Label>
            <Combobox
              options={departments}
              value={department}
              onValueChange={handleDepartmentChange}
              placeholder="Select Department"
            />
          </div>
          <div>
            <Label className="text-sm">Select role *</Label>
            <select
              id="role"
              className="w-full p-2 border rounded text-sm bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Select Role</option>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label} ({r.description})</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-sm">Location *</Label>
            <Combobox
              options={locations}
              value={location}
              onValueChange={handleLocationChange}
              placeholder="Select Location"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="text-sm">Cancel</Button>
          <Button onClick={handleCreate} className="text-sm">Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
