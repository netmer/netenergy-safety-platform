

'use client';

import Image from 'next/image';
import { File as FileIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function DocumentThumbnail({ fileUrl, fileName }: { fileUrl: string, fileName: string }) {
    const isImage = /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(fileUrl);
    const isPdf = /\.pdf(\?|$)/i.test(fileUrl);

    if (isImage) {
        return (
             <Dialog>
                <DialogTrigger asChild>
                    <Image src={fileUrl} alt={fileName} width={80} height={80} className="object-cover rounded-md border w-20 h-20 cursor-pointer" />
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-2">
                     <DialogTitle className="sr-only">{fileName}</DialogTitle>
                     <Image
                        src={fileUrl}
                        alt={fileName}
                        width={1200}
                        height={800}
                        className="rounded-md object-contain max-h-[80vh] w-full"
                    />
                </DialogContent>
            </Dialog>
        );
    }
    if (isPdf) {
        return (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-20 h-20 bg-red-100 text-red-700 flex flex-col items-center justify-center rounded-md border border-red-200 hover:opacity-80 transition-opacity">
                <FileIcon className="w-8 h-8" />
                <span className="text-xs font-bold">PDF</span>
            </a>
        );
    }
    return (
         <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="w-20 h-20 bg-muted flex items-center justify-center rounded-md border hover:opacity-80 transition-opacity">
            <FileIcon className="w-8 h-8 text-muted-foreground" />
        </a>
    );
}
