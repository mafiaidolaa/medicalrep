import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { activityLogger } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    const user = session.user as any;
    
    // Log successful login
    await activityLogger.logLogin(
      user.id,
      true,
      undefined,
      undefined, // no location data
      request
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error logging successful login:', error);
    return NextResponse.json(
      { error: 'Failed to log login' }, 
      { status: 500 }
    );
  }
}