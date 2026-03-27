import { usePresence, PresenceUser } from '@/hooks/usePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';

export const ActiveUsers = () => {
  const onlineUsers = usePresence();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {onlineUsers.length > 0 ? onlineUsers.length : '—'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-3 max-w-[280px]">
          <p className="text-xs font-semibold mb-2">
            Active Users ({onlineUsers.length})
          </p>
          {onlineUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Connecting...</p>
          ) : (
            <div className="space-y-2">
              {onlineUsers.map((u) => (
                <div key={u.email} className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={u.avatar_url} alt={u.name} />
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TooltipContent>
      </Tooltip>

      {onlineUsers.length > 0 && (
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((u) => (
            <Tooltip key={u.email}>
              <TooltipTrigger asChild>
                <div className="relative">
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
            <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-medium text-muted-foreground">+{onlineUsers.length - 5}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
