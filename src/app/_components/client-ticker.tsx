'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Client } from '@/lib/course-data';

interface ClientLogoTickerProps {
    clients: Client[];
}

export function ClientLogoTicker({ clients = [] }: ClientLogoTickerProps) {
  // Filter only clients that should be shown on home and have a logo
  const displayClients = clients.filter(c => c.showOnHome && c.logo);
  
  // If we don't have enough logos, create a few fillers or duplicates to keep the scroll smooth
  const items = displayClients.length >= 6 
    ? displayClients 
    : [...displayClients, ...displayClients, ...displayClients].slice(0, 8);

  if (items.length === 0) return null;

  return (
    <div className="py-12 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900 overflow-hidden flex">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col shrink-0 text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Our Partners</span>
              <h3 className="text-sm font-bold text-slate-400 whitespace-nowrap">ได้รับความไว้วางใจจากองค์กรชั้นนำ</h3>
          </div>
          
          <div className="flex overflow-hidden relative w-full mask-gradient-x py-2">
             <motion.div
                className="flex gap-16 pr-16 items-center"
                animate={{
                    x: ["0%", "-50%"],
                }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: 40,
                        ease: "linear",
                    },
                }}
             >
                {[...items, ...items].map((client, index) => (
                    <div key={`${client.id}-${index}`} className="flex items-center justify-center min-w-[140px] h-16 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer group">
                        {client.logo ? (
                            <div className="relative w-32 h-12 transform group-hover:scale-110 transition-transform">
                                <Image
                                    src={client.logo}
                                    alt={client.companyName}
                                    fill
                                    className="object-contain"
                                    data-ai-hint={client.hint || "company logo"}
                                />
                            </div>
                        ) : (
                            <div className="px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-400">
                                {client.companyName}
                            </div>
                        )}
                    </div>
                ))}
             </motion.div>
          </div>
      </div>
    </div>
  );
}
