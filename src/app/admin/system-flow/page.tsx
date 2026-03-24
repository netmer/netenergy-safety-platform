import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Search,
  FileText,
  ClipboardCheck,
  UserCheck,
  Award,
  BookOpen,
  Settings,
  Shield,
  Bot,
  ArrowRight,
  GitBranch,
  Network,
  Database,
  Cloud,
  Laptop,
  Mail,
  Workflow,
  Clipboard,
  CreditCard,
  Printer,
  ChevronRight,
  Server,
  UserCog,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';


export const metadata: Metadata = {
  title: 'ผังการทำงานระบบ | Admin Panel',
  description: 'ภาพรวมขั้นตอนการทำงานและเส้นทางของข้อมูลในระบบ NET Safety Platform ทั้งหมด',
};

const SectionCard = ({ title, description, icon: Icon, children }: { title: string, description: string, icon: React.ElementType, children: React.ReactNode }) => (
    <Card className="rounded-[2rem] border-none shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-primary/5 p-8">
            <CardTitle className="flex items-center gap-3 text-xl font-headline"><Icon className="h-7 w-7 text-primary"/>{title}</CardTitle>
            <CardDescription className="text-base font-light">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
            {children}
        </CardContent>
    </Card>
)

const Step = ({ num, title, description, children, isLast = false }: { num: number, title: string, description: string, children?: React.ReactNode, isLast?: boolean }) => (
    <div className="flex items-start gap-6">
        <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 z-10">{num}</div>
            {!isLast && <div className="h-full min-h-20 w-1 bg-gradient-to-b from-primary/30 to-transparent"></div>}
        </div>
        <div className="flex-1 space-y-2 pb-10">
            <h4 className="text-lg font-semibold font-headline">{title}</h4>
            <p className="text-muted-foreground leading-relaxed font-light text-sm">{description}</p>
            {children && <div className="space-y-4 pt-4">{children}</div>}
        </div>
    </div>
)

const DbInteraction = ({ collection, action, color = 'green', system = 'Main Firestore' }: { collection: string, action: 'Read' | 'Write' | 'Update' | 'Delete', color?: 'green' | 'blue' | 'yellow' | 'red', system?: string }) => {
    const colors = {
        green: 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400', 
        blue: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400', 
        yellow: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400', 
        red: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400', 
    };
    const actionText = { Read: 'อ่านข้อมูล', Write: 'สร้างข้อมูลใหม่', Update: 'อัปเดตข้อมูล', Delete: 'ลบข้อมูล' };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-2xl border transition-all hover:shadow-md ${colors[color]}`}>
            <Database className="h-5 w-5 mt-0.5 shrink-0"/>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{actionText[action]}: <code className="font-mono text-xs px-1.5 py-0.5 bg-background/50 rounded">{collection}</code></p>
                <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold mt-1">{system}</p>
            </div>
        </div>
    )
}


export default function SystemFlowPage() {
  return (
    <div className="space-y-10 py-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
        <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Settings className="w-3.5 h-3.5" />
                Technical Roadmap
            </div>
            <h1 className="text-3xl font-bold font-headline">คู่มือการทำงานและผังข้อมูล</h1>
            <p className="text-muted-foreground mt-2 font-light text-base">ทำความเข้าใจขั้นตอนการไหลของข้อมูลในแพลตฟอร์ม NET Safety แบบครบวงจร</p>
        </div>
        <div className="h-1.5 w-32 bg-primary rounded-full hidden md:block" />
      </div>

      <div className="grid gap-10 px-4">
        {/* Public User Workflow */}
        <SectionCard title="1. เส้นทางผู้ใช้งานทั่วไป (Public Workflow)" description="ตั้งแต่ค้นหาหลักสูตรไปจนถึงได้รับใบประกาศนียบัตร" icon={Users}>
            <Step num={1} title="การค้นหาและสำรวจ (Discovery)" description="ผู้ใช้ค้นหาหลักสูตรผ่าน Smart Search หรือ AI Advisor">
                <DbInteraction collection="courses, trainingSchedules, blogPosts" action="Read" />
            </Step>
            <Step num={2} title="การลงทะเบียน (Registration)" description="ผู้ใช้ล็อกอินและกรอกแบบฟอร์มสมัครเรียน ระบบจะจำข้อมูลล่าสุดไว้ให้ (Auto-fill)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DbInteraction collection="registrations" action="Write" color="blue" />
                    <DbInteraction collection="mail" action="Write" color="blue" system="Trigger Email Queue" />
                </div>
            </Step>
            <Step num={3} title="การแจ้งเตือน (Notifications)" description="ระบบส่งอีเมลยืนยันการรับสมัครไปยังลูกค้าทันทีผ่าน Firebase Extension">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100">
                    <Zap className="h-6 w-6 shrink-0 animate-pulse" />
                    <span className="text-sm font-semibold">Automation: ระบบส่งเมลทำงานอัตโนมัติ 100% โดยไม่ต้องใช้แอดมิน</span>
                </div>
            </Step>
            <Step num={4} title="ตรวจสอบประวัติ (Verification)" description="ผู้ใช้หรือบุคคลภายนอกสามารถตรวจสอบความถูกต้องของวุฒิบัตรได้ที่หน้าสาธารณะ" isLast>
                 <DbInteraction collection="trainingRecords" action="Read" />
            </Step>
        </SectionCard>

        {/* ERP & Admin Workflow */}
        <SectionCard title="2. กระบวนการหลังบ้าน (Admin/ERP Workflow)" description="การจัดการใบสมัคร งานตรวจสอบ และงานบัญชี" icon={Shield}>
            <div className="space-y-10">
                <div className="relative p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary mb-8 flex items-center gap-2">
                        <Workflow className="h-5 w-5"/> ส่วนงาน Call Center & Training
                    </h3>
                    <Step num={1} title="ยืนยันใบสมัคร" description="แอดมินตรวจสอบความถูกต้องของรายชื่อและบริษัทยืนยันสิทธิ์">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <DbInteraction collection="registrations" action="Update" color="yellow" />
                            <DbInteraction collection="trainingRecords" action="Write" color="blue" system="สร้างระเบียนการอบรม" />
                        </div>
                    </Step>
                    <Step num={2} title="จัดการระหว่างอบรม" description="วิทยากรเช็คชื่อผ่านระบบ ERP บันทึกคะแนน และอัปโหลดเอกสารสำคัญ">
                        <DbInteraction collection="trainingRecords" action="Update" color="yellow" />
                    </Step>
                    <Step num={3} title="จบหลักสูตร & ออกใบประกาศ" description="ระบบคำนวณเลขที่ใบประกาศและวันหมดอายุให้อัตโนมัติเมื่อกดจบหลักสูตร" isLast>
                        <DbInteraction collection="trainingRecords" action="Update" color="yellow" />
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100">
                            <Award className="h-6 w-6 shrink-0" />
                            <span className="text-sm font-semibold">Smart Logic: ระบบดึงวันหมดอายุจาก Master Data ของหลักสูตรมาคำนวณให้ทันที</span>
                        </div>
                    </Step>
                </div>

                <div className="relative p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-blue-600 mb-8 flex items-center gap-2">
                        <CreditCard className="h-5 w-5"/> ส่วนงานบัญชี (Accounting)
                    </h3>
                    <Step num={1} title="ส่งข้อมูลใบแจ้งหนี้" description="ทีมบัญชีส่งข้อมูลการสมัครที่ยืนยันแล้วไปยังระบบ Quotacraft" isLast>
                        <DbInteraction collection="quotations, invoices" action="Write" color="blue" system="Quotacraft External Firestore" />
                    </Step>
                </div>
            </div>
        </SectionCard>
      </div>
      
      <div className="text-center pb-12">
          <p className="text-slate-400 text-xs font-light">NET Safety Platform v2.5 - All Systems Operational</p>
      </div>
    </div>
  );
}
