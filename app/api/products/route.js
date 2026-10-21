import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getMarkupPercent, retailPrice } from '@/lib/pricing';
import { getProductById, listProductsAdmin, deleteProduct, updateProduct } from '@/lib/data';

function revalidateProductPages() {
    revalidatePath('/product/[id]', 'page');
    revalidatePath('/');
}

export async function GET(request) {
    try {
        const sp = request.nextUrl.searchParams;
        if (sp.get('id')) {
            const product = await getProductById(sp.get('id'), { admin: true });
            return product
                ? NextResponse.json(product)
                : NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const result = await listProductsAdmin({
            q: sp.get('q') || '',
            page: sp.get('page') || 1,
            source: sp.get('source') || 'all',
            status: sp.get('status') || 'all',
            categoryId: sp.get('cat') || null,
        });
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        if (!body.id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }
        const updates = {};
        for (const key of ['price', 'active', 'featured', 'syncLocked']) {
            if (body[key] !== undefined) updates[key] = body[key];
        }
        if (updates.syncLocked === false) {
            const { rows } = await query('select supplier_price from products where id = $1', [body.id]);
            if (rows[0]?.supplier_price > 0) updates.price = retailPrice(rows[0].supplier_price, await getMarkupPercent());
            else delete updates.price;
        }
        const saved = await updateProduct(body.id, updates);
        revalidateProductPages();
        return NextResponse.json(saved);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        if (!body.id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }
        const result = await deleteProduct(body.id);
        revalidateProductPages();
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
