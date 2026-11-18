import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { getMarkupPercent, retailSql } from '@/lib/pricing';
import { deleteProduct, resetCategoryTreeCache } from '@/lib/data';
import { categoryVisibilityTree, hiddenCategorySql, setCategoryHidden, setCategoryOwnPhotos } from '@/lib/visibility';

const HIDDEN_PRODUCTS_LIMIT = 200;

function refreshPublicPages() {
    resetCategoryTreeCache();
    revalidatePath('/product/[id]', 'page');
    revalidatePath('/');
}

export async function GET() {
    try {
        const [categories, { rows: hiddenProducts }] = await Promise.all([
            categoryVisibilityTree(),
            query(
                `select id, title, article, price from products
                 where supplier_id is not null and sync_locked and not active
                 order by updated_at desc limit ${HIDDEN_PRODUCTS_LIMIT}`
            ),
        ]);
        return NextResponse.json({ categories, hiddenProducts });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const hidden = Boolean(body.hidden);

        if (body.categoryId !== undefined && body.ownPhotos !== undefined) {
            const id = Number(body.categoryId);
            if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Невірна група' }, { status: 400 });
            await setCategoryOwnPhotos(id, Boolean(body.ownPhotos));
            return NextResponse.json({ ok: true });
        }

        if (body.categoryId !== undefined) {
            const id = Number(body.categoryId);
            if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Невірна група' }, { status: 400 });
            const changed = await setCategoryHidden(id, hidden);
            refreshPublicPages();
            return NextResponse.json({ ok: true, changed });
        }

        if (body.productId !== undefined) {
            const id = Number(body.productId);
            if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Невірний товар' }, { status: 400 });
            if (hidden) {
                await deleteProduct(id);
            } else {
                const markup = await getMarkupPercent();
                const { rowCount } = await query(
                    `update products set
                       sync_locked = false,
                       price = case when supplier_price > 0 then ${retailSql('supplier_price', '$2')} else price end,
                       active = coalesce(supplier_active, true) and not ${hiddenCategorySql('category_id')},
                       updated_at = now()
                     where id = $1 and supplier_id is not null`,
                    [id, markup]
                );
                if (!rowCount) return NextResponse.json({ error: 'Товар не знайдено' }, { status: 404 });
            }
            refreshPublicPages();
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Вкажіть групу або товар' }, { status: 400 });
    } catch (error) {
        console.error('Visibility update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
