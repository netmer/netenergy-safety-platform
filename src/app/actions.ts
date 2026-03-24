"use server";

import { complianceChecker, ComplianceCheckerInput, ComplianceCheckerOutput } from "@/ai/flows/compliance-checker";
import { smartSearch, SmartSearchInput, SmartSearchOutput } from "@/ai/flows/smart-search";

export interface ComplianceFormState {
  success: boolean;
  message: string;
  data?: ComplianceCheckerOutput;
}

export async function checkComplianceAction(
  prevState: ComplianceFormState,
  formData: FormData
): Promise<ComplianceFormState> {
  const rawFormData = {
    businessType: formData.get("businessType"),
    employeeCount: formData.get("employeeCount"),
    location: formData.get("location"),
    otherFactors: formData.get("otherFactors"),
  };

  try {
    const employeeCountNum = parseInt(rawFormData.employeeCount as string, 10);

    if (!rawFormData.businessType || typeof rawFormData.businessType !== 'string' ||
        isNaN(employeeCountNum) ||
        !rawFormData.location || typeof rawFormData.location !== 'string') {
      return { success: false, message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนและถูกต้อง" };
    }
    
    const input: ComplianceCheckerInput = {
      businessType: rawFormData.businessType,
      employeeCount: employeeCountNum,
      location: rawFormData.location,
      otherFactors: (rawFormData.otherFactors as string) || "ไม่มี",
    };

    const result = await complianceChecker(input);

    if (result.requiredCourses.length === 0) {
        return { success: true, message: "วิเคราะห์สำเร็จ: ไม่พบหลักสูตรที่แนะนำเป็นพิเศษ", data: result };
    }

    return { success: true, message: "วิเคราะห์สำเร็จ: พบหลักสูตรที่แนะนำ", data: result };
  } catch (error) {
    console.error("Compliance checker error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, message: `เกิดข้อผิดพลาดในการประมวลผล: ${errorMessage}` };
  }
}

export async function getSearchResults(query: string): Promise<SmartSearchOutput | null> {
    if (!query) {
        return null;
    }
    try {
        const results = await smartSearch({ query });
        return results;
    } catch (error) {
        console.error("Smart search error:", error);
        return null;
    }
}
