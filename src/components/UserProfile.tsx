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
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Settings, Edit, Trash, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const UserProfile = () => {
  const { user, signOut, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [openEditUser, setOpenEditUser] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [department, setDepartment] = useState(user?.user_metadata?.department || '');
  const [role, setRole] = useState('');
  const [accountType, setAccountType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
    setEmail(user?.email || '');
    setDepartment(user?.user_metadata?.department || '');
    checkAuthorization();
    fetchUsers();
  }, [user]);

  const checkAuthorization = async () => {
    if (user?.email) {
      const { data, error } = await supabase
        .from('users')
        .select('email, role')
        .eq('email', user.email)
        .single();
      if (data && !error) {
        setIsAuthorized(true);
        setUserRole(data.role);
        setRole(data.role);
      } else {
        setIsAuthorized(false);
        setUserRole(null);
        setRole('');
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateUser({ data: { full_name: fullName } });
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setFullName(session.session.user.user_metadata.full_name || '');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
      setOpenProfile(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateUser({ data: { department, role } });
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setDepartment(session.session.user.user_metadata.department || '');
        setRole(session.session.user.user_metadata.role || '');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setIsLoading(false);
      setOpenSettings(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (userRole !== 'Super Admin' && userRole !== 'Admin') return;
    setIsLoading(true);
    try {
      if (userRole === 'Admin' && (role === 'Super Admin' || role === 'Admin')) {
        setErrorMessage('Admins can only create users with Operator or Reporter roles.');
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'defaultPassword123',
        options: {
          data: {
            department,
            role,
            account_type: accountType || 'Standard',
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        const { error: insertError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          department,
          role,
          account_type: accountType || 'Standard',
        });
        if (insertError) throw insertError;
        await fetchUsers();
        alert('User created successfully! Please ask the new user to check their email and log in.');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setErrorMessage('Failed to create user. Please try again.');
    } finally {
      setIsLoading(false);
      if (!isLoading) {
        setOpenCreateUser(false);
        setEmail('');
        setDepartment('');
        setRole('');
        setAccountType('');
      }
    }
  };

  const handleEditUser = (user) => {
    if (userRole !== 'Super Admin' && userRole !== 'Admin') return;
    if (userRole === 'Admin' && (user.role === 'Super Admin' || user.role === 'Admin')) {
      setErrorMessage('Admins cannot edit Super Admin or Admin users.');
      return;
    }
    setSelectedUser(user);
    setEmail(user.email);
    setDepartment(user.department || '');
    setRole(user.role || '');
    setAccountType(user.account_type || '');
    setOpenEditUser(true);
    setIsFormSubmitted(false);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser || (userRole !== 'Super Admin' && userRole !== 'Admin')) return;

    if (userRole === 'Admin' && (selectedUser.role === 'Super Admin' || selectedUser.role === 'Admin')) {
      setErrorMessage('Admins cannot edit Super Admin or Admin users.');
      return;
    }

    if (userRole === 'Admin' && (role === 'Super Admin' || role === 'Admin')) {
      setErrorMessage('Admins can only assign Operator or Reporter roles.');
      return;
    }

    if (userRole === 'Admin' && selectedUser.id === user.id && role !== selectedUser.role) {
      setErrorMessage('Admins cannot change their own role.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setIsFormSubmitted(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          email,
          department,
          role: userRole === 'Admin' ? (selectedUser.id === user.id ? selectedUser.role : role) : role,
          account_type: accountType,
        })
        .eq('id', selectedUser.id);
      if (error) throw error;
      await fetchUsers();
      if (isFormSubmitted) {
        alert('User updated successfully!');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage('Failed to update user. Please try again.');
    } finally {
      setIsLoading(false);
      setOpenEditUser(false);
      setSelectedUser(null);
      setEmail('');
      setDepartment('');
      setRole('');
      setAccountType('');
      setIsFormSubmitted(false);
    }
  };

  const handleCancelEdit = () => {
    setOpenEditUser(false);
    setSelectedUser(null);
    setEmail('');
    setDepartment('');
    setRole('');
    setAccountType('');
    setErrorMessage('');
    setIsFormSubmitted(false);
  };

  const handleDeleteUser = async (id) => {
    if (userRole !== 'Super Admin' && userRole !== 'Admin') return;
    try {
      const { data: targetUser, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      if (userRole === 'Admin' && targetUser.role === 'Super Admin') {
        setErrorMessage('Admins cannot delete Super Admin users.');
        return;
      }

      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(user => user.id !== id));
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorMessage('Failed to delete user. Please try again.');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  if (!user) return <div className="text-sm">Please log in to access this page.</div>;
  if (!isAuthorized) return <div className="text-sm">Access denied. You are not an authorized user.</div>;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
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
                {user.user_metadata?.full_name || 'User'}
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
          <DropdownMenuItem onClick={() => setOpenSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>User Management</span>
          </DropdownMenuItem>
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
            {(userRole === 'Super Admin' || userRole === 'Admin') && (
              <Button 
                onClick={() => setOpenCreateUser(true)}
                className="ml-auto text-sm"
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
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="truncate text-sm">{user.email.split('@')[0]}</TableCell>
                        <TableCell className="truncate text-sm">{user.department}</TableCell>
                        <TableCell className="truncate text-sm">{user.email}</TableCell>
                        <TableCell className="truncate text-sm">{user.role}</TableCell>
                        <TableCell className="truncate text-sm">{user.account_type}</TableCell>
                        <TableCell className="flex space-x-2">
                          {(userRole === 'Super Admin' || (userRole === 'Admin' && user.role !== 'Super Admin' && user.role !== 'Admin')) ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditUser(user)}
                                disabled={userRole === 'Admin' && (user.role === 'Super Admin' || user.role === 'Admin')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">Read-only</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreateUser} onOpenChange={setOpenCreateUser}>
        <DialogContent className="max-w-[400px] max-h-[70vh] text-sm">
          <DialogHeader>
            <DialogTitle>Create new users</DialogTitle>
          </DialogHeader>
          {errorMessage && (
            <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
          )}
          <form onSubmit={handleCreateUser} className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
            <div>
              <Label htmlFor="accountType" className="text-sm">Account Type *</Label>
              <select id="accountType" className="w-full p-2 border rounded text-sm" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="">Select Account Type</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            <div>
              <Label htmlFor="email" className="text-sm">Email *</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="department" className="text-sm">Select Department *</Label>
              <select id="department" className="w-full p-2 border rounded text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select Department</option>
                <option value="Administrators">Administrators</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Technology Team">Technology Team</option>
                <option value="Production Team">Production Team</option>
                <option value="QA Team">QA Team</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>
            <div>
              <Label htmlFor="role" className="text-sm">Select role *</Label>
              <select id="role" className="w-full p-2 border rounded text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select Role</option>
                {userRole === 'Super Admin' && (
                  <>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                  </>
                )}
                <option value="Operator">Operator</option>
                <option value="Reporter">Reporter</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreateUser(false)} className="text-sm">Cancel</Button>
              <Button type="submit" disabled={isLoading} className="text-sm">
                {isLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditUser} onOpenChange={(open) => {
        if (!open) {
          handleCancelEdit();
        }
        setOpenEditUser(open);
      }}>
        <DialogContent className="max-w-[400px] max-h-[70vh] text-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {errorMessage && (
            <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
          )}
          <form onSubmit={handleSaveEdit} className="space-y-4 py-4 overflow-y-auto max-h-[50vh]">
            <div>
              <Label htmlFor="editEmail" className="text-sm">Email *</Label>
              <Input
                id="editEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="editDepartment" className="text-sm">Select Department *</Label>
              <select id="editDepartment" className="w-full p-2 border rounded text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select Department</option>
                <option value="Administrators">Administrators</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Technology Team">Technology Team</option>
                <option value="Production Team">Production Team</option>
                <option value="QA Team">QA Team</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>
            <div>
              <Label htmlFor="editRole" className="text-sm">Select role *</Label>
              <select id="editRole" className="w-full p-2 border rounded text-sm" value={role} onChange={(e) => setRole(e.target.value)} disabled={userRole === 'Admin' && selectedUser?.id === user.id}>
                <option value="">Select Role</option>
                {userRole === 'Super Admin' && (
                  <>
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                  </>
                )}
                <option value="Operator">Operator</option>
                <option value="Reporter">Reporter</option>
              </select>
            </div>
            <div>
              <Label htmlFor="editAccountType" className="text-sm">Account Type *</Label>
              <select id="editAccountType" className="w-full p-2 border rounded text-sm" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="">Select Account Type</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit} className="text-sm">Cancel</Button>
              <Button type="submit" disabled={isLoading} className="text-sm">
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};