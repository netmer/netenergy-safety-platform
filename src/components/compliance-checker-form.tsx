"use client";

import { useFormStatus } from "react-dom";
import { checkComplianceAction, FormState } from "@/app/actions";
import { useActionState, useEffect, useState } from "react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight, FileText, ListChecks, Info, Sparkles, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const initialState: FormState = {
  success: false,
  message: "",
  data: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full md:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          กำลังวิเคราะห์...
        </>
      ) : (
        <>
          วิเคราะห์ข้อมูล <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function ComplianceCheckerForm() {
  const [state, formAction] = useActionState(checkComplianceAction, initialState);
  const { toast } = useToast();

  // State for controlled inputs
  const [businessType, setBusinessType] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [location, setLocation] = useState('');
  const [otherFactors, setOtherFactors] = useState('');

  // State to hold the displayed result (for caching)
  const [displayState, setDisplayState] = useState<FormState>(initialState);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const cachedForm = sessionStorage.getItem('complianceCheckerForm');
      if (cachedForm) {
        const data = JSON.parse(cachedForm);
        setBusinessType(data.businessType || '');
        setEmployeeCount(data.employeeCount || '');
        setLocation(data.location || '');
        setOtherFactors(data.otherFactors || '');
      }
      
      const cachedResult = sessionStorage.getItem('complianceCheckerResult');
      if (cachedResult) {
        setDisplayState(JSON.parse(cachedResult));
      }
    } catch (error) {
        console.error("Failed to parse from sessionStorage", error);
        sessionStorage.removeItem('complianceCheckerForm');
        sessionStorage.removeItem('complianceCheckerResult');
    }
  }, []);

  // Save form inputs to sessionStorage on change
  useEffect(() => {
    const formData = { businessType, employeeCount, location, otherFactors };
    sessionStorage.setItem('complianceCheckerForm', JSON.stringify(formData));
  }, [businessType, employeeCount, location, otherFactors]);
  
  // Handle new results from the server action
  useEffect(() => {
    if (state.message) { // Action has been executed
        setDisplayState(state);
        if (state.success && state.data) {
            sessionStorage.setItem('complianceCheckerResult', JSON.stringify(state));
        } else if (!state.success) {
             toast({
                variant: "destructive",
                title: "เกิดข้อผิดพลาด",
                description: state.message,
            });
            // On error, clear previous good results from cache
            sessionStorage.removeItem('complianceCheckerResult');
        }
    }
  }, [state, toast]);
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <form action={formAction}>
          <CardHeader>
            <CardTitle className="text-2xl">ข้อมูลองค์กรของคุณ</CardTitle>
            <CardDescription>
              กรอกข้อมูลเพื่อให้ AI ช่วยวิเคราะห์และแนะนำหลักสูตรอบรมที่เหมาะสม
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="businessType">ประเภทธุรกิจ *</Label>
                <Input id="businessType" name="businessType" placeholder="เช่น โรงงานอุตสาหกรรม, ก่อสร้าง, สำนักงาน" required value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeCount">จำนวนพนักงาน (คน) *</Label>
                <Input id="employeeCount" name="employeeCount" type="number" placeholder="เช่น 50" required value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">ที่ตั้งสถานประกอบการ *</Label>
              <Input id="location" name="location" placeholder="เช่น จังหวัดระยอง, กรุงเทพมหานคร" required value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherFactors">ลักษณะงานและปัจจัยเสี่ยงเพิ่มเติม</Label>
              <Textarea id="otherFactors" name="otherFactors" placeholder="เช่น มีการทำงานบนที่สูง, ใช้สารเคมี, มีรถยก, ต้องการพัฒนาทักษะหัวหน้างาน, เตรียมพร้อมรับมือเหตุฉุกเฉิน" value={otherFactors} onChange={(e) => setOtherFactors(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>

      {displayState.data && (
        <Card className="mt-8 animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3"><Sparkles className="text-primary"/>คำแนะนำจาก AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {displayState.data.requiredCourses.length > 0 ? (
              <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg">
                <h3 className="font-semibold text-lg flex items-center mb-3"><ListChecks className="mr-3 h-6 w-6 text-primary"/>หลักสูตรที่แนะนำ</h3>
                <ul className="space-y-2">
                  {displayState.data.requiredCourses.map((course) => (
                    <li key={course.courseId} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 shrink-0" />
                        <Link href={`/courses/course/${course.courseId}`} className="hover:underline hover:text-primary transition-colors">
                          {course.courseName}
                        </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>ไม่พบหลักสูตรที่แนะนำเป็นพิเศษ</AlertTitle>
                    <AlertDescription>
                        จากข้อมูลที่ท่านให้มา ระบบไม่พบหลักสูตรที่แนะนำเป็นพิเศษในตอนนี้
                    </AlertDescription>
                </Alert>
            )}
            
            {displayState.data.summary && (
                <div className="p-4 border-l-4 border-secondary-foreground/20 bg-secondary/20 rounded-r-lg">
                    <h3 className="font-semibold text-lg flex items-center mb-3"><FileText className="mr-3 h-6 w-6 text-secondary-foreground/80"/>สรุปและเหตุผล</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{displayState.data.summary}</p>
                </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
