import { NextResponse } from 'next/server';
import { getSyncOverview } from '@/lib/supplier-sync';

export async function GET() {
    try {
        return NextResponse.json(await getSyncOverview());
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
