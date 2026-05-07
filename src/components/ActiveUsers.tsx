import { useState } from 'react';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users } from 'lucide-react';

export const ActiveUsers = () => {
  const { user } = useAuth();
  const { activeUsers, loading } = useActiveUsers();
  const [showPopover, setShowPopover] = useState(false);

  const getInitials = (name: string) =>
    (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground">...</div>;
  }

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors cursor-pointer">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">{activeUsers.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <h3 className="text-base font-semibold mb-1">Online Users</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {activeUsers.length} currently active
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {activeUsers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No other users online</p>
            ) : (
              activeUsers.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold">{getInitials(u.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate">
                      {u.full_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5" title={u.email}>
                      {u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pr-1">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">Online</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};