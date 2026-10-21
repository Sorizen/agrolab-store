import { NextResponse } from 'next/server';
import { getCategoryOptions } from '@/lib/data';

export async function GET() {
    try {
        return NextResponse.json(await getCategoryOptions());
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
