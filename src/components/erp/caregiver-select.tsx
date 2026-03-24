'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { AppUser } from '@/lib/course-data';
import { Check, ChevronsUpDown, User, UserPlus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface CaregiverSelectProps {
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
}

export function CaregiverSelect({ value = [], onChange, disabled }: CaregiverSelectProps) {
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);

    // Fetch all users
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('email'));
    }, [firestore]);

    const { data: users, isLoading } = useCollection<AppUser>(usersQuery);

    const safeUsers = users || [];

    const handleSelect = (userId: string) => {
        const isSelected = value.includes(userId);
        if (isSelected) {
            onChange(value.filter(id => id !== userId));
        } else {
            onChange([...value, userId]);
        }
    };

    const handleRemove = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        onChange(value.filter(id => id !== userId));
    };

    const selectedUsers = safeUsers.filter(u => value.includes(u.uid) || value.includes(u.id));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full min-h-[2.5rem] h-auto rounded-xl justify-between bg-white border-slate-200 hover:bg-slate-50 transition-colors py-1 px-3 shadow-none text-left font-normal"
                >
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-4">
                        {value.length === 0 && <span key="placeholder" className="text-muted-foreground flex items-center gap-2"><UserPlus className="w-4 h-4 opacity-50"/> เพิ่มผู้ดูแล...</span>}
                        {selectedUsers.map(user => (
                            <Badge key={user.id || user.uid} variant="secondary" className="rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold px-2 py-0.5 whitespace-nowrap">
                                {user.nickname || user.displayName || user.email?.split('@')[0]}
                                <div 
                                    className="ml-1.5 p-0.5 rounded-full hover:bg-indigo-200 cursor-pointer block"
                                    onClick={(e) => handleRemove(e, user.uid)}
                                >
                                    <X className="w-3 h-3 text-indigo-900" />
                                </div>
                            </Badge>
                        ))}
                        {value.length > 0 && selectedUsers.length < value.length && (
                            <Badge key="unresolved" variant="secondary" className="rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                                +{value.length - selectedUsers.length} Unresolved
                            </Badge>
                        )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 absolute right-3" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 rounded-2xl" align="start">
                <Command className="rounded-2xl border-none">
                    <CommandInput placeholder="ค้นหารายชื่อทีมงาน..." className="h-11" />
                    <CommandList className="max-h-[250px] p-2 custom-scrollbar">
                        <CommandEmpty className="py-6 text-center text-sm">ไม่พบรายชื่อผู้ใช้</CommandEmpty>
                        <CommandGroup>
                            {isLoading ? (
                                <div className="text-center py-4 text-sm text-slate-500">กำลังโหลด...</div>
                            ) : (
                                safeUsers.map((user) => (
                                    <CommandItem
                                        key={user.id || user.uid}
                                        value={user.nickname || user.displayName || user.email}
                                        onSelect={() => handleSelect(user.uid)}
                                        className="rounded-xl my-1 cursor-pointer data-[selected]:bg-slate-100"
                                    >
                                        <div className="flex items-center w-full gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                ) : <User className="w-4 h-4 text-slate-400" />}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <div className="font-semibold text-sm">
                                                    {user.nickname ? `${user.nickname} (${user.displayName || 'No Name'})` : (user.displayName || 'No Name')}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                                            </div>
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0 text-emerald-500 transition-opacity",
                                                    value.includes(user.uid) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </div>
                                    </CommandItem>
                                ))
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
