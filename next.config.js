/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are stable since Next 15 — no opt-in needed.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google avatars
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' } // Facebook avatars
    ]
  }
};
module.exports = nextConfig;
