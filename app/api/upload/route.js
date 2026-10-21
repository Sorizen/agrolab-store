import { NextResponse } from 'next/server';
import { saveImage } from '@/lib/storage';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files');

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const urls = [];
        for (const file of files.slice(0, 20)) {
            urls.push(await saveImage(Buffer.from(await file.arrayBuffer())));
        }
        return NextResponse.json({ urls });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload image' }, { status: 400 });
    }
}
