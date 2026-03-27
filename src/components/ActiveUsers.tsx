import { useState } from 'react';
import { usePresence } from '@/hooks/usePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users } from 'lucide-react';

export const ActiveUsers = () => {
  const onlineUsers = usePresence();
  const [showDialog, setShowDialog] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Clickable presence badge */}
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border hover:bg-muted transition-colors cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            {onlineUsers.length}
          </span>
        </button>

        {/* Stacked avatars */}
        {onlineUsers.length > 0 && (
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 5).map((u) => (
              <Tooltip key={u.email}>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer" onClick={() => setShowDialog(true)}>
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={u.avatar_url} alt={u.name} />
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {u.name}
                </TooltipContent>
              </Tooltip>
            ))}
            {onlineUsers.length > 5 && (
              <div
                className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center cursor-pointer"
                onClick={() => setShowDialog(true)}
              >
                <span className="text-[10px] font-medium text-muted-foreground">+{onlineUsers.length - 5}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full user details dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[380px] text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users ({onlineUsers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {onlineUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No users online</p>
            ) : (
              onlineUsers.map((u) => (
                <div key={u.email} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatar_url} alt={u.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Online</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
