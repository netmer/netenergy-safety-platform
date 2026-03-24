'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const testimonials = [
  {
    name: "คุณสมชาย ใจดี",
    role: "ผู้จัดการฝ่ายความปลอดภัย",
    company: "บริษัท อุตสาหกรรมไทย จำกัด",
    content: "หลักสูตรมีความทันสมัย วิทยากรมีความเชี่ยวชาญสูง สามารถนำความรู้ไปประยุกต์ใช้ได้จริงในโรงงาน ช่วยลดอุบัติเหตุได้เป็นอย่างมาก",
    rating: 5,
    image: "/avatars/somchai.jpg"
  },
  {
    name: "คุณวิภาดา รักงาน",
    role: "HR Manager",
    company: "บริษัท โลจิสติกส์ เซ็นเตอร์ จำกัด",
    content: "ระบบการจองและการจัดการเอกสารดีเยี่ยม ทีมงาน Support ให้ความช่วยเหลืออย่างรวดเร็ว ประทับใจในการบริการมากค่ะ",
    rating: 5,
    image: "/avatars/wipada.jpg"
  },
  {
    name: "คุณเอกชัย มั่นคง",
    role: "Safety Officer",
    company: "บริษัท ก่อสร้างพัฒนา จำกัด",
    content: "การฝึกอบรมภาคปฏิบัติเข้มข้น อุปกรณ์ครบครัน ทำให้พนักงานมีความมั่นใจในการทำงานมากขึ้น แนะนำเลยครับ",
    rating: 5,
    image: "/avatars/ekkachai.jpg"
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950/50 relative overflow-hidden">
       {/* Background Pattern */}
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
           }}
       />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium mb-4"
          >
            <Star className="w-4 h-4 mr-2 fill-yellow-500 text-yellow-500" />
            เสียงตอบรับจากลูกค้า
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            ความไว้วางใจที่คุณมอบให้
          </motion.h2>
          <motion.p
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ delay: 0.2 }}
             className="text-muted-foreground max-w-2xl mx-auto"
          >
            เราภูมิใจที่ได้เป็นส่วนหนึ่งในการสร้างความปลอดภัยให้กับองค์กรชั้นนำทั่วประเทศ
          </motion.p>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8">
             <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {testimonials.map((item, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <div className="p-1 h-full">
                        <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                        <CardContent className="flex flex-col p-8 h-full">
                            <div className="flex mb-6">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-5 h-5 ${i < item.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                                ))}
                            </div>
                            <p className="text-base md:text-lg text-muted-foreground mb-8 flex-grow italic leading-relaxed">"{item.content}"</p>
                            <div className="flex items-center mt-auto pt-6 border-t border-border/50">
                                <Avatar className="h-12 w-12 mr-4 border-2 border-white shadow-sm">
                                    <AvatarImage src={item.image} alt={item.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary">{item.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-base font-bold leading-none text-foreground">{item.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{item.company}</p>
                                </div>
                            </div>
                        </CardContent>
                        </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="hidden md:block">
                  <CarouselPrevious className="-left-4 border border-border bg-background/50 hover:bg-background text-muted-foreground hover:text-primary shadow-sm" />
                  <CarouselNext className="-right-4 border border-border bg-background/50 hover:bg-background text-muted-foreground hover:text-primary shadow-sm" />
              </div>
            </Carousel>
        </div>
      </div>
    </section>
  );
}
