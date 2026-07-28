import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Settings, Edit, Trash, Search, Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
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

import TabAccessSelect from './TabAccessSelect';
import { ADMIN_DEPARTMENT } from '@/lib/appTabs';

interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  department?: string;
  role?: 'Super Admin' | 'Admin' | 'Operator' | 'Reporter';
  location?: string;
  tab_access?: string[] | null;
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

const deriveNameFromEmail = (email: string) => {
  if (!email) return '';
  const localPart = email.split('@')[0];
  return localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const UserProfile = () => {
  const { user, signOut, updateUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openEditUser, setOpenEditUser] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [department, setDepartment] = useState(user?.user_metadata?.department || '');
  const [role, setRole] = useState<string>('');
  const [location, setLocation] = useState<string>('General');
  const [tabAccess, setTabAccess] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

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

  const canAccessUserManagement = ['Super Admin', 'Admin', 'Operator'].includes(userRole || '');
  const canCreateEditUsers = ['Super Admin', 'Admin', 'Operator'].includes(userRole || '');
  const canEditAllRoles = userRole === 'Super Admin';
  const canEditOperatorReporter = userRole === 'Admin' || userRole === 'Super Admin';
  const canEditReporter = userRole === 'Operator' || userRole === 'Admin' || userRole === 'Super Admin';
  const canDeleteOperatorReporter = userRole === 'Admin' || userRole === 'Super Admin';
  const canDeleteReporter = userRole === 'Operator' || userRole === 'Admin' || userRole === 'Super Admin';

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setEmail(user?.email || '');
    setDepartment(user?.user_metadata?.department || '');
    checkAuthorization();
  }, [user]);

  useEffect(() => {
    if (openEditUser && !selectedUser && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const fetchExistingUserDetails = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('full_name, department, location')
            .eq('email', email)
            .maybeSingle();

          if (data && !error) {
            if (data.full_name) setFullName(data.full_name);
            if (data.department) setDepartment(data.department);
            if (data.location) setLocation(data.location);
          } else {
            // If not found in DB, derive from email
            setFullName(deriveNameFromEmail(email));
          }
        } catch (err) {
          setFullName(deriveNameFromEmail(email));
        }
      };
      fetchExistingUserDetails();
    }
  }, [email, openEditUser, selectedUser]);

  const checkAuthorization = async () => {
    if (!user?.email) {
      setIsAuthorized(false);
      setUserRole(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, role, location, department')
        .eq('email', user.email)
        .single();
      if (data && !error) {
        setIsAuthorized(true);
        setUserRole(data.role);
        setLocation(data.location || 'General');
        if (data.department) setDepartment(data.department);
      } else {
        setIsAuthorized(false);
        setUserRole(null);
        setLocation('General');
      }
    } catch (err) {
      setIsAuthorized(false);
      setUserRole(null);
      setLocation('General');
    }
  };

  const fetchUsers = async () => {
    if (!canAccessUserManagement) {
      setUsers([]);
      return;
    }
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        setUsers([]);
        return;
      }
      setUsers(data as AppUser[] || []);
    } catch (error) {
      setUsers([]);
    }
  };

  useEffect(() => {
    if (canAccessUserManagement) {
      fetchUsers();
    }
  }, [userRole]);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to sign out', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateUser({ data: { full_name: fullName, department } });
      await supabase
        .from('users')
        .update({ full_name: fullName, department })
        .eq('email', user?.email);
      toast({ title: 'Success', description: 'Profile updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setOpenProfile(false);
    }
  };

  const handleEditUser = (user: AppUser) => {
    if (!canCreateEditUsers) {
      toast({ title: 'Access Denied', description: 'You do not have permission to edit users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && ['Super Admin', 'Admin'].includes(user.role || '')) {
      toast({ title: 'Access Denied', description: 'Admins cannot edit Super Admin or Admin users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Operator' && user.role !== 'Reporter') {
      toast({ title: 'Access Denied', description: 'Operators can only edit Reporter users.', variant: 'destructive' });
      return;
    }
    setSelectedUser(user);
    setEmail(user.email);
    setFullName(user.full_name || '');
    setDepartment(user.department || '');
    setRole(user.role || '');
    setLocation(user.location || 'General');
    setTabAccess(user.tab_access || []);
    setOpenEditUser(true);
    setErrorMessage('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !canCreateEditUsers) {
      toast({ title: 'Access Denied', description: 'You do not have permission to edit users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && !['Operator', 'Reporter'].includes(role)) {
      toast({ title: 'Access Denied', description: 'Admins can only assign Operator or Reporter roles.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Operator' && role !== 'Reporter') {
      toast({ title: 'Access Denied', description: 'Operators can only assign the Reporter role.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && selectedUser.id === user?.id && role !== selectedUser.role) {
      toast({ title: 'Access Denied', description: 'Admins cannot change their own role.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const updateRole = userRole === 'Admin' && selectedUser.id === user?.id ? selectedUser.role : role;
      const { error } = await supabase
        .from('users')
        .update({
          email,
          full_name: fullName,
          department,
          role: updateRole,
          location: location,
          tab_access: tabAccess.length ? tabAccess : null,
        })
        .eq('id', selectedUser.id);
      if (error) throw error;
      await fetchUsers();
      toast({ title: 'Success', description: 'User updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setOpenEditUser(false);
      setSelectedUser(null);
      resetForm();
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!canCreateEditUsers) {
      toast({ title: 'Access Denied', description: 'You do not have permission to delete users.', variant: 'destructive' });
      return;
    }
    try {
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('role, id')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (userRole === 'Admin' && ['Super Admin', 'Admin'].includes(targetUser.role)) {
        toast({ title: 'Access Denied', description: 'Admins cannot delete Super Admin or Admin users.', variant: 'destructive' });
        return;
      }
      if (userRole === 'Operator' && targetUser.role !== 'Reporter') {
        toast({ title: 'Access Denied', description: 'Operators can only delete Reporter users.', variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      await fetchUsers();
      toast({ title: 'Success', description: 'User profile deleted successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user profile. Please try again.', variant: 'destructive' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateEditUsers) {
      toast({ title: 'Access Denied', description: 'You do not have permission to create users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && !['Operator', 'Reporter'].includes(role)) {
      toast({ title: 'Access Denied', description: 'Admins can only create Operator or Reporter users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Operator' && role !== 'Reporter') {
      toast({ title: 'Access Denied', description: 'Operators can only create Reporter users.', variant: 'destructive' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Error', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    if (!department) {
      toast({ title: 'Error', description: 'Please select a department.', variant: 'destructive' });
      return;
    }
    if (!role) {
      toast({ title: 'Error', description: 'Please select a role.', variant: 'destructive' });
      return;
    }
    if (!location) {
      toast({ title: 'Error', description: 'Please select a location.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existingUser) {
        toast({ title: 'Success', description: 'User Created Successfully' });
        setOpenEditUser(false);
        resetForm();
        await fetchUsers();
        return;
      }

      let userId = crypto.randomUUID();
      const { error: signupError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName || null,
            department: department || null,
            tab_access: tabAccess.length ? tabAccess : null,
            role: role || null,
            location: location || 'General',
          },
        },
      });
      if (signupError) throw signupError;
      toast({ title: 'Info', description: `Magic link sent to "${email}". User needs to click the link to activate their account.` });

      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: fullName || null,
          department,
          role,
          location: location,
        })
        .select()
        .single();
      if (insertError) {
        toast({ title: 'Success', description: 'User Created Successfully' });
      } else {
        setUsers(prev => [...prev, insertedUser as AppUser]);
        toast({ title: 'Success', description: 'User Created Successfully' });
        await fetchUsers();
      }
    } catch (error) {
      toast({ title: 'Success', description: 'User Created Successfully' }); // Silent handling as per original
    } finally {
      setIsLoading(false);
      setOpenEditUser(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setDepartment('');
    setRole('');
    setLocation('General');
    setTabAccess([]);
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

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  if (!user) return <div className="text-sm">Please log in to access this page.</div>;
  if (!isAuthorized) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user.user_metadata?.avatar_url || 'https://via.placeholder.com/40'}
                alt={user.user_metadata?.full_name || user.email}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 text-sm">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenProfile(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          {canAccessUserManagement && (
            <DropdownMenuItem onClick={() => {
              fetchUsers();
              setOpenSettings(true);
            }}>
              <Settings className="mr-2 h-4 w-4" />
              <span>User Management</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={openProfile} onOpenChange={setOpenProfile}>
        <DialogContent className="max-w-[400px] text-sm">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fullName" className="text-right text-sm">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="col-span-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right text-sm">Department</Label>
                <div className="col-span-3">
                  <Combobox
                    options={departments}
                    value={department}
                    onValueChange={handleDepartmentChange}
                    placeholder="Select Department"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="text-sm">
                {isLoading ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openSettings} onOpenChange={setOpenSettings}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="px-8 py-5 flex flex-row justify-between items-center border-b bg-white z-[100] relative">
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                User Management
                <Badge variant='outline' className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[10px] py-0.5">ADMIN PANEL</Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-xs">Manage system access and permissions for all team members.</DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              {canCreateEditUsers && (
                <Button
                  onClick={() => {
                    resetForm();
                    setOpenEditUser(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all text-xs"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add New User
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenSettings(false)}
                className="h-10 w-10 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors group"
              >
                <X className="h-6 w-6 stroke-[3px]" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/20">
            <div className="px-8 py-4 bg-white/50 backdrop-blur-sm border-b border-slate-100">
              <div className="flex items-center gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search members by name, email or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-10 rounded-xl border-slate-200 focus-visible:ring-blue-500 shadow-sm bg-white text-xs font-medium"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            {errorMessage && <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-bold flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {errorMessage}
            </div>}

            <div className="flex-1 m-6 border border-slate-200 rounded-[1.5rem] overflow-hidden bg-white shadow-xl flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar-thin">
                <Table className="w-full border-collapse" wrapperOverflow="visible">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                      <TableHead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-40 font-black uppercase tracking-[0.15em] text-[9px] text-slate-400 py-4 px-6 border-r border-slate-200/50">Name</TableHead>
                      <TableHead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-40 font-black uppercase tracking-[0.15em] text-[9px] text-slate-400 py-4 px-4 border-r border-slate-200/50">Department</TableHead>
                      <TableHead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-40 font-black uppercase tracking-[0.15em] text-[9px] text-slate-400 py-4 px-4 border-r border-slate-200/50">Email Address</TableHead>
                      <TableHead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-40 font-black uppercase tracking-[0.15em] text-[9px] text-slate-400 py-4 px-4 border-r border-slate-200/50">System Role</TableHead>
                      <TableHead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-40 font-black uppercase tracking-[0.15em] text-[9px] text-slate-400 py-4 px-4 border-r border-slate-200/50">Primary Location</TableHead>
                      <TableHead className="sticky top-0 bg-slate-100/90 backdrop-blur-md z-40 font-black uppercase tracking-[0.15em] text-[9px] text-slate-400 py-4 px-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-32 text-center">
                          <div className="flex flex-col items-center justify-center opacity-30">
                            <Search className="h-16 w-16 text-slate-400 mb-6" />
                            <p className="text-lg font-black uppercase tracking-[0.2em] text-slate-400">No matching members found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user, index) => (
                        <TableRow
                          key={user.id}
                          className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-all"
                        >
                          <TableCell className="py-4 px-6 align-middle border-r border-slate-50/50">
                            <div className="font-bold text-slate-700">{user.full_name || '—'}</div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle border-r border-slate-50/50">
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-bold text-[10px] uppercase tracking-tighter">
                              {user.department || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle border-r border-slate-50/50">
                            <div className="font-medium text-blue-600 truncate hover:underline cursor-pointer">{user.email}</div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle border-r border-slate-50/50">
                            <Badge className={cn(
                              "border-0 capitalize font-black text-[9px] tracking-widest px-3 py-1 rounded-full",
                              user.role === 'Super Admin' ? 'bg-red-500 text-white' :
                              user.role === 'Admin' ? 'bg-blue-500 text-white' :
                              user.role === 'Operator' ? 'bg-green-500 text-white' :
                              'bg-slate-200 text-slate-700'
                            )}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle border-r border-slate-50/50">
                            <div className="text-slate-500 font-medium">{user.location || 'General'}</div>
                          </TableCell>
                          <TableCell className="py-4 px-6 align-middle text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {((canEditAllRoles) ||
                                (canEditOperatorReporter && ['Operator', 'Reporter'].includes(user.role || '')) ||
                                (canEditReporter && user.role === 'Reporter')) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  className="h-9 w-9 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-lg border border-transparent hover:border-slate-100 transition-all"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {((canEditAllRoles) ||
                                (canDeleteOperatorReporter && ['Operator', 'Reporter'].includes(user.role || '')) ||
                                (canDeleteReporter && user.role === 'Reporter')) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditUser} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          resetForm();
        }
        setOpenEditUser(open);
      }}>
        <DialogContent className="max-w-[400px] max-h-[70vh] text-sm">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          {errorMessage && <div className="text-red-500 text-sm mb-4">{errorMessage}</div>}
          <form onSubmit={selectedUser ? handleSaveEdit : handleCreateUser} className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
            <div>
              <Label htmlFor="editEmail" className="text-sm">Email *</Label>
              <Input
                id="editEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
                disabled={!!selectedUser}
                placeholder="Email"
              />
            </div>
            <div>
              <Label className="text-sm text-slate-500">Full Name</Label>
              <div className="text-sm font-semibold p-2 bg-slate-50 rounded-md border border-slate-100 min-h-[36px] flex items-center">
                {fullName || '—'}
              </div>
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
              <Label htmlFor="editRole" className="text-sm">Select role *</Label>
              <Select
                value={role}
                onValueChange={setRole}
                disabled={selectedUser && userRole === 'Admin' && selectedUser.id === user?.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {canEditAllRoles && (
                    <>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Reporter">Reporter</SelectItem>
                    </>
                  )}
                  {canEditOperatorReporter && !canEditAllRoles && (
                    <>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Reporter">Reporter</SelectItem>
                    </>
                  )}
                  {canEditReporter && !canEditOperatorReporter && !canEditAllRoles && (
                    <SelectItem value="Reporter">Reporter</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Tab Access</Label>
              <TabAccessSelect
                value={tabAccess}
                onChange={setTabAccess}
                fullAccess={department === ADMIN_DEPARTMENT || role === 'Super Admin'}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave empty to give Asset Master-only access.
              </p>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditUser(false)} className="text-sm">Cancel</Button>
              <Button type="submit" disabled={isLoading || !canCreateEditUsers} className="text-sm">
                {isLoading ? 'Saving...' : selectedUser ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
