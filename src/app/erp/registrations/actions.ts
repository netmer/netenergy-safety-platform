'use server';

import { db, storage } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc, collection, writeBatch, query, where, getDocs, orderBy, limit, startAfter, getCountFromServer, documentId, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { Registration, RegistrationStatus, IndividualAttendeeStatus, RegistrationAttendee, AttendeeData, TrainingRecord, Course } from '@/lib/course-data';
import { z } from 'zod';
import { sendEmail, emailTemplates } from '@/lib/mail';
import { writeAuditLog } from '@/lib/audit';
import { generateQuotationAction, generateInvoiceAction } from '@/app/erp/billing/actions';

const PAGE_SIZE = 30;

/**
 * Fetches registrations with advanced pagination and multidimensional filtering.
 */
export async function getPaginatedRegistrations({
    status,
    courseId,
    scheduleId,
    startDate,
    endDate,
    lastVisibleId,
}: {
    status: RegistrationStatus;
    courseId?: string;
    scheduleId?: string;
    startDate?: string;
    endDate?: string;
    lastVisibleId?: string;
}) {
    try {
        let q = query(
            collection(db, 'registrations'),
            where('status', '==', status)
        );

        if (courseId && courseId !== 'all') {
            q = query(q, where('courseId', '==', courseId));
        }
        
        if (scheduleId && scheduleId !== 'all') {
            q = query(q, where('scheduleId', '==', scheduleId));
        }

        if (startDate && startDate !== '') {
            q = query(q, where('registrationDate', '>=', startDate));
        }
        
        if (endDate && endDate !== '') {
            q = query(q, where('registrationDate', '<=', endDate));
        }

        q = query(q, orderBy('registrationDate', 'desc'), limit(PAGE_SIZE));

        if (lastVisibleId) {
            const lastVisibleSnap = await getDoc(doc(db, 'registrations', lastVisibleId));
            if (lastVisibleSnap.exists()) {
                q = query(q, startAfter(lastVisibleSnap));
            }
        }

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));

        return {
            records,
            hasMore: records.length === PAGE_SIZE,
        };
    } catch (error: any) {
        console.error("Pagination fetch error:", error);
        if (error.message && (error.message.includes('index') || error.message.includes('composite'))) {
            throw new Error(error.message);
        }
        throw new Error("ไม่สามารถโหลดข้อมูลได้ในขณะนี้: " + (error.message || "Unknown error"));
    }
}

export async function getRegistrationCounts() {
    try {
        const statuses: RegistrationStatus[] = ['pending', 'confirmed', 'cancelled'];
        const counts: Record<string, number> = {};

        await Promise.all(statuses.map(async (status) => {
            const q = query(collection(db, 'registrations'), where('status', '==', status));
            const snapshot = await getCountFromServer(q);
            counts[status] = snapshot.data().count;
        }));

        return counts;
    } catch (error) {
        console.error("Count fetch error:", error);
        return { pending: 0, confirmed: 0, cancelled: 0 };
    }
}

/**
 * Reschedules specific individual attendees. 
 * If only some are selected, it splits the registration into a new record for the new schedule.
 */
export async function rescheduleIndividualAttendeesAction({
    registrationId,
    attendeeIds,
    newScheduleId
}: {
    registrationId: string,
    attendeeIds: string[],
    newScheduleId: string
}) {
    try {
        const regRef = doc(db, 'registrations', registrationId);
        const regSnap = await getDoc(regRef);
        if (!regSnap.exists()) throw new Error("ไม่พบข้อมูลใบสมัคร");
        const registrationData = regSnap.data() as Registration;
        
        const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', newScheduleId));
        if (!scheduleSnap.exists()) throw new Error("ไม่พบรอบอบรมปลายทาง");
        const newSchedule = scheduleSnap.data();
        
        const attendeeListField = registrationData.formSchema.find(f => f.type === 'attendee_list');
        if (!attendeeListField) throw new Error("ไม่พบโครงสร้างรายชื่อผู้อบรม");
        
        const currentAttendees = (registrationData.formData[attendeeListField.id] || []) as RegistrationAttendee[];
        const isFullReschedule = attendeeIds.length === currentAttendees.length;

        const batch = writeBatch(db);

        if (isFullReschedule) {
            // OPTION A: Full Move — update registration scheduleId, reset attendees to pending (clean slate)
            // Delete ALL existing training records so they are re-created after re-approval in new schedule
            const allRecordsSnap = await getDocs(
                query(collection(db, 'trainingRecords'), where('registrationId', '==', registrationId))
            );
            allRecordsSnap.docs.forEach(d => batch.delete(d.ref));

            batch.update(regRef, {
                scheduleId: newScheduleId,
                status: 'pending',
                [`formData.${attendeeListField.id}`]: currentAttendees.map(a => ({ ...a, status: 'pending' })),
            });

            await batch.commit();
        } else {
            // OPTION B: Partial Move — split into NEW registration
            const movedAttendees = currentAttendees.filter(a => attendeeIds.includes(a.id));
            const remainingAttendees = currentAttendees.map(a =>
                attendeeIds.includes(a.id)
                    ? { ...a, status: 'postponed', movedToScheduleId: newScheduleId }
                    : a
            );

            // 1. Mark moved attendees as postponed in the original registration
            batch.update(regRef, { [`formData.${attendeeListField.id}`]: remainingAttendees });

            // 2. Create NEW registration for moved attendees (status: pending, needs re-approval)
            const newRegRef = doc(collection(db, 'registrations'));
            const newRegData: Omit<Registration, 'id'> = {
                ...registrationData,
                scheduleId: newScheduleId,
                registrationDate: new Date().toISOString(),
                status: 'pending',
                formData: {
                    ...registrationData.formData,
                    [attendeeListField.id]: movedAttendees.map(a => ({ ...a, status: 'pending' })),
                },
            };
            batch.set(newRegRef, newRegData);

            // 3. DELETE training records of moved attendees from the OLD schedule — they start fresh
            //    in the new registration and will be re-created when re-approved
            const attendeeIdsSet = new Set(attendeeIds);
            const movedRecordsSnap = await getDocs(
                query(collection(db, 'trainingRecords'), where('registrationId', '==', registrationId))
            );
            movedRecordsSnap.docs.forEach(d => {
                if (attendeeIdsSet.has(d.data().registrationAttendeeId as string)) {
                    batch.delete(d.ref);
                }
            });

            await batch.commit();
        }

        // Send email notification (fire-and-forget)
        try {
            if (isFullReschedule) {
                const tpl = emailTemplates.scheduleRescheduled(
                    registrationData.userDisplayName || 'ลูกค้า',
                    registrationData.courseTitle,
                    new Date(registrationData.scheduleId).toLocaleDateString('th-TH'),
                    new Date(newSchedule.startDate).toLocaleDateString('th-TH'),
                    newSchedule.location || ''
                );
                sendEmail({ to: registrationData.userEmail, subject: tpl.subject, html: tpl.html });
            } else {
                const movedAttendees = (registrationData.formData[attendeeListField!.id] || []) as RegistrationAttendee[];
                const movedNames = movedAttendees
                    .filter(a => attendeeIds.includes(a.id))
                    .map(a => (a as any).attendeeName || a.fullName || 'ผู้อบรม');
                const tpl = emailTemplates.attendeeRescheduled(
                    registrationData.userDisplayName || 'ลูกค้า',
                    registrationData.courseTitle,
                    movedNames,
                    new Date(newSchedule.startDate).toLocaleDateString('th-TH'),
                    newSchedule.location || ''
                );
                sendEmail({ to: registrationData.userEmail, subject: tpl.subject, html: tpl.html });
            }
        } catch (emailErr) {
            console.warn("Reschedule email failed:", emailErr);
        }

        revalidatePath('/erp/registrations');
        revalidatePath('/erp/attendees');
        return { success: true, message: `ย้ายรอบผู้อบรม ${attendeeIds.length} ท่าน ไปยังรอบวันที่ ${new Date(newSchedule.startDate).toLocaleDateString('th-TH')} เรียบร้อยแล้ว` };
    } catch (e) {
        console.error("Reschedule Action Error:", e);
        return { success: false, message: e instanceof Error ? e.message : 'ไม่สามารถเลื่อนรอบได้' };
    }
}

/**
 * Reschedules an entire registration to a new training round
 */
export async function rescheduleRegistrationAction(registrationId: string, newScheduleId: string) {
    try {
        const regRef = doc(db, 'registrations', registrationId);
        const regSnap = await getDoc(regRef);
        if (!regSnap.exists()) throw new Error("ไม่พบข้อมูลใบสมัคร");
        const registrationData = regSnap.data() as Registration;
        
        const scheduleSnap = await getDoc(doc(db, 'trainingSchedules', newScheduleId));
        if (!scheduleSnap.exists()) throw new Error("ไม่พบรอบอบรมปลายทาง");
        const newSchedule = scheduleSnap.data();
        
        const batch = writeBatch(db);
        
        // 1. Update schedule in registration
        batch.update(regRef, { 
            scheduleId: newScheduleId,
            status: 'pending' // Reset to pending for review in new round
        });
        
        // Reset individual statuses in formData if they exist
        const attendeeListField = registrationData.formSchema.find(f => f.type === 'attendee_list');
        if (attendeeListField) {
            const currentAttendees = (registrationData.formData[attendeeListField.id] || []) as RegistrationAttendee[];
            batch.update(regRef, {
                [`formData.${attendeeListField.id}`]: currentAttendees.map(a => ({ ...a, status: 'pending' }))
            });
        }
        
        // 2. DELETE all training records — clean slate, re-created after re-approval in new schedule
        const recordsQuery = query(collection(db, 'trainingRecords'), where('registrationId', '==', registrationId));
        const recordsSnapshot = await getDocs(recordsQuery);
        recordsSnapshot.forEach(recordDoc => batch.delete(recordDoc.ref));

        await batch.commit();

        // Send email notification (fire-and-forget)
        try {
            const tpl = emailTemplates.scheduleRescheduled(
                registrationData.userDisplayName || 'ลูกค้า',
                registrationData.courseTitle,
                new Date(registrationData.scheduleId).toLocaleDateString('th-TH'),
                new Date(newSchedule.startDate).toLocaleDateString('th-TH'),
                newSchedule.location || ''
            );
            sendEmail({ to: registrationData.userEmail, subject: tpl.subject, html: tpl.html });
        } catch (emailErr) {
            console.warn("Reschedule email failed:", emailErr);
        }

        revalidatePath('/erp/registrations');
        revalidatePath('/erp/attendees');
        return { success: true, message: `ย้ายใบสมัครทั้งหมดไปยังรอบวันที่ ${new Date(newSchedule.startDate).toLocaleDateString('th-TH')} เรียบร้อยแล้ว` };
    } catch (e) {
        console.error("Full Reschedule Error:", e);
        return { success: false, message: e instanceof Error ? e.message : 'ไม่สามารถเลื่อนรอบอบรมได้' };
    }
}

export async function updateRegistrationStatus(id: string, status: RegistrationStatus) {
    try {
        const registrationRef = doc(db, 'registrations', id);
        const regSnap = await getDoc(registrationRef);
        
        if (!regSnap.exists()) throw new Error("Registration not found");
        const regData = regSnap.data() as Registration;

        await updateDoc(registrationRef, { status });

        // Audit log (fire-and-forget)
        writeAuditLog({
            collectionName: 'registrations',
            documentId: id,
            action: 'status_change',
            before: { status: regData.status },
            after: { status },
            performedBy: 'system',
            note: `เปลี่ยนสถานะจาก ${regData.status} → ${status}`,
        });

        const statusTextMap = {
            'confirmed': 'ได้รับการยืนยันการลงทะเบียนแล้ว',
            'cancelled': 'ถูกยกเลิกการลงทะเบียน',
            'pending': 'กลับสู่สถานะรอดำเนินการ'
        };
        const statusColorMap = {
            'confirmed': '#16a34a',
            'cancelled': '#dc2626',
            'pending': '#d97706'
        };

        const template = emailTemplates.statusUpdated(
            regData.userDisplayName || 'ลูกค้า',
            regData.courseTitle,
            statusTextMap[status],
            statusColorMap[status]
        );

        await sendEmail({
            to: regData.userEmail,
            subject: template.subject,
            html: template.html,
        });

        revalidatePath('/erp/registrations');
        revalidatePath('/profile');
        return { success: true, message: 'อัปเดตสถานะและแจ้งเตือนอีเมลสำเร็จ' };
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'ไม่สามารถอัปเดตสถานะได้';
        return { success: false, message: `Database Error: ${errorMessage}` };
    }
}

export async function updateRegistrationData(id: string, prevState: any, formData: FormData) {
    try {
        const jsonData = formData.get('jsonData') as string;
        if (!jsonData) throw new Error("ไม่พบข้อมูลที่ต้องการบันทึก");
        
        const { formData: clientFormData, formSchema } = JSON.parse(jsonData);
        const registrationRef = doc(db, 'registrations', id);
        const regSnap = await getDoc(registrationRef);
        if (!regSnap.exists()) throw new Error("ไม่พบข้อมูลการลงทะเบียนในระบบ");

        const dataToSave: Record<string, any> = { ...clientFormData };

        const attendeeListField = formSchema.find((f: any) => f.type === 'attendee_list');
        if (attendeeListField) {
            const attendees = (clientFormData[attendeeListField.id] || []) as RegistrationAttendee[];
            const subFields = attendeeListField.subFields || [];
            const fileSubFields = subFields.filter((sf: any) => sf.type === 'file');

            for (let attendee of attendees) {
                for (let sf of fileSubFields) {
                    const fileKey = `file-${attendee.id}-${sf.id}`;
                    const file = formData.get(fileKey) as File | null;
                    if (file && file.size > 0) {
                        const storageRef = ref(storage, `registrations/${id}/${fileKey}-${Date.now()}-${file.name}`);
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = new Uint8Array(arrayBuffer);
                        await uploadBytes(storageRef, buffer);
                        const url = await getDownloadURL(storageRef);
                        attendee[sf.id] = url;
                    }
                }
            }
            dataToSave[attendeeListField.id] = attendees;
        }

        await updateDoc(registrationRef, { formData: dataToSave });
        
        revalidatePath('/erp/registrations');
        revalidatePath(`/erp/registrations/edit/${id}`);
        return { success: true, message: 'อัปเดตข้อมูลการลงทะเบียนเรียบร้อยแล้ว' };
    } catch (e) {
        console.error("updateRegistrationData error:", e);
        return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
    }
}

export async function deleteRegistration(id: string) {
    try {
        const registrationRef = doc(db, 'registrations', id);
        const registrationDoc = await getDoc(registrationRef);
        if (!registrationDoc.exists()) throw new Error('Registration not found');
        
        const batch = writeBatch(db);
        batch.delete(registrationRef);
        
        // Also delete associated training records
        const recordsQuery = query(collection(db, 'trainingRecords'), where('registrationId', '==', id));
        const recordsSnapshot = await getDocs(recordsQuery);
        recordsSnapshot.forEach(recordDoc => {
            batch.delete(recordDoc.ref);
        });

        await batch.commit();

        // Audit log (fire-and-forget)
        writeAuditLog({
            collectionName: 'registrations',
            documentId: id,
            action: 'delete',
            before: { courseTitle: registrationDoc.data()?.courseTitle, status: registrationDoc.data()?.status },
            performedBy: 'system',
            note: `ลบใบสมัคร + training records ${recordsSnapshot.size} รายการ`,
        });

        revalidatePath('/erp/registrations');
        revalidatePath('/profile');
        return { success: true, message: 'ลบข้อมูลการลงทะเบียนสำเร็จ' };
    } catch (e) {
        console.error(e);
        return { success: false, message: `Database Error: ไม่สามารถลบข้อมูลได้` };
    }
}

export async function updateIndividualAttendeeStatus({
  registrationId,
  attendeeListFieldId,
  attendeeIds,
  newStatus,
}: {
  registrationId: string;
  attendeeListFieldId: string;
  attendeeIds: string[];
  newStatus: IndividualAttendeeStatus;
}) {
  const registrationRef = doc(db, 'registrations', registrationId);
  try {
    const regDoc = await getDoc(registrationRef);
    if (!regDoc.exists()) throw new Error("Registration not found.");
    const registrationData = regDoc.data() as Registration;
    
    let currentAttendees = (registrationData.formData[attendeeListFieldId] || []) as RegistrationAttendee[];
    const batch = writeBatch(db);

    const updatedAttendees = currentAttendees.map(attendee => {
      if (attendeeIds.includes(attendee.id)) {
        return { ...attendee, status: newStatus };
      }
      return attendee;
    });

    if (newStatus === 'confirmed') {
      // Fetch existing training records for this registration to prevent duplicates
      const existingRecordsSnap = await getDocs(
        query(collection(db, 'trainingRecords'), where('registrationId', '==', registrationId))
      );
      const existingAttendeeIds = new Set(existingRecordsSnap.docs.map(d => d.data().registrationAttendeeId as string));

      const attendeeListSchema = registrationData.formSchema.find(f => f.id === attendeeListFieldId);
      const fullNameField = attendeeListSchema?.subFields?.find(f => f.label.includes("ชื่อ-นามสกุล"));

      for (const attendeeId of attendeeIds) {
        const attendeeToConfirm = currentAttendees.find(a => a.id === attendeeId);
        if (attendeeToConfirm && attendeeToConfirm.status !== 'confirmed' && !existingAttendeeIds.has(attendeeId)) {
            const attendeeName = fullNameField ? (attendeeToConfirm[fullNameField.id] as string) : 'ผู้อบรม';
            const trainingRecordData: Omit<TrainingRecord, 'id'> = {
              attendeeId: attendeeToConfirm.attendeeId || null,
              attendeeName: attendeeName,
              companyName: registrationData.clientCompanyName || 'บุคคลทั่วไป',
              registrationId: registrationId,
              registrationAttendeeId: attendeeToConfirm.id,
              scheduleId: registrationData.scheduleId,
              courseId: registrationData.courseId,
              courseTitle: registrationData.courseTitle,
              completionDate: '',
              status: 'pending_verification',
              attendance: 'not_checked_in',
            };
            const newRecordRef = doc(collection(db, 'trainingRecords'));
            batch.set(newRecordRef, trainingRecordData);
        }
      }
    } else {
      // For cancelled / pending / postponed: remove the training record so it disappears from daily management
      const attendeeIdsSet = new Set(attendeeIds);
      const recordsToDeleteSnap = await getDocs(
        query(collection(db, 'trainingRecords'), where('registrationId', '==', registrationId))
      );
      recordsToDeleteSnap.docs.forEach(d => {
        if (attendeeIdsSet.has(d.data().registrationAttendeeId as string)) {
          batch.delete(d.ref);
        }
      });
    }
    
    batch.update(registrationRef, {
        [`formData.${attendeeListFieldId}`]: updatedAttendees
    });

    const hasPending = updatedAttendees.some(a => a.status === 'pending');
    const allCancelled = updatedAttendees.length > 0 && updatedAttendees.every(a => a.status === 'cancelled');
    const finalRegStatus: RegistrationStatus = allCancelled ? 'cancelled' : !hasPending && updatedAttendees.length > 0 ? 'confirmed' : 'pending';
    
    if (finalRegStatus !== registrationData.status) {
        batch.update(registrationRef, { status: finalRegStatus });
    }

    await batch.commit();
    revalidatePath(`/erp/registrations`);
    return { success: true, message: `อัปเดตสถานะผู้อบรมเรียบร้อยแล้ว`, updatedAttendees };
  } catch (e) {
    console.error(e);
    return { success: false, message: `เกิดข้อผิดพลาดในการอัปเดตข้อมูล` };
  }
}

// Wrappers delegating to canonical implementations in billing/actions
export async function createQuotationAction(registrationId: string) { return generateQuotationAction(registrationId); }
export async function createInvoiceAction(registrationId: string) { return generateInvoiceAction(registrationId); }