'use client';

import { useActionState, useEffect, useState, useCallback } from 'react';
import { sendTestEmail, type TestEmailState } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Loader2, 
  Send, 
  CheckCircle2, 
  Terminal, 
  Copy, 
  Globe, 
  RefreshCw, 
  Clock,
  Settings2,
  Bug,
  MessageSquareText,
  ShieldAlert,
  Key,
  ExternalLink,
  HelpCircle,
  Info
} from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const initialState: TestEmailState = { message: '', success: undefined };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto rounded-xl font-semibold h-12">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังส่ง...
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          ส่งอีเมลทดสอบ
        </>
      )}
    </Button>
  );
}

export default function SystemTestPage() {
  const { toast } = useToast();
  const [state, formAction] = useActionState(sendTestEmail, initialState);
  
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpHostPort] = useState('465');
  const [smtpProtocol, setSmtpProtocol] = useState('smtps');

  const [mailLogs, setMailLogs] = useState<any[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  const generatedUri = `${smtpProtocol}://${encodeURIComponent(smtpUser)}:${encodeURIComponent(smtpPass.replace(/\s/g, ''))}@${smtpHost}:${smtpPort}`;

  const fetchMailLogs = useCallback(async () => {
    setIsFetchingLogs(true);
    try {
      const q = query(collection(db, 'mail'), orderBy('createdAt', 'desc'), limit(5));
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMailLogs(logs);
    } catch (error) {
      console.error("Error fetching mail logs:", error);
    } finally {
      setIsFetchingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchMailLogs();
    const interval = setInterval(fetchMailLogs, 8000);
    return () => clearInterval(interval);
  }, [fetchMailLogs]);

  useEffect(() => {
    if (state.success === true) {
      toast({ title: 'สำเร็จ!', description: state.message });
      fetchMailLogs();
    } else if (state.success === false) {
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาด', description: state.message });
    }
  }, [state, toast, fetchMailLogs]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'คัดลอกแล้ว', description: 'นำไปวางในช่อง SMTP Connection URI ใน Firebase Console ครับ' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-bold font-headline">ตรวจสอบระบบส่งเมล</h1>
          <p className="text-muted-foreground font-light text-sm">คู่มือการตั้งค่าและตรวจสอบปัญหาการส่งอีเมลผ่าน Firebase Extension</p>
        </div>
        <Badge variant="outline" className="w-fit h-fit py-1.5 px-4 border-primary/30 text-primary bg-primary/5 rounded-full font-semibold">
          System Status: Live
        </Badge>
      </div>

      {/* Critical Configuration Warning */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-2xl border-none shadow-sm text-left p-6">
        <ShieldAlert className="h-6 w-6 text-amber-600" />
        <AlertTitle className="font-bold text-amber-800 dark:text-amber-400 text-lg mb-2">ตรวจสอบการตั้งค่า Authentication Type!</AlertTitle>
        <AlertDescription className="text-sm text-amber-700 dark:text-amber-300 font-light space-y-3">
          <p>หากสถานะค้างที่ "กำลังประมวลผล" สาเหตุที่พบบ่อยคือการเลือก **Authentication Type** ผิดประเภทครับ</p>
          <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-amber-200/50">
            <p className="font-semibold text-amber-900 dark:text-amber-100">การตั้งค่าสำหรับ Gmail App Password:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 opacity-90">
              <li><strong>Authentication Type:</strong> ต้องเลือกเป็น <span className="underline font-bold">Password</span> เท่านั้น (ไม่ใช่ OAuth2)</li>
              <li><strong>SMTP connection URI:</strong> ต้องมีพอร์ต <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">:465</code> ปิดท้าย</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-slate-950 text-white p-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Terminal className="w-6 h-6" />
              </div>
              <CardTitle className="font-semibold font-headline">สร้างรหัส SMTP Connection</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 text-left">
                <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">อีเมลผู้ส่ง (Gmail)</Label>
                <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="admin@domain.com" className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between px-1">
                    <Label className="font-bold text-[10px] uppercase tracking-wider text-slate-400">App Password (16 หลัก)</Label>
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-[10px] text-primary hover:underline font-bold uppercase">
                        รับรหัสผ่านที่นี่ <Globe className="w-3 h-3 inline"/>
                    </a>
                </div>
                <Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="เช่น abcd efgh ijkl mnop" className="h-12 rounded-xl" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 font-mono text-[11px] break-all relative group border border-slate-100 shadow-inner">
              <div className="pr-10 text-slate-700 dark:text-slate-300 leading-relaxed">
                {smtpUser && smtpPass ? generatedUri : 'กรุณากรอกข้อมูลเพื่อสร้าง URI...'}
              </div>
              <Button 
                size="icon" 
                variant="secondary" 
                className="absolute top-4 right-4 h-9 w-9 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(generatedUri)}
                disabled={!smtpUser || !smtpPass}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden flex flex-col bg-white dark:bg-slate-900">
          <CardHeader className="bg-primary text-white p-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl">
                <Mail className="w-6 h-6" />
              </div>
              <CardTitle className="font-semibold font-headline">ทดสอบการส่งจริง</CardTitle>
            </div>
          </CardHeader>
          <form action={formAction} className="flex-1 flex flex-col p-8">
            <div className="space-y-6 flex-1 text-left">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-[10px] uppercase tracking-wider text-slate-400">ระบุอีเมลผู้รับทดสอบ</Label>
                <Input id="email" name="email" type="email" placeholder="test@gmail.com" required className="h-14 text-lg rounded-2xl bg-slate-50 dark:bg-slate-950 border-none" />
              </div>
              <p className="text-sm text-muted-foreground font-light leading-relaxed italic">
                * คลิกปุ่มด้านล่างเพื่อส่งข้อมูลคำขอไปยังคอลเลกชัน `mail` และรอ Cloud Function ประมวลผลครับ
              </p>
            </div>
            <CardFooter className="p-0 mt-8">
              <SubmitButton />
            </CardFooter>
          </form>
        </Card>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="p-8 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold font-headline flex items-center gap-3">
            <Clock className="text-primary" /> สถานะการส่งเมลล่าสุด
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchMailLogs} disabled={isFetchingLogs} className="rounded-full h-10 w-10">
            <RefreshCw className={cn("h-5 w-5 text-slate-400", isFetchingLogs && "animate-spin text-primary")} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {mailLogs.length > 0 ? mailLogs.map((log) => (
              <div key={log.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{log.to?.[0]}</div>
                  <p className="text-xs text-muted-foreground truncate italic">{log.message?.subject}</p>
                </div>
                <div className="shrink-0">
                  {!log.delivery ? (
                    <Badge variant="outline" className="animate-pulse bg-blue-50 text-blue-600 rounded-lg px-3 py-1 font-semibold">
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> กำลังประมวลผล...
                    </Badge>
                  ) : log.delivery.state === 'SUCCESS' ? (
                    <Badge className="bg-green-100 text-green-700 border-none rounded-lg px-3 py-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> ส่งสำเร็จแล้ว
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="rounded-lg px-3 py-1 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5 mr-2" /> ERROR
                    </Badge>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-24 text-center">
                <p className="text-slate-400 font-light italic">ยังไม่พบประวัติการส่งเมลในระบบครับ</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}