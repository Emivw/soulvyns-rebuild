import type { Configuration } from '@azure/msal-browser';

function getRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || window.location.origin + '/counselor/login/popup';
  }
  return process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI || 'http://localhost:3000/counselor/login/popup';
}

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: process.env.NEXT_PUBLIC_AZURE_AUTHORITY || '',
    redirectUri: getRedirectUri(),
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
  prompt: 'select_account' as const,
};
