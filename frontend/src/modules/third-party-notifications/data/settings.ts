export interface EmailSettings { server: string; ssl: boolean; port: number | undefined; sender: string; auth: string; password: string }
export interface SmsSettings { enabled: boolean; platform: string; endpoint: string; keyId: string; appId: string; secret: string; signature: string; limit: number | undefined }
// No notification API contract exists. Configuration is held in memory only;
// credentials are never written to browser storage or sent to a provider.
export const emailSettings: EmailSettings = { server: '', ssl: true, port: undefined, sender: '', auth: '', password: '' };
export const smsSettings: SmsSettings = { enabled: true, platform: '', endpoint: '', keyId: '', appId: '', secret: '', signature: '', limit: 20 };
