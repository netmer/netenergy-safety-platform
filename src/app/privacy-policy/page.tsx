import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว | NET Safety Platform',
  description: 'นโยบายความเป็นส่วนตัวและการใช้คุกกี้ของ NET Safety Platform บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4">

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            ข้อมูลสำคัญ
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight mb-4">
            นโยบายความเป็นส่วนตัว
          </h1>
          <p className="text-muted-foreground text-sm">
            มีผลบังคับใช้ตั้งแต่วันที่ 1 มกราคม 2568 | บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-10">

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">1. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              เราเก็บรวบรวมข้อมูลที่จำเป็นเพื่อให้บริการแก่ท่าน ได้แก่:
            </p>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc list-inside">
              <li>ข้อมูลที่ท่านให้โดยตรง เช่น ชื่อ อีเมล หมายเลขโทรศัพท์ เมื่อสมัครสมาชิกหรือกรอกแบบฟอร์มติดต่อ</li>
              <li>ข้อมูลการใช้งานเว็บไซต์ เช่น หน้าที่เข้าชม เวลาที่ใช้งาน และการโต้ตอบกับเนื้อหา</li>
              <li>ข้อมูลอุปกรณ์และเบราว์เซอร์ เช่น IP address, ประเภทเบราว์เซอร์, ระบบปฏิบัติการ</li>
              <li>คุกกี้และเทคโนโลยีที่คล้ายคลึงกัน (รายละเอียดในหัวข้อ 3)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              เราใช้ข้อมูลของท่านเพื่อวัตถุประสงค์ดังต่อไปนี้:
            </p>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc list-inside">
              <li>ให้บริการและปรับปรุงประสบการณ์การใช้งานเว็บไซต์</li>
              <li>ติดต่อสื่อสารเกี่ยวกับบริการ หลักสูตร และข้อเสนอที่เกี่ยวข้อง</li>
              <li>วิเคราะห์การใช้งานเว็บไซต์เพื่อพัฒนาคุณภาพบริการ</li>
              <li>ปฏิบัติตามข้อกำหนดทางกฎหมายและข้อบังคับที่เกี่ยวข้อง</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">3. การใช้คุกกี้</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              เว็บไซต์ของเราใช้คุกกี้เพื่อให้บริการที่ดีขึ้น โดยแบ่งประเภทดังนี้:
            </p>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm mb-1">คุกกี้ที่จำเป็น (Necessary Cookies)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  จำเป็นต่อการทำงานของเว็บไซต์ ไม่สามารถปิดได้ เช่น คุกกี้สำหรับการล็อกอิน ความปลอดภัย และการตั้งค่าเว็บไซต์
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm mb-1">คุกกี้เพื่อการวิเคราะห์ (Analytics Cookies)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ช่วยให้เราเข้าใจวิธีที่ผู้เยี่ยมชมใช้งานเว็บไซต์ เพื่อนำข้อมูลไปปรับปรุงประสิทธิภาพ โดยข้อมูลทั้งหมดจะถูกรวบรวมในรูปแบบที่ไม่ระบุตัวตน
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm mb-1">คุกกี้เพื่อการทำงาน (Functional Cookies)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ช่วยจดจำการตั้งค่าและความชอบของท่าน เช่น ภาษา และธีมสี เพื่อมอบประสบการณ์ที่เป็นส่วนตัวมากขึ้น
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">4. การแบ่งปันข้อมูล</h2>
            <p className="text-muted-foreground leading-relaxed">
              เราไม่ขาย ไม่แลกเปลี่ยน หรือถ่ายโอนข้อมูลส่วนบุคคลของท่านให้กับบุคคลภายนอก เว้นแต่จะได้รับความยินยอมจากท่าน หรือเป็นไปตามข้อกำหนดทางกฎหมาย หรือเพื่อให้บริการผ่านผู้ให้บริการที่เชื่อถือได้ซึ่งตกลงรักษาความลับข้อมูล
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">5. สิทธิ์ของท่าน</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) ท่านมีสิทธิ์ดังต่อไปนี้:</p>
            <ul className="space-y-2 text-muted-foreground text-sm list-disc list-inside">
              <li>สิทธิ์ในการเข้าถึงข้อมูลส่วนบุคคลของท่าน</li>
              <li>สิทธิ์ในการแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li>สิทธิ์ในการลบข้อมูล ("สิทธิ์ที่จะถูกลืม")</li>
              <li>สิทธิ์ในการคัดค้านการประมวลผลข้อมูล</li>
              <li>สิทธิ์ในการโอนย้ายข้อมูล</li>
              <li>สิทธิ์ในการถอนความยินยอมเมื่อใดก็ได้</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">6. การเก็บรักษาข้อมูล</h2>
            <p className="text-muted-foreground leading-relaxed">
              เราจะเก็บรักษาข้อมูลส่วนบุคคลของท่านเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่ระบุไว้ในนโยบายนี้ หรือตามที่กฎหมายกำหนด เมื่อข้อมูลไม่จำเป็นอีกต่อไป เราจะดำเนินการลบหรือทำลายข้อมูลอย่างปลอดภัย
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-headline mb-4">7. ติดต่อเรา</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              หากท่านมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือต้องการใช้สิทธิ์ของท่าน กรุณาติดต่อ:
            </p>
            <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 text-sm space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">บริษัท เนเชอรัล เอ็นเนอร์ยี เทค จำกัด</p>
              <p className="text-muted-foreground">44/99 หมู่ที่ 9 ตำบลบางพูด อำเภอปากเกร็ด จังหวัดนนทบุรี 11120</p>
              <p className="text-muted-foreground">โทร: 0-2582-2111, 0-2582-1138-40</p>
              <p className="text-muted-foreground">LINE: @net10</p>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link href="/" className="text-sm text-primary hover:underline underline-offset-2 transition-colors">
              ← กลับสู่หน้าหลัก
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
