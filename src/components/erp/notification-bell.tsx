'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import type { AppNotification } from '@/lib/course-data';
import { Bell, Info, CheckCircle, AlertTriangle, XCircle, Megaphone, BellRing, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

const iconMap = {
    info: <Info className="w-5 h-5 text-blue-500" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    important: <Megaphone className="w-5 h-5 text-purple-500" />
};

export function NotificationBell() {
    const { profile } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const initialLoadRef = useRef(true);

    useEffect(() => {
        // Only ask for notification permission if not denied
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
        // Sound notification disabled (no audio file available)
    }, []);

    useEffect(() => {
        if (!firestore || !profile?.role) return;

        // Listen for notifications targeted at this user's role or 'all'
        const q = query(
            collection(firestore, 'notifications'),
            where('forRole', 'in', [profile.role, 'all']),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifs: AppNotification[] = [];
            let newUnreadCount = 0;
            let hasFreshUnread = false;

            snapshot.forEach((doc) => {
                const data = doc.data() as AppNotification;
                newNotifs.push({ ...data, id: doc.id });
                
                if (!data.read) {
                    newUnreadCount++;
                    // Check if this is a newly added notification (not from initial load)
                    if (doc.metadata.hasPendingWrites === false && !initialLoadRef.current) {
                        hasFreshUnread = true;
                        
                        // 1. Show In-App Toast
                        toast({
                            title: data.title,
                            description: data.message,
                            duration: 5000,
                            variant: data.type === 'error' ? 'destructive' : 'default',
                            className: data.type === 'important' ? "bg-purple-600 text-white border-purple-700" : ""
                        });

                        // 2. Show Browser Desktop Notification
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                            new Notification(data.title, {
                                body: data.message,
                                icon: '/images/logo.png' // fallback icon
                            });
                        }
                    }
                }
            });

            // Play sound if there's a fresh unread notification
            if (hasFreshUnread && audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio play prevented by browser', e));
            }

            setNotifications(newNotifs);
            setUnreadCount(newUnreadCount);
            
            if (initialLoadRef.current) {
                initialLoadRef.current = false;
            }
        });

        return () => unsubscribe();
    }, [firestore, profile, toast]);

    const markAsRead = async (id: string) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'notifications', id), { read: true });
        } catch (e) {
            console.error(e);
        }
    };

    const markAllAsRead = async () => {
        if (!firestore || unreadCount === 0) return;
        const unreadDocs = notifications.filter(n => !n.read);
        for (const unread of unreadDocs) {
            updateDoc(doc(firestore, 'notifications', unread.id), { read: true }).catch(e => console.error(e));
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1.5 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center text-[9px] font-bold text-white border-2 border-white dark:border-slate-950">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96 p-0 rounded-3xl overflow-hidden shadow-2xl border-slate-100 dark:border-slate-800 z-[150]">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <BellRing className="w-5 h-5" />
                        <h4 className="font-bold">การแจ้งเตือน</h4>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs font-medium text-white/80 hover:text-white hover:bg-white/20 rounded-xl">
                            <Check className="w-3.5 h-3.5 mr-1" /> อ่านทั้งหมด
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[400px] w-full bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="flex flex-col">
                        {notifications.length > 0 ? notifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => !notif.read && markAsRead(notif.id)}
                                className={cn(
                                    "flex gap-3 p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer",
                                    !notif.read ? "bg-white dark:bg-slate-950" : "opacity-60 grayscale-[30%] bg-transparent"
                                )}
                            >
                                <div className="shrink-0 mt-0.5">
                                    {iconMap[notif.type] || iconMap.info}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <p className={cn("text-sm transition-colors", !notif.read ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300")}>
                                            {notif.title}
                                            {!notif.read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-2" />}
                                        </p>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-[95%]">{notif.message}</p>
                                    
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: th })}
                                        </span>
                                        {notif.link && (
                                            <Button asChild variant="link" size="sm" className="h-auto p-0 text-[11px] font-bold text-blue-600">
                                                <Link href={notif.link} onClick={() => markAsRead(notif.id)}>เรียกดูข้อมูล &rarr;</Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center p-10 h-full text-center opacity-50">
                                <Bell className="w-10 h-10 mb-3 text-slate-400" />
                                <p className="font-bold text-slate-600">ไม่มีการแจ้งเตือน</p>
                                <p className="text-xs mt-1 text-slate-400">คุณอัปเดตข้อมูลครบถ้วนแล้ว</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-2 border-t bg-white dark:bg-slate-950">
                    <Button variant="ghost" className="w-full text-xs font-semibold rounded-xl text-muted-foreground hover:text-primary">
                        ดูการตั้งค่าการแจ้งเตือน
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

