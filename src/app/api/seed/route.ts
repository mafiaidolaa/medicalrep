import { NextRequest, NextResponse } from 'next/server'
import { seedSupabase } from '@/lib/supabase-services'

// In-memory flag to prevent concurrent seeding
let isSeeding = false;
let lastSeedTime = 0;
const SEED_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === 'true';

    // تسريع فائق: تعطيل seeding في التطوير إذا تم تعيين SKIP_SEED — يسمح بالتجاوز مع force=true
    if (process.env.SKIP_SEED === 'true' && !force) {
      return NextResponse.json(
        { message: 'Seeding skipped for faster development (set SKIP_SEED=false or use ?force=true)' },
        { status: 200 }
      )
    }

    // In production, allow only with explicit force
    if (process.env.NODE_ENV === 'production' && !force) {
      return NextResponse.json(
        { message: 'Seeding disabled in production. Use ?force=true if you explicitly want to seed.' },
        { status: 200 }
      )
    }

    // Check if seeding is already in progress
    if (isSeeding) {
      return NextResponse.json(
        { message: 'Database seeding already in progress' },
        { status: 202 }
      )
    }

    // Check cooldown period (bypass with force)
    const now = Date.now();
    if (!force && now - lastSeedTime < SEED_COOLDOWN) {
      const remainingTime = Math.ceil((SEED_COOLDOWN - (now - lastSeedTime)) / 1000);
      return NextResponse.json(
        { message: `Seeding on cooldown. Try again in ${remainingTime} seconds.` },
        { status: 429 }
      )
    }

    isSeeding = true;
    console.log('Starting optimized database seeding...')
    
    const startTime = performance.now();
    await seedSupabase()
    const endTime = performance.now();
    
    lastSeedTime = now;
    console.log(`Database seeding completed successfully in ${(endTime - startTime).toFixed(2)}ms`)

    return NextResponse.json(
      { 
        message: 'Database seeded successfully',
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        forced: force
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    isSeeding = false;
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Seeding endpoint. Use POST to seed the database.' },
    { status: 200 }
  )
}