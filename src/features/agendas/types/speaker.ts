// 1. Define the deepest nested object first
export interface CertificateRequirements {
    minAttendance: number;
    mustCompleteSurvey: boolean;
}

// 2. Define the configuration object
export interface CertificateConfig {
    issueCertificates: boolean;
    // Using a Union Type restricts this to specific strings to prevent typos!
    certificateType: string; 
    templateId: string;
    requirements: CertificateRequirements;
}

