import { useState } from 'react';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users } from 'lucide-react';

export const ActiveUsers = () => {
  const { user } = useAuth();
  const { otherUsers, loading } = useActiveUsers();
  const [showDialog, setShowDialog] = useState(false);

  const getInitials = (name: string) =>
    (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground">...</div>;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border hover:bg-muted transition-colors cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{otherUsers.length}</span>
        </button>

        {otherUsers.length > 0 && (
          <div className="flex -space-x-2">
            {otherUsers.slice(0, 5).map((u) => (
              <Tooltip key={u.session_id}>
                <TooltipTrigger asChild>
                  <div onClick={() => setShowDialog(true)} className="cursor-pointer">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{u.full_name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Active Users ({otherUsers.length})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {otherUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No other users online</p>
            ) : (
              otherUsers.map((u) => (
                <div key={u.session_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar>
                    <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="ml-auto text-emerald-600 text-xs">Online</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};