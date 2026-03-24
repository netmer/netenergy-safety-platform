'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Facebook, ExternalLink, MessageCircle, Loader2, Navigation, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

export function SocialSection() {
  const [shouldLoadContent, setShouldLoadContent] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(500);
  const sectionRef = useRef<HTMLElement>(null);
  const fbContainerRef = useRef<HTMLDivElement>(null);

  // Correct canonical Facebook page URL
  const FB_PAGE_URL = "https://www.facebook.com/profile.php?id=100057260297167";

  // Intersection Observer for lazy loading content to improve page speed
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadContent(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Resize Observer to dynamically adjust iframe width for mobile responsiveness
  useEffect(() => {
    if (!fbContainerRef.current || !shouldLoadContent) return;

    const updateWidth = () => {
      if (fbContainerRef.current) {
        const newWidth = Math.min(Math.max(fbContainerRef.current.offsetWidth, 180), 500);
        // Only update if the width difference is significant to avoid rapid reloads
        setContainerWidth((prev) => Math.abs(prev - newWidth) > 10 ? Math.floor(newWidth) : prev);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(fbContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [shouldLoadContent]);

  // Reset loading state when source changes
  useEffect(() => {
    setIsIframeLoaded(false);
  }, [containerWidth]);

  // Dynamic iframe source based on container width
  const iframeSrc = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE_URL)}&tabs=timeline&width=${containerWidth}&height=600&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`;

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900/50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 dark:bg-primary/5 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-headline text-slate-900 dark:text-white">ติดต่อและติดตามเรา</h2>
            <p className="text-muted-foreground text-sm md:text-base font-light">เยี่ยมชมสำนักงานของเรา หรือติดตามข่าวสารและกิจกรรมล่าสุดผ่านช่องทางโซเชีลมีเดีย</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-stretch">
          
          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col h-full"
          >
            <div className="mb-4 md:mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <MapPin className="w-3.5 h-3.5" />
                สำนักงานใหญ่
              </div>
              <h3 className="text-2xl font-bold mb-2 font-headline text-slate-900 dark:text-white">แวะมาพูดคุยกับเรา</h3>
              <p className="text-muted-foreground text-sm font-light">บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด จ.นนทบุรี</p>
            </div>
            
            <Card className="flex-grow overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none min-h-[400px] md:min-h-[600px] group bg-white dark:bg-slate-900 flex flex-col relative">
              {shouldLoadContent ? (
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3873.341414441414!2d100.5284144!3d13.9114144!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e2849666666667%3A0x1234567890abcdef!2zNDQvOTkgTeG7pSA5LCBCYW5nIFBodXQsIFBhayBLcmV0LCBOb250aGFidXJpIDExMTIw!5e0!3m2!1sth!2sth!4v1710000000000!5m2!1sth!2sth" 
                  className="w-full h-full border-0 opacity-90 transition-opacity duration-500 flex-grow grayscale-[20%] group-hover:grayscale-0" 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              ) : (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800/50 animate-pulse flex flex-col items-center justify-center flex-grow">
                  <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <span className="text-xs text-slate-400">กำลังโหลดแผนที่...</span>
                </div>
              )}
              
              {/* Overlay button for mobile to prevent scroll trapping */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none flex justify-center">
                <Button className="pointer-events-auto rounded-full shadow-lg gap-2" size="sm" asChild>
                    <Link href="https://share.google/tHlziaefKmR7WTeSp" target="_blank">
                        <Navigation className="w-4 h-4" /> นำทางด้วย Google Maps
                    </Link>
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Facebook Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col h-full"
          >
            <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold mb-3 dark:bg-blue-900/30 dark:text-blue-400">
                  <Facebook className="w-3.5 h-3.5" />
                  Social Media
                </div>
                <h3 className="text-2xl font-bold mb-2 font-headline text-slate-900 dark:text-white">อัปเดตกิจกรรมล่าสุด</h3>
                <p className="text-muted-foreground text-sm font-light">ข่าวสารและสาระน่ารู้ด้านความปลอดภัยจากเพจ</p>
              </div>
              
              <Button variant="outline" size="sm" className="hidden sm:flex text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20" asChild>
                  <Link href={FB_PAGE_URL} target="_blank">
                      <MousePointerClick className="w-4 h-4 mr-2" /> ไปที่หน้าเพจ
                  </Link>
              </Button>
            </div>

            <Card className="flex-grow overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-lg shadow-blue-500/5 dark:shadow-none bg-white dark:bg-slate-900 min-h-[500px] md:min-h-[600px] flex flex-col">
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#1877F2] to-[#166FE5] text-white flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg shadow-inner">
                            <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm sm:text-base leading-tight">เนเชอรัล เอ็นเนอร์ยี เทค</span>
                          <span className="text-[10px] sm:text-xs text-blue-100">Official Page</span>
                        </div>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="bg-white text-[#1877F2] hover:bg-slate-50 border-0 h-8 text-xs sm:text-sm px-3">
                        <Link href="https://line.me/ti/p/~@net10" target="_blank">
                            <MessageCircle className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">ทัก LINE</span>
                        </Link>
                    </Button>
                </div>
                
                <CardContent 
                  ref={fbContainerRef} 
                  className="p-0 flex-grow flex flex-col bg-slate-50 dark:bg-slate-900 relative overflow-hidden"
                >
                    {shouldLoadContent ? (
                       <div className="w-full h-full flex justify-center bg-white dark:bg-slate-900 overflow-hidden">
                           <iframe 
                              src={iframeSrc}
                              width={containerWidth} 
                              height="600" 
                              style={{
                                border: 'none', 
                                overflow: 'hidden', 
                                width: '100%', 
                                maxWidth: '500px', 
                                height: '100%', 
                                minHeight: '600px'
                              }} 
                              scrolling="yes" 
                              frameBorder="0" 
                              allowFullScreen={true} 
                              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                              className="bg-white dark:bg-slate-900 transition-opacity duration-300"
                              onLoad={() => setIsIframeLoaded(true)}
                           ></iframe>
                           
                           {!isIframeLoaded && (
                              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                                <Loader2 className="w-8 h-8 animate-spin text-[#1877F2]" />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">กำลังเชื่อมต่อกับ Facebook...</span>
                              </div>
                           )}
                       </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900">
                        <Facebook className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                        <span className="text-slate-400 text-sm">เตรียมโหลดข้อมูล...</span>
                      </div>
                    )}
                </CardContent>
                
                {/* Mobile specific footer button */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sm:hidden flex justify-center">
                   <Button variant="ghost" size="sm" className="text-[#1877F2] w-full" asChild>
                      <Link href={FB_PAGE_URL} target="_blank">
                          เปิดในแอป Facebook <ExternalLink className="w-3.5 h-3.5 ml-2" />
                      </Link>
                   </Button>
                </div>
            </Card>
          </motion.div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(203, 213, 225, 0.8);
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(51, 65, 85, 0.8);
        }
      `}} />
    </section>
  );
}
