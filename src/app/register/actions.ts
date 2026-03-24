
'use server';

import { db, storage } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { revalidatePath } from 'next/cache';
import type { Course, RegistrationFormField, RegistrationAttendee, RegistrationForm, Client, Registration } from '@/lib/course-data';
import type { User } from 'firebase/auth';
import { sendEmail, emailTemplates } from '@/lib/mail';
import { createSystemNotification } from '@/lib/notifications';

export interface RegistrationFormState {
  success: boolean;
  message: string;
  registrationId?: string;
}

async function uploadFile(file: File, registrationId: string, fieldName: string): Promise<string> {
  try {
    const storageRef = ref(storage, `registrations/${registrationId}/${fieldName}-${Date.now()}-${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    await uploadBytes(storageRef, buffer);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Registration file upload error:", error);
    throw new Error(`ไม่สามารถอัปโหลดไฟล์ ${fieldName} ได้`);
  }
}

async function findOrCreateClient(companyName: string): Promise<string> {
    if (!companyName?.trim()) {
        throw new Error("ชื่อบริษัทไม่สามารถเว้นว่างได้");
    }
    const clientsRef = collection(db, 'clients');
    const q = query(clientsRef, where("companyName", "==", companyName.trim()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    } else {
        const newClientData: Omit<Client, 'id'> = {
            companyName: companyName.trim(),
            createdAt: new Date().toISOString(),
        };
        const newClientRef = await addDoc(clientsRef, newClientData);
        return newClientRef.id;
    }
}

export async function submitRegistration(prevState: RegistrationFormState, formData: FormData): Promise<RegistrationFormState> {
  const userJson = formData.get('user') as string;
  if (!userJson) {
    return { success: false, message: 'กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ' };
  }
  const user: User = JSON.parse(userJson);

  const scheduleId = formData.get('scheduleId') as string;
  const courseId = formData.get('courseId') as string;
  const formId = formData.get('formId') as string;
  const fullFormDataJson = formData.get('fullFormData') as string;
  const registrationType = formData.get('registrationType') as 'company' | 'individual';
  
  if (!scheduleId || !courseId || !formId || !fullFormDataJson) {
    return { success: false, message: 'ข้อมูลที่ส่งมาไม่สมบูรณ์' };
  }
  
  try {
    const formDoc = await getDoc(doc(db, 'registrationForms', formId));
    if (!formDoc.exists()) throw new Error('ไม่พบแบบฟอร์มลงทะเบียน');
    const formSchema = (formDoc.data() as RegistrationForm).fields;
    const clientFormData = JSON.parse(fullFormDataJson);

    const dataToSave: Record<string, any> = {
        ...clientFormData,
        registrationType: registrationType
    };
    const filesToUpload: { file: File, fieldName: string }[] = [];
    let linkedClientId: string | null = null;
    let linkedClientCompanyName: string = '';

    // Determine Company Name based on registration type
    if (registrationType === 'individual') {
        const coordinatorField = formSchema.find(f => f.type === 'coordinator');
        linkedClientCompanyName = (coordinatorField ? clientFormData[coordinatorField.id]?.name : user.displayName) || user.email || 'บุคคลทั่วไป';
    } else {
        linkedClientCompanyName = clientFormData.clientCompanyName || '';
        if (linkedClientCompanyName) {
            linkedClientId = await findOrCreateClient(linkedClientCompanyName);
        }
    }
    
    formSchema.forEach(field => {
        if(clientFormData[field.id]) {
            dataToSave[field.id] = clientFormData[field.id];
        }
    });

    const attendeeListField = formSchema.find(f => f.type === 'attendee_list');
    if (attendeeListField) {
      const attendeeIdsString = formData.get('attendeeIds') as string;
      const attendeeIds: string[] = attendeeIdsString ? JSON.parse(attendeeIdsString) : [];
      
      if (attendeeListField.required && attendeeIds.length === 0) {
        return { success: false, message: `กรุณาเพิ่มข้อมูล: ${attendeeListField.label}` };
      }
      
      const attendeeSubFields = attendeeListField.subFields || [];
      const processedAttendees: RegistrationAttendee[] = [];
      
      for (const attendeeId of attendeeIds) {
        const newAttendee: Partial<RegistrationAttendee> = { id: attendeeId, status: 'pending' };

        for (const subField of attendeeSubFields) {
          const formKey = `${subField.id}-${attendeeId}`;
          const file = formData.get(formKey) as File | null;
          
          if (subField.type === 'file') {
            if (subField.required && (!file || file.size === 0)) {
              throw new Error(`กรุณาแนบไฟล์สำหรับผู้เข้าอบรม: ${subField.label}`);
            }
            if (file && file.size > 0) {
              filesToUpload.push({ file, fieldName: formKey });
              newAttendee[subField.id] = { type: 'file_placeholder', name: file.name };
            }
          } else {
            const value = formData.get(formKey) as string;
            if (subField.required && !value) {
              throw new Error(`กรุณากรอกข้อมูลผู้เข้าอบรมให้ครบ: ${subField.label}`);
            }
            newAttendee[subField.id] = value;
          }
        }
        processedAttendees.push(newAttendee as RegistrationAttendee);
      }
      dataToSave[attendeeListField.id] = processedAttendees;
    }
    
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    if (!courseDoc.exists()) throw new Error('Course not found');
    const courseTitle = (courseDoc.data() as Course).title;

    const registrationDocRef = await addDoc(collection(db, 'registrations'), {
      userId: user.uid,
      userDisplayName: user.displayName,
      userEmail: user.email,
      courseId: courseId,
      courseTitle: courseTitle,
      scheduleId: scheduleId,
      registrationDate: new Date().toISOString(),
      status: 'pending',
      formData: dataToSave,
      formSchema: formSchema,
      clientId: linkedClientId,
      clientCompanyName: linkedClientCompanyName,
    });
    const registrationId = registrationDocRef.id;

    const fileUrls: Record<string, string> = {};
    for (const { file, fieldName } of filesToUpload) {
      fileUrls[fieldName] = await uploadFile(file, registrationId, fieldName);
    }
    
    if (filesToUpload.length > 0 && attendeeListField) {
        dataToSave[attendeeListField.id] = dataToSave[attendeeListField.id].map((attendee: any) => {
            const updatedAttendee = {...attendee};
            const fileSubFields = attendeeListField.subFields?.filter(sf => sf.type === 'file') || [];
            for(const subField of fileSubFields) {
                const fileKey = `${subField.id}-${attendee.id}`;
                if (updatedAttendee[subField.id]?.type === 'file_placeholder' && fileUrls[fileKey]) {
                    updatedAttendee[subField.id] = fileUrls[fileKey];
                }
            }
            return updatedAttendee;
        });
        await updateDoc(doc(db, 'registrations', registrationId), {
            formData: dataToSave,
        });
    }

    // Trigger Real Email Notification
    const template = emailTemplates.registrationReceived(user.displayName || 'ลูกค้า', courseTitle);
    await sendEmail({
        to: user.email!,
        subject: template.subject,
        html: template.html,
    });

    // Notify System Admins
    await createSystemNotification({
        title: 'มีการลงทะเบียนใหม่',
        message: `${user.displayName || 'ลูกค้า'} ได้ส่งแบบฟอร์มลงทะเบียนหลักสูตร ${courseTitle}`,
        type: 'important',
        link: '/erp/registrations',
        forRole: 'admin',
        sendEmailTo: 'admin@netenergy-tech.com'
    });

    revalidatePath(`/register/${scheduleId}`);
    revalidatePath(`/profile`);
    return { success: true, message: 'ลงทะเบียนสำเร็จแล้ว!', registrationId };

  } catch (error) {
    console.error('Registration Error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด' };
  }
}

export async function getLatestRegistrationForUser(userId: string): Promise<Registration | null> {
    if (!userId) return null;
    try {
        const q = query(
            collection(db, 'registrations'),
            where('userId', '==', userId),
            orderBy('registrationDate', 'desc'),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const latestDoc = querySnapshot.docs[0];
        return { id: latestDoc.id, ...latestDoc.data() } as Registration;
    } catch (error) {
        console.error("Error fetching latest registration:", error);
        return null;
    }
}
