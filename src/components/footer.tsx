import Link from 'next/link';
import { Phone, MapPin } from 'lucide-react';
import { LineIcon } from '@/components/icons/line-icon';


export function Footer() {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="container py-12 text-secondary-foreground">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold">บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด (สำนักงานใหญ่)</h3>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-1 shrink-0 text-primary" />
              <p className="text-sm">
                44/99 หมู่ที่ 9 ตำบลบางพูด อำเภอปากเกร็ด
                <br />
                จังหวัดนนทบุรี 11120
              </p>
            </div>
             <p className="text-sm text-muted-foreground pt-4">
              © {new Date().getFullYear()} NetEnergy Tech. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">ลิงก์ด่วน</h3>
            <nav className="flex flex-col space-y-2">
               <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  เกี่ยวกับเรา
              </Link>
              <Link href="/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                หลักสูตรทั้งหมด
              </Link>
               <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  ข่าวสาร
              </Link>
              <Link href="/request-quote" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ขอใบเสนอราคา
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                ติดต่อเรา
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">ติดต่อเรา</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <div className="text-sm text-muted-foreground">
                    <p>0-2582-2111</p>
                    <p>0-2582-1138-40</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LineIcon />
                <a href="https://line.me/ti/p/~@net10" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  @net10
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
