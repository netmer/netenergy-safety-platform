'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import { useCardReader, type ThaiIdCardData } from '@/hooks/use-card-reader';
import { CardReaderInstallDialog } from '@/components/erp/card-reader-install-dialog';
import { cn } from '@/lib/utils';

interface CardReaderButtonProps {
    onCardRead: (data: ThaiIdCardData) => void;
    onError?: (message: string) => void;
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'default';
}

export function CardReaderButton({
    onCardRead,
    onError,
    disabled = false,
    className,
    size = 'sm',
}: CardReaderButtonProps) {
    const { status, readState, readCard, isOutdated } = useCardReader();
    const [dialogReason, setDialogReason] = useState<'disconnected' | 'no_reader' | 'outdated' | null>(null);

    const handleClick = async () => {
        if (isOutdated) {
            setDialogReason('outdated');
            return;
        }

        if (status === 'checking') {
            setDialogReason('disconnected');
            return;
        }

        if (status === 'disconnected') {
            setDialogReason('disconnected');
            return;
        }

        // ถ้าไม่มีเครื่องอ่านบัตร → แสดง dialog แนะนำ
        if (status === 'no_reader') {
            setDialogReason('no_reader');
            return;
        }

        // พร้อมอ่าน
        try {
            const data = await readCard();
            onCardRead(data);
        } catch (e: any) {
            onError?.(e.message);
        }
    };

    // สถานะ: อ่านสำเร็จ (แสดงสั้นๆ)
    if (readState === 'success') {
        return (
            <div className={cn('flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700', className)}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                อ่านบัตรสำเร็จ!
            </div>
        );
    }

    const isReady = status === 'connected';

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size={size}
                className={cn(
                    'font-bold gap-1.5',
                    isReady
                        ? 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300'
                        : 'border-slate-200 text-slate-400 bg-slate-50 hover:bg-slate-100',
                    readState === 'reading' && 'opacity-80 cursor-not-allowed',
                    className
                )}
                disabled={disabled || readState === 'reading'}
                onClick={handleClick}
            >
                {readState === 'reading' ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังอ่านบัตร...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-4 h-4" />
                        อ่านบัตร ปชช.
                    </>
                )}
            </Button>

            {dialogReason && (
                <CardReaderInstallDialog
                    open
                    reason={dialogReason}
                    onClose={() => setDialogReason(null)}
                />
            )}
        </>
    );
}
