// UserProfile.tsx (corrected - include id from auth.users)
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Settings, Edit, Trash, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  department?: string;
  role?: 'Super Admin' | 'Admin' | 'Operator' | 'Reporter';
  account_type?: string;
}

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
  const [accountType, setAccountType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setEmail(user?.email || '');
    setDepartment(user?.user_metadata?.department || '');
    checkAuthorization();
  }, [user]);

  const checkAuthorization = async () => {
    if (!user?.email) {
      setIsAuthorized(false);
      setUserRole(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, role, account_type')
        .eq('email', user.email)
        .single();
      if (data && !error) {
        setIsAuthorized(true);
        setUserRole(data.role);
        setAccountType(data.account_type || '0');
      } else {
        console.warn('Authorization failed:', error?.message);
        setIsAuthorized(false);
        setUserRole(null);
        setAccountType('0');
      }
    } catch (err) {
      console.error('Authorization check error:', err);
      setIsAuthorized(false);
      setUserRole(null);
      setAccountType('0');
    }
  };

  const fetchUsers = async () => {
    if (!isAuthorized || !['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
      setUsers([]);
      return;
    }
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Error fetching users (likely RLS):', error);
        setUsers([]);
        return;
      }
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
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
      console.error('Failed to update profile:', error);
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setOpenProfile(false);
    }
  };

  const handleEditUser = (user: AppUser) => {
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && !(userRole === 'Operator' && user.role === 'Reporter')) {
      toast({ title: 'Access Denied', description: 'You do not have permission to edit this user.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && ['Super Admin', 'Admin'].includes(user.role || '')) {
      setErrorMessage('Admins cannot edit Super Admin or Admin users.');
      toast({ title: 'Access Denied', description: setErrorMessage, variant: 'destructive' });
      return;
    }
    setSelectedUser(user);
    setEmail(user.email);
    setFullName(user.full_name || '');
    setDepartment(user.department || '');
    setRole(user.role || '');
    setAccountType(user.account_type || '');
    setOpenEditUser(true);
    setErrorMessage('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !['Super Admin', 'Admin'].includes(userRole || '')) {
      toast({ title: 'Access Denied', description: 'You do not have permission to edit users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && !['Operator', 'Reporter'].includes(selectedUser.role || '')) {
      setErrorMessage('Admins can only edit Operator or Reporter users.');
      return;
    }
    if (userRole === 'Admin' && selectedUser.id === user?.id && role !== selectedUser.role) {
      setErrorMessage('Admins cannot change their own role.');
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
          account_type: accountType,
        })
        .eq('id', selectedUser.id);
      if (error) throw error;
      await fetchUsers();
      toast({ title: 'Success', description: 'User updated successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage('Failed to update user. Please try again.');
    } finally {
      setIsLoading(false);
      setOpenEditUser(false);
      setSelectedUser(null);
      resetForm();
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
      toast({ title: 'Access Denied', description: 'You do not have permission to delete users.', variant: 'destructive' });
      return;
    }
    try {
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;
      if (userRole === 'Admin' && ['Super Admin', 'Admin'].includes(targetUser.role)) {
        setErrorMessage('Admins cannot delete Super Admin or Admin users.');
        toast({ title: 'Access Denied', description: setErrorMessage, variant: 'destructive' });
        return;
      }
      if (userRole === 'Operator' && targetUser.role !== 'Reporter') {
        setErrorMessage('Operators can only delete Reporters.');
        toast({ title: 'Access Denied', description: setErrorMessage, variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
      toast({ title: 'Success', description: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorMessage('Failed to delete user. Please try again.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!['Super Admin', 'Admin', 'Operator'].includes(userRole || '')) {
      toast({ title: 'Access Denied', description: 'You do not have permission to create users.', variant: 'destructive' });
      return;
    }
    if (userRole === 'Admin' && !['Operator', 'Reporter'].includes(role)) {
      setErrorMessage('Admins can only create Operator or Reporter users.');
      return;
    }
    if (userRole === 'Operator' && role !== 'Reporter') {
      setErrorMessage('Operators can only create Reporters.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!fullName) {
      setErrorMessage('Please enter a full name.');
      return;
    }
    if (!department) {
      setErrorMessage('Please select a department.');
      return;
    }
    if (!role) {
      setErrorMessage('Please select a role.');
      return;
    }
    if (!accountType) {
      setErrorMessage('Please select an account type.');
      return;
    }
    setIsLoading(true);
    try {
      // Check if user already exists in public.users
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw checkError;
      }
      if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      // Check if user exists in auth.users
      const { data: authUser, error: authCheckError } = await supabase.rpc('get_user_by_email', { email_param: email });
      if (authCheckError) throw authCheckError;

      let userId: string;
      if (authUser && authUser.length > 0) {
        // User exists in auth.users, use that id
        userId = authUser[0].id;
        toast({ title: 'Info', description: `User with email "${email}" already exists in auth. Linking profile.` });
      } else {
        // User does not exist in auth.users yet - they will create it on first login
        // Generate a placeholder UUID for now (will be updated on first login via trigger if set up)
        // But to avoid null constraint, use a generated UUID
        userId = crypto.randomUUID();
        toast({ title: 'Info', description: `Profile created for "${email}". User needs to log in first to link auth ID.` });
      }

      // Insert into public.users with the id
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: fullName,
          department,
          role,
          account_type: accountType,
        });
      if (insertError) throw insertError;

      toast({ 
        title: 'Success', 
        description: `User "${fullName}" added successfully. They need to log in with Google to activate their account.` 
      });
      await fetchUsers();
      setOpenEditUser(false);
      resetForm();
    } catch (error) {
      console.error('Error creating user:', error);
      setErrorMessage(`Failed to create user: ${error.message || 'Unknown error. Check console for details.'}`);
      toast({ 
        title: 'Error', 
        description: `Failed to create user: ${error.message || 'Please try again.'}`, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setDepartment('Administrators');
    setRole(userRole === 'Operator' ? 'Reporter' : 'Operator');
    setAccountType('0');
    setErrorMessage('');
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
  if (!isAuthorized) return null; // Handled by ProtectedRoute

  const departments = [
    'Administrators',
    'Customer Support',
    'Technology Team',
    'Production Team',
    'QA Team',
    'DevOps',
  ];

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
          {['Super Admin', 'Admin', 'Operator'].includes(userRole || '') && (
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
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        <DialogContent className="max-w-[90vw] w-[900px] text-sm">
          <DialogHeader className="flex justify-between items-center">
            <div>
              <DialogTitle>User Management</DialogTitle>
              <DialogDescription>Manage user details.</DialogDescription>
            </div>
            {['Super Admin', 'Admin', 'Operator'].includes(userRole || '') && (
              <Button 
                onClick={() => setOpenEditUser(true)}
                className="ml-auto text-sm"
                disabled={userRole === 'Reporter'}
              >
                Add new users
              </Button>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => setSearchQuery('')}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {errorMessage && (
              <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
            )}
            <div className="relative">
              <div className="max-h-[40vh] overflow-y-auto">
                <Table className="w-full table-fixed text-sm">
                  <TableHeader className="sticky top-0 bg-gray-100 z-10">
                    <TableRow>
                      <TableHead className="w-[150px] font-medium">Name</TableHead>
                      <TableHead className="w-[150px] font-medium">Department</TableHead>
                      <TableHead className="w-[200px] font-medium">Email</TableHead>
                      <TableHead className="w-[120px] font-medium">Role</TableHead>
                      <TableHead className="w-[120px] font-medium">Account Type</TableHead>
                      <TableHead className="w-[100px] font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No users found or access denied (check role).
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="truncate text-sm">{user.full_name || user.email.split('@')[0]}</TableCell>
                          <TableCell className="truncate text-sm">{user.department || 'N/A'}</TableCell>
                          <TableCell className="truncate text-sm">{user.email}</TableCell>
                          <TableCell className="truncate text-sm">{user.role || 'N/A'}</TableCell>
                          <TableCell className="truncate text-sm">{user.account_type || 'N/A'}</TableCell>
                          <TableCell className="flex space-x-2">
                            {(userRole === 'Super Admin' || (userRole === 'Admin' && ['Operator', 'Reporter'].includes(user.role || ''))) ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditUser(user)}
                                disabled={userRole === 'Admin' && ['Super Admin', 'Admin'].includes(user.role || '')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : userRole === 'Operator' && user.role === 'Reporter' ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">Read-only</span>
                            )}
                            {(userRole === 'Super Admin' || (userRole === 'Admin' && !['Super Admin', 'Admin'].includes(user.role || ''))) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
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
          {errorMessage && (
            <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
          )}
          <form onSubmit={selectedUser ? handleSaveEdit : handleCreateUser} className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
            <div>
              <Label htmlFor="editEmail" className="text-sm">Email *</Label>
              <Input
                id="editEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
                disabled={!!selectedUser}
              />
            </div>
            <div>
              <Label htmlFor="editFullName" className="text-sm">Full Name *</Label>
              <Input
                id="editFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="editDepartment" className="text-sm">Select Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editRole" className="text-sm">Select role *</Label>
              <Select value={role} onValueChange={setRole} disabled={!!selectedUser && userRole !== 'Super Admin'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {userRole === 'Super Admin' && (
                    <>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Reporter">Reporter</SelectItem>
                    </>
                  )}
                  {userRole === 'Admin' && (
                    <>
                      <SelectItem value="Operator">Operator</SelectItem>
                      <SelectItem value="Reporter">Reporter</SelectItem>
                    </>
                  )}
                  {userRole === 'Operator' && (
                    <SelectItem value="Reporter">Reporter</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editAccountType" className="text-sm">Account Type *</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditUser(false)} className="text-sm">Cancel</Button>
              <Button type="submit" disabled={isLoading} className="text-sm">
                {isLoading ? 'Saving...' : (selectedUser ? 'Save' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};