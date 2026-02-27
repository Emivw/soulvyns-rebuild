/** @type {import('next').NextConfig} */
function sanitizeEnv(value) {
  if (value == null || typeof value !== 'string') return value
  return value.replace(/\r?\n/g, '').trim()
}

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    NEXT_PUBLIC_AZURE_CLIENT_ID: sanitizeEnv(process.env.NEXT_PUBLIC_AZURE_CLIENT_ID),
    NEXT_PUBLIC_AZURE_AUTHORITY: sanitizeEnv(process.env.NEXT_PUBLIC_AZURE_AUTHORITY),
    NEXT_PUBLIC_AZURE_REDIRECT_URI: sanitizeEnv(process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI),
  },
}

module.exports = nextConfig
