
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { User } from "@/lib/types";
import { getUserByUsernameServer as getUserByUsername } from './server-supabase-services';
// Activity logging will be handled in the client-side login page

// إعدادات الإنتاج والتطوير
const isProduction = process.env.NODE_ENV === 'production';

// Helper to construct absolute URLs for server-side fetch
const getBaseUrl = () => process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// إعدادات الجلسة المحسّنة والآمنة
const SESSION_MAX_AGE = isProduction 
  ? 7 * 24 * 60 * 60 // 7 أيام في الإنتاج
  : 30 * 24 * 60 * 60; // 30 يوم في التطوير

const SESSION_UPDATE_AGE = isProduction
  ? 60 * 60 // ساعة واحدة في الإنتاج
  : 24 * 60 * 60; // 24 ساعة في التطوير

// Basic in-memory rate limiting and delay for credential login attempts
// Note: This is process-memory based and resets on server restarts. For production-scale, use a shared store.
const loginAttempts = new Map<string, { count: number; first: number }>();
const MAX_ATTEMPTS = 5; // max failed attempts in window
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes window
const FAILURE_DELAY_MS = 300; // small delay to slow brute-force
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  // إعدادات cookies آمنة
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },
  // تعطيل وضع debug لتقليل ضوضاء السجلات أثناء التطوير أيضًا
  debug: false,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Validate input
        if (!credentials?.username || !credentials.password) {
          await delay(FAILURE_DELAY_MS);
          return null;
        }
        
        const username = String(credentials.username);
        const password = String(credentials.password);
        const key = username.toLowerCase();
        const now = Date.now();

        // If exceeded attempts within window, short-circuit
        let rec = loginAttempts.get(key);
        if (rec && (now - rec.first) < WINDOW_MS && rec.count >= MAX_ATTEMPTS) {
          await delay(FAILURE_DELAY_MS);
          return null;
        }

        try {
          const user = await getUserByUsername(username);
          
          if (!user || !user.password) {
            // Count failed attempt
            if (!rec || (now - rec.first) >= WINDOW_MS) {
              rec = { count: 1, first: now };
            } else {
              rec.count += 1;
            }
            loginAttempts.set(key, rec);
            await delay(FAILURE_DELAY_MS);
            return null;
          }
          
          const isPasswordValid = await bcrypt.compare(password, user.password);
          
          if (isPasswordValid) {
            // Reset attempts on success
            loginAttempts.delete(key);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword as any;
          }
          
          // Count failed attempt
          if (!rec || (now - rec.first) >= WINDOW_MS) {
            rec = { count: 1, first: now };
          } else {
            rec.count += 1;
          }
          loginAttempts.set(key, rec);
          await delay(FAILURE_DELAY_MS);
          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          await delay(FAILURE_DELAY_MS);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // إضافة بيانات المستخدم عند تسجيل الدخول
      if (user) {
        const appUser = user as User;
        token.id = appUser.id;
        token.role = appUser.role;
        token.fullName = appUser.fullName;
        token.username = appUser.username;
        token.email = appUser.email;
        token.area = appUser.area;
        token.line = appUser.line;
        token.salesTarget = appUser.salesTarget;
        token.visitsTarget = appUser.visitsTarget;
        token.profilePicture = appUser.profilePicture;
        token.primaryPhone = appUser.primaryPhone;
        token.whatsappPhone = appUser.whatsappPhone;
        token.altPhone = appUser.altPhone;
        
        // إضافة طابع زمني للتحقق من صحة الجلسة
        token.issuedAt = Math.floor(Date.now() / 1000);
        token.sessionVersion = process.env.DEV_COOKIE_VERSION || '1';
      }
      
      // التحقق من صحة الجلسة عند كل طلب
      if (token && !user) {
        // التحقق من وجود البيانات الأساسية
        if (!token.id || !token.role || !token.username) {
          console.error('⚠️ Invalid token: Missing required fields');
          return {}; // إرجاع token فارغ لإنهاء الجلسة
        }
        
        // التحقق من إصدار الجلسة (عملية إبطال الجلسات القديمة)
        const currentVersion = process.env.DEV_COOKIE_VERSION || '1';
        if (token.sessionVersion && token.sessionVersion !== currentVersion) {
          console.log('⚠️ Session version mismatch - invalidating');
          return {}; // إنهاء الجلسة للإصدارات القديمة
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        const userSession = session.user as any;
        userSession.id = token.id;
        userSession.role = token.role;
        userSession.fullName = token.fullName;
        userSession.username = token.username;
        userSession.email = token.email;
        userSession.area = token.area;
        userSession.line = token.line;
        userSession.salesTarget = token.salesTarget;
        userSession.visitsTarget = token.visitsTarget;
        userSession.profilePicture = token.profilePicture;
        userSession.primaryPhone = token.primaryPhone;
        userSession.whatsappPhone = token.whatsappPhone;
        userSession.altPhone = token.altPhone;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Ensure redirect uses correct port
      const correctBaseUrl = process.env.NEXTAUTH_URL || baseUrl;
      
      // If url is relative, prefix with correct base URL
      if (url.startsWith('/')) {
        return `${correctBaseUrl}${url}`;
      }
      // If url is same origin, return as-is
      else if (new URL(url).origin === new URL(correctBaseUrl).origin) {
        return url;
      }
      // Otherwise redirect to correct base URL
      return correctBaseUrl;
    }
  },
  pages: {
    signIn: '/login',
  },
};

export default NextAuth(authOptions);
