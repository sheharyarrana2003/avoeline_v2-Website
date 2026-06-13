// 1. Define the deepest nested object first
export interface CertificateRequirements {
    minAttendance: number;
    mustCompleteSurvey: boolean;
}

// 2. Define the configuration object
export interface CertificateConfig {
    issueCertificates: boolean;
    // Using a Union Type restricts this to specific strings to prevent typos!
    certificateType: "digital" | "physical"; 
    templateId: string;
    requirements: CertificateRequirements;
}

// 3. Define the main Speaker interface
export interface Speaker {
    eventId: string;
    organizerId: string;
    speakerId: string;
    name: string;
    designation: string; // Used for "Title/Designation" in your form
    bio: string;
    profileImage: string; // Used for "Upload Photo" in your form
    sessionTitle: string; // Used for "Assigned Sessions" in your form
    company: string; // Used for "Assigned Sessions" in your form
    certificateConfig: CertificateConfig;
}