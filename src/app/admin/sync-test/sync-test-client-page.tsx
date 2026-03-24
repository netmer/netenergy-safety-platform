
'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { runConnectionTest, type TestState, type TestResult } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Info, Link as LinkIcon, Server, Eye, EyeOff } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"


const initialState: TestState = {
    logs: [],
    overallStatus: 'pending',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังทดสอบ...
        </>
      ) : (
         <>
          <Server className="mr-2 h-4 w-4" />
          เริ่มการทดสอบการเชื่อมต่อฐานข้อมูล
        </>
      )}
    </Button>
  );
}

const statusIcons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    failure: <XCircle className="h-5 w-5 text-destructive" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
}

function ResultLog({ log }: { log: TestResult }) {
    return (
        <div className="flex items-start gap-4 p-4 border-b last:border-b-0">
            <div className="mt-1">{statusIcons[log.status]}</div>
            <div className="flex-1">
                <p className="font-semibold">{log.step}</p>
                <p className="text-sm text-muted-foreground">{log.details}</p>
                {(log.payload || log.response) && (
                     <Accordion type="single" collapsible className="w-full mt-2">
                        <AccordionItem value="details" className="border-none">
                            <AccordionTrigger className="text-xs py-1 hover:no-underline">แสดง/ซ่อน รายละเอียดทางเทคนิค</AccordionTrigger>
                            <AccordionContent>
                                {log.payload && (
                                    <div className="mt-2">
                                        <h4 className="font-semibold text-xs">Payload (ข้อมูลที่ส่ง):</h4>
                                        <pre className="mt-1 text-xs bg-muted p-2 rounded-md overflow-x-auto">{JSON.stringify(log.payload, null, 2)}</pre>
                                    </div>
                                )}
                                 {log.response && (
                                    <div className="mt-2">
                                        <h4 className="font-semibold text-xs">Response (ข้อมูลที่ได้รับ):</h4>
                                        <pre className="mt-1 text-xs bg-muted p-2 rounded-md overflow-x-auto">{typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2)}</pre>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
            </div>
        </div>
    )
}

export function SyncTestClientPage() {
    const [state, formAction] = useActionState(runConnectionTest, initialState);
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>ทดสอบการเชื่อมต่อฐานข้อมูล (Quotacraft)</CardTitle>
                    <CardDescription>
                        เครื่องมือนี้จะทดสอบการเชื่อมต่อไปยังฐานข้อมูล Firestore ของระบบ Quotacraft โดยการจำลองสร้างเอกสารโดยตรง
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction}>
                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>

            {state.logs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>ผลการทดสอบ</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {state.logs.map((log, index) => (
                                <ResultLog key={index} log={log} />
                            ))}
                        </div>
                    </CardContent>
                     {state.overallStatus !== 'pending' && (
                         <CardFooter className="p-4 bg-muted/50 border-t">
                            {state.overallStatus === 'success' ? (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <p className="font-semibold">ผลการทดสอบ: สำเร็จ! การเชื่อมต่อทำงานถูกต้อง</p>
                                </div>
                            ) : (
                                 <div className="flex items-center gap-2 text-destructive">
                                    <XCircle className="h-5 w-5" />
                                    <p className="font-semibold">ผลการทดสอบ: ล้มเหลว! กรุณาตรวจสอบขั้นตอนที่ผิดพลาด และการตั้งค่า Environment Variables</p>
                                </div>
                            )}
                         </CardFooter>
                     )}
                </Card>
            )}
        </div>
    )
}
