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

interface CreateUserDialogProps {
  onSuccess: () => void;
}

export const CreateUserDialog = ({ onSuccess }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [accountType, setAccountType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const departments = [
    'Administrators',
    'Customer Support',
    'Technology Team',
    'Production Team',
    'QA Team',
    'DevOps',
  ];

  const roles = [
    { value: 'Super Admin', label: 'Super Admin', description: 'Full access' },
    { value: 'Admin', label: 'Admin', description: 'Read, Write, Execute' },
    { value: 'Operator', label: 'Operator', description: 'Read, Write' },
    { value: 'Reporter', label: 'Reporter', description: 'Read' },
  ];

  const accountTypes = ['0', '1', '2', '3', '4', '5'];

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
    if (!accountType) {
      setErrorMessage('Please select an account type.');
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
            account_type: accountType,
          },
        },
      });
      if (authError) throw authError;

      const { error: insertError } = await (supabase as any).from('users').insert({
        id: authData.user?.id,
        email,
        department,
        role,
        account_type: accountType,
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
    setAccountType('');
    setErrorMessage('');
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
          <DialogTitle>Create new users</DialogTitle>
        </DialogHeader>
        {errorMessage && (
          <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
        )}
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-sm">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type user name here"
              className="text-sm"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>
          <div>
            <Label htmlFor="department" className="text-sm">Select Department *</Label>
            <select
              id="department"
              className="w-full p-2 border rounded text-sm"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="role" className="text-sm">Select role *</Label>
            <select
              id="role"
              className="w-full p-2 border rounded text-sm"
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
            <Label htmlFor="accountType" className="text-sm">Account Type *</Label>
            <select
              id="accountType"
              className="w-full p-2 border rounded text-sm"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value="">Select Account Type</option>
              {accountTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
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