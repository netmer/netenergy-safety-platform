// This data is now managed in Firestore.

export type CourseCategory = {
  id: string;
  title: string;
  description: string;
  image: string;
  hint: string;
  orderIndex?: number;
  parentId?: string | null; // Added for sub-category support
};

export type Course = {
  id:string;
  categoryId: string;
  type: string[]; // Changed from string to string[]
  title: string;
  shortName?: string;
  description:string;
  image: string;
  hint: string;
  tags: string[];
  orderIndex?: number;
  price?: string;
  objectives?: string[];
  topics: string[];
  agenda?: string[];
  benefits: string[];
  qualifications: string[];
  registrationFormId?: string;
  certificateTemplateId?: string;
  validityYears?: number; // New field for certificate validity in years
  deliverables?: DeliverableConfig[]; // Post-training items to ship
};

export type CourseType = {
  id: string;
  name: string;
};

export type TrainingSchedule = {
  id: string;
  courseId: string;
  courseTitle: string; // Denormalized for easy display
  startDate: string; // ISO String yyyy-mm-dd
  endDate: string; // ISO String yyyy-mm-dd
  location: string;
  status: 'เปิดรับสมัคร' | 'เต็ม' | 'เร็วๆ นี้' | 'ยกเลิก';
  instructorName: string;
  instructorTitle: string;
  caregiverIds?: string[]; // Array of UID of AppUser
  caregiverNames?: string[]; // Denormalized nicknames for display
};

export type RegistrationFormSubField = {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'file';
  required: boolean;
  placeholder?: string;
};

export type RegistrationFormFieldOption = {
  id: string;
  label: string;
  value: string;
};

export type RegistrationFormField = {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'file' | 'address' | 'header' | 'page_break' | 'attendee_list' | 'coordinator' | 'company' | 'select' | 'radio';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: RegistrationFormFieldOption[]; // For select and radio
  subFields?: RegistrationFormSubField[];
};

export type RegistrationForm = {
  id: string;
  name: string;
  description?: string;
  fields: RegistrationFormField[];
};

export type IndividualAttendeeStatus = 'pending' | 'confirmed' | 'postponed' | 'cancelled';

export type RegistrationAttendee = Partial<AttendeeData> & {
    id: string; // nanoid for client-side key
    attendeeId?: string; // National ID / Passport
    status: IndividualAttendeeStatus;
    notes?: string; // For postponement or cancellation reasons
};

export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled';
export type AttendeeStatus = 'pending_verification' | 'docs_verified' | 'completed' | 'failed';
export type AttendeeAttendanceStatus = 'present' | 'absent' | 'not_checked_in';

export type AdditionalDoc = {
    id: string;
    name: string;
    url: string;
    uploadedBy: string;
    timestamp: string;
};

// Represents the master profile of a person. ID is their National ID / Passport.
export type AttendeeData = {
    id: string; // This is the attendeeId (National ID / Passport)
    attendeeId: string;
    fullName: string;
    dateOfBirth?: string;
    education?: string;
    profilePicture?: string;
    documents?: AdditionalDoc[]; // Person-specific documents like ID card copy
    // other dynamic fields can be added
    [key: string]: any;
};

// Represents a record of one person attending one course.
export type TrainingRecord = {
    id: string; // Auto-generated ID
    attendeeId: string | null; // National ID / Passport, linking to the 'attendees' collection. Can be null initially.
    attendeeName: string;
    companyName: string;
    registrationId: string; // Original registration this came from
    registrationAttendeeId: string; // Links to the specific attendee object in the registration.
    scheduleId: string;
    courseId: string;
    courseTitle: string;
    completionDate: string; // ISO String
    status: AttendeeStatus;
    attendance: AttendeeAttendanceStatus;
    preTestScore?: string;
    postTestScore?: string;
    seatNumber?: string;
    room?: string;
    recordSpecificDocs?: AdditionalDoc[]; // Documents specific to this training instance
    certificateId?: string; // Unique Certificate ID
    certificateIssueDate?: string; // ISO string
    expiryDate?: string | null; // Certificate expiry date
    // Scale / search fields (populated on completion)
    searchTokens?: string[];      // Array of lowercase search tokens for prefix search
    completionYearCE?: number;    // CE year of completion (for year filter index)
    passedTraining?: boolean;     // true when status === 'completed'
};


// Represents the initial application from a user
export type Registration = {
    id: string;
    userId: string;
    userDisplayName: string;
    userEmail: string;
    courseId: string;
    courseTitle: string;
    scheduleId: string;
    registrationDate: string; // ISO String
    formData: {
        [key:string]: any;
    };
    formSchema: RegistrationFormField[];
    status: RegistrationStatus;
    additionalDocs?: AdditionalDoc[];
    clientId: string | null; // Linked CRM Client ID
    clientCompanyName: string; // Denormalized company name from CRM
    quotationId?: string;
    quotationUrl?: string;
    quotationGenerated?: boolean;
    invoiceId?: string;
    invoiceUrl?: string;
    invoiceGenerated?: boolean;
    receiptId?: string;
    receiptUrl?: string;
    receiptGenerated?: boolean;
    // Payment tracking
    paymentStatus?: 'unpaid' | 'partial' | 'paid';
    totalAmount?: number;
    amountPaid?: number;
    paymentHistory?: PaymentRecord[];
    // Delivery tracking
    deliveryPackageId?: string;
};

export type PaymentRecord = {
    id: string;
    amount: number;
    paidDate: string;       // ISO string
    method: 'transfer' | 'cash' | 'cheque' | 'other';
    reference?: string;     // Bank ref or cheque number
    notes?: string;
    recordedBy: string;     // User display name
    timestamp: string;      // ISO string of when recorded
};

export type AppUser = {
  uid: string;
  email: string;
  displayName?: string;
  nickname?: string;
  photoURL?: string;
  role: 'admin' | 'call_center' | 'training_team' | 'inspection_team' | 'accounting_team';
};

export type Client = {
  id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  logo?: string;
  hint?: string;
  showOnHome?: boolean;
  createdAt: string; // ISO string
};

// New type for Instructor
export type Instructor = {
  id: string;
  name: string;
  title: string;
};

// New type for Center Certification
export type Certification = {
  id: string;
  title: string;
  issuer: string;
  image: string;
  hint: string;
  orderIndex?: number;
};


// Analytics Data Types
export type AnalyticsEvent = {
    id: string;
    eventType: 'pageview';
    path: string;
    referrer: string;
    userId: string | null;
    timestamp: string; // ISO String
};

export type DailyVisitorsData = {
    date: string;
    visitors: number;
};

export type PageViewData = {
    path: string;
    views: number;
};

export type ReferrerData = {
    referrer: string;
    visitors: number;
};

// --- Delivery System ---

export type DeliverableType = 'pvc_card' | 'prize' | 'receipt_physical' | 'invoice_physical' | 'other';

export type DeliverableConfig = {
    type: DeliverableType;
    label: string;         // Thai label e.g. "บัตร PVC"
    enabled: boolean;
    customLabel?: string;  // Used when type === 'other'
};

export type DeliveryItemStatus = 'รอดำเนินการ' | 'กำลังเตรียม' | 'จัดส่งแล้ว' | 'ได้รับแล้ว' | 'ไม่มี';

export type DeliveryItem = {
    type: DeliverableType;
    label: string;
    status: DeliveryItemStatus;
    updatedAt: string;
    updatedBy: string;
    notes?: string;
};

export type DeliveryPackage = {
    id: string;
    registrationId: string;
    courseId: string;
    courseTitle: string;
    scheduleId: string;
    scheduleDate: string;
    clientCompanyName: string;
    recipientName: string;
    recipientAddress: {
        address1: string;
        subdistrict: string;
        district: string;
        province: string;
        postalCode: string;
    };
    overallStatus: DeliveryItemStatus;
    items: DeliveryItem[];
    createdAt: string;
    createdBy: string;
    notes?: string;
    trackingNumber?: string;
};

// Notification System Types
export type AppNotificationType = 'info' | 'success' | 'warning' | 'error' | 'important';

export type AppNotification = {
    id: string;
    title: string;
    message: string;
    type: AppNotificationType;
    link?: string;
    read: boolean;
    forRole: AppUser['role'] | 'all'; // Target audience
    createdAt: string; // ISO String
};
