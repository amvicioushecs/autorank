import { invokeFn } from '@/lib/invokeFn';

export interface DeployResult { deploymentId: string; url: string; readyState: string; files: number; domainNote: string | null }

export const deploySite = (propertyId: string) => invokeFn<DeployResult>('site-deploy', { propertyId });
