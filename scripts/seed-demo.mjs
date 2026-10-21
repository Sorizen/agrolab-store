import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { getPool, query } from '../lib/db.js';
import { addProduct, updateProduct } from '../lib/data.js';
import { importAndLog } from '../lib/supplier-sync.js';
import { createUser, findUserByEmail } from '../lib/users.js';
import { saveImage } from '../lib/storage.js';

export const DEMO_ADMIN = { email: 'admin@agrolab.local', password: 'admin12345' };
export const DEMO_CUSTOMER = { email: 'customer@agrolab.local', password: 'customer123' };

const require = createRequire(import.meta.url);
const iconDir = path.join(path.dirname(require.resolve('lucide-react/package.json')), 'dist/esm/icons');

function iconMarkup(name) {
  const src = readFileSync(path.join(iconDir, `${name}.js`), 'utf8');
  const literal = /const __iconNode = (\[[\s\S]*?\]);/.exec(src)?.[1];
  const nodes = literal ? new Function(`return ${literal}`)() : [];
  return nodes
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
}

async function makeImage(icon, stroke, accent) {
  try {
    const sharp = (await import('sharp')).default;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EDE5D5"/></radialGradient></defs>
      <rect width="800" height="800" fill="url(#g)"/>
      <circle cx="400" cy="400" r="255" fill="${accent}" opacity="0.22"/>
      <g transform="translate(160 160) scale(20)" fill="none" stroke="${stroke}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${iconMarkup(icon)}</g>
    </svg>`;
    return await saveImage(await sharp(Buffer.from(svg)).png().toBuffer());
  } catch (error) {
    console.warn(`  (image skipped: ${error.message})`);
    return null;
  }
}
const photos = async (icon, a, b) => (await Promise.all([makeImage(icon, '#2B4D1A', a), makeImage(icon, '#A9862F', b)])).filter(Boolean);

const SUPPLIER_ITEMS = [
  {
    id: 2091755252, part_number: '600-1118010.01', brand: 'БЗТДиА', price: 14765.0, currency: 'UAH', availability: 'in_stock', status: 'active',
    title: 'Турбокомпресор ТКР-6 (01) МТЗ (600-1118010.01) Оригінал',
    url: 'https://agrolosk.com.ua/ua/p2091755252-turbokompressor-tkr-mtz.html',
    description: 'Виробник: БЗТДиА (Бобруйський завод тракторних деталей і агрегатів)\nТип запчастини: Оригінал\nСтан: Новий\n\nТурбокомпресори серії ТКР 6 призначені для наддуву двигунів і підвищення їх ККД.\nЗастосування: двигуни Д-245 (МТЗ-100, -1021, -1025), Д-240 (МТЗ-80, -82).\n\nТехнічні характеристики:\nТиск наддуву, бар: 0,9–1,1\nЧастота обертання ротора, об/хв: 120000\nМаса, кг: 6,9',
    main_image: 'https://images.prom.ua/5381614641_turbokompresor-tkr-6-01.jpg',
    images: ['https://images.prom.ua/5381614641_turbokompresor-tkr-6-01.jpg', 'https://images.prom.ua/5381614643_turbokompresor-tkr-6-01.jpg', 'https://images.prom.ua/5381614649_turbokompresor-tkr-6-01.jpg'],
    attributes: [{ name: 'Виробник', value: 'БЗТДиА' }, { name: 'Тип запчастини', value: 'Оригінал' }, { name: 'Країна виробник', value: 'Білорусь' }, { name: 'Гарантійний термін', value: '12 міс' }, { name: 'Сумісність з маркою', value: 'МТЗ' }, { name: 'Застосування', value: 'МТЗ-82' }],
    category_path: ['Запчастини до тракторів', 'Запчастини до трактору МТЗ ОРИГІНАЛ', 'Двигун Д-240 / Д-245'],
    first_seen_at: '2026-10-09T20:29:30Z',
  },
  {
    id: 9000000002, part_number: 'НШ-32М-3', brand: 'Гидросила', price: 3450, currency: 'UAH', availability: 'in_stock', status: 'active',
    title: 'Насос шестерний НШ-32М-3 лівого обертання',
    url: 'https://agrolosk.com.ua/ua/p9000000002-demo.html',
    description: 'Шестерний насос для гідросистем тракторів МТЗ, ЮМЗ, Т-150.\nРобочий об\'єм: 32 см³\nНомінальний тиск: 16 МПа\nНапрям обертання: лівий',
    attributes: [{ name: 'Виробник', value: 'Гидросила' }, { name: 'Робочий об\'єм', value: '32 см³' }, { name: 'Тиск', value: '16 МПа' }, { name: 'Сумісність з маркою', value: 'МТЗ, ЮМЗ, Т-150' }],
    category_path: ['Гідравліка', 'Насоси', 'Насоси шестерні НШ'],
  },
  {
    id: 9000000003, part_number: '6206-2RS', brand: 'SKF', price: 412, currency: 'UAH', availability: 'on_order', status: 'active',
    title: 'Підшипник кульковий 6206-2RS (180206) SKF',
    url: 'https://agrolosk.com.ua/ua/p9000000003-demo.html',
    description: 'Радіальний кульковий підшипник з двома гумовими ущільненнями.\nРозміри: 30×62×16 мм',
    attributes: [{ name: 'Виробник', value: 'SKF' }, { name: 'Розміри', value: '30×62×16 мм' }, { name: 'Аналог', value: '180206' }],
    category_path: ['Підшипники', 'Кулькові', 'Серія 62xx'],
  },
  {
    id: 9000000004, part_number: 'AZJ3381', brand: 'Jubana', price: 6890, currency: 'UAH', availability: 'out_of_stock', status: 'active',
    title: 'Стартер редукторний 12В 2,8 кВт МТЗ (Д-240)',
    url: 'https://agrolosk.com.ua/ua/p9000000004-demo.html',
    description: 'Редукторний стартер замість штатного, легший запуск взимку.\nНапруга: 12 В\nПотужність: 2,8 кВт',
    attributes: [{ name: 'Виробник', value: 'Jubana' }, { name: 'Напруга', value: '12 В' }, { name: 'Потужність', value: '2,8 кВт' }],
    category_path: ['Запчастини до тракторів', 'Запчастини до трактору МТЗ ОРИГІНАЛ', 'Електрообладнання'],
  },
  {
    id: 9000000005, part_number: 'ЦС-100.200', brand: 'Гидросила', price: 5320, currency: 'UAH', availability: 'in_stock', status: 'active',
    title: 'Гідроциліндр ЦС-100×200',
    url: 'https://agrolosk.com.ua/ua/p9000000005-demo.html',
    description: 'Гідроциліндр навісної системи. Діаметр поршня 100 мм, хід 200 мм.',
    attributes: [{ name: 'Виробник', value: 'Гидросила' }, { name: 'Хід штока', value: '200 мм' }],
    category_path: ['Гідравліка', 'Гідроциліндри'],
  },
  {
    id: 9000000006, part_number: '70-1601130', brand: 'ММЗ', price: 2150, currency: 'UAH', availability: 'in_stock', status: 'inactive',
    title: 'Диск зчеплення МТЗ-80 (70-1601130)',
    url: 'https://agrolosk.com.ua/ua/p9000000006-demo.html',
    description: 'Ведений диск зчеплення. Постачальник зняв з продажу (статус inactive), тому товар прихований.',
    attributes: [{ name: 'Виробник', value: 'ММЗ' }],
    category_path: ['Запчастини до тракторів', 'Запчастини до трактору МТЗ ОРИГІНАЛ', 'Трансмісія'],
  },
];

export async function seedDemo({ log = console.log } = {}) {

  const sync = await importAndLog(SUPPLIER_ITEMS, { mode: 'file' });
  log(`  supplier items: ${sync.inserted} added (1 marked inactive by the supplier → hidden)`);
  const idOf = async (supplierId) => (await query('select id from products where supplier_id = $1', [supplierId])).rows[0].id;
  const [turbo, pump, bearing, starter, cylinder, clutch] = await Promise.all(SUPPLIER_ITEMS.map((i) => idOf(i.id)));

  await updateProduct(turbo, { featured: true });
  await updateProduct(pump, { images: await photos('cog', '#C8A44A', '#6B8F4E'), featured: true });
  await updateProduct(bearing, { images: await photos('disc', '#5BA8D4', '#C8A44A') });
  await updateProduct(starter, { images: await photos('zap', '#C8A44A', '#B5532A') });
  await updateProduct(clutch, { images: await photos('settings-2', '#6B8F4E', '#C8A44A') });

  await updateProduct(cylinder, {
    images: await photos('cylinder', '#6B8F4E', '#5BA8D4'),
    title: 'Гідроциліндр ЦС-100×200 (перевірений, з гарантією 6 міс)',
    price: 5600,
    syncLocked: true,
  });

  const filter = await addProduct({
    title: 'Фільтр масляний М-025-1012005 (Д-240, Д-245)',
    article: 'М-025-1012005',
    brand: 'Промбизнес',
    shortDescription: 'Повнопотоковий фільтр для двигунів ММЗ. Ціна нижча за мінімальне замовлення: перевірте поріг 200 ₴ у кошику.',
    description: 'Фільтр очищення масла для двигунів Д-240, Д-243, Д-245.\nЗамінювати кожні 250 мотогодин.\n\nКомплектація: фільтр, ущільнювальне кільце.',
    price: 185, stock: 24, availability: 'in_stock',
    category: 'Фільтри та мастила', featured: true,
    weight: 0.6, length: 12, width: 12, height: 18,
    tags: ['фільтр', 'масляний фільтр', 'ФМ-009', 'ТО'],
    specs: { 'Виробник': 'Промбизнес', 'Тип': 'Масляний', 'Різьба': 'М27×2', 'Висота, мм': '180' },
    images: await photos('funnel', '#C8A44A', '#6B8F4E'),
  });
  await addProduct({
    title: 'Ремінь клиновий вентилятора',
    article: '11×10-1250',
    brand: 'Optibelt',
    shortDescription: 'Клиновий ремінь привода вентилятора.',
    description: 'Клиновий ремінь привода вентилятора і генератора. Підходить для МТЗ, ЮМЗ, ДТ-75.',
    price: 260, stock: 50, availability: 'in_stock',
    category: 'Ремені та ланцюги',
    weight: 0.2,
    specs: { 'Виробник': 'Optibelt', 'Профіль': '11×10' },
    images: await photos('settings-2', '#5BA8D4', '#C8A44A'),
  });
  await addProduct({
    title: 'Фарба для сільгосптехніки, 0,9 л',
    article: 'PAINT-09',
    brand: 'Агрофарб',
    shortDescription: 'Алкідна емаль для тракторів і причепів.',
    description: 'Стійка до мастил і погодних умов. Витрата 100–120 г/м².',
    price: 395, stock: 30, availability: 'in_stock',
    category: 'Фарби та хімія',
    weight: 1.1,
    specs: { 'Обʼєм': '0,9 л', 'Тип': 'Алкідна емаль' },
    images: await photos('paint-bucket', '#B5532A', '#5BA8D4'),
  });
  await addProduct({
    title: 'Сидіння тракторне з механічною підвіскою',
    article: 'SEAT-MTZ-01',
    brand: 'Агролаб',
    shortDescription: 'Ціна залежить від комплектації: «Ціна за запитом».',
    description: 'Сидіння з регулюванням по вазі оператора та нахилу спинки. Встановлюється на МТЗ-80/82 без доробок.',
    price: 0, stock: 0, availability: 'on_order', featured: true,
    category: 'Кабіна та сидіння',
    specs: { 'Регулювання': 'Вага, нахил, поздовжнє', 'Матеріал': 'Штучна шкіра' },
    sections: [
      { type: 'features', title: 'Переваги', items: [
        { icon: '🛠', title: 'Без доробок', description: 'Штатні кріплення МТЗ-80/82' },
        { icon: '💺', title: 'Підвіска', description: 'Менше втоми за зміну' },
        { icon: '🛡', title: 'Гарантія', description: '12 місяців' },
      ] },
      { type: 'text', title: 'Встановлення', content: 'Зніміть старе сидіння.\nЗакріпіть нове на штатних болтах.\nНалаштуйте під вагу оператора.' },
      { type: 'banner', icon: '📞', title: 'Потрібна консультація?', content: 'Зателефонуйте: підберемо сидіння під вашу кабіну.' },
    ],
    images: await photos('armchair', '#6B8F4E', '#C8A44A'),
  });
  log('  hand-made products: 4 added');

  for (const [account, role, profile] of [
    [DEMO_ADMIN, 'admin', { first_name: 'Адмін' }],
    [DEMO_CUSTOMER, 'customer', { first_name: 'Тарас', last_name: 'Шевченко', phone: '098 123 45 67', city: 'Київ', branch: 'Відділення №1' }],
  ]) {
    if (!(await findUserByEmail(account.email))) await createUser({ ...account, role, ...profile });
  }
  const customer = await findUserByEmail(DEMO_CUSTOMER.email);

  const order = (o) => query(
    `insert into orders (user_id, customer_first_name, customer_last_name, customer_email, customer_phone, delivery_city,
       delivery_branch, comment, total_amount, status, payment_method, payment_status, payment_metadata, items, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now() - $15::interval)`,
    [o.userId, o.first, o.last, o.email, o.phone, o.city, o.branch, o.comment, o.total, o.status, o.method, o.payment,
      o.meta ? JSON.stringify(o.meta) : null, JSON.stringify(o.items), o.ago]
  );
  await order({
    userId: customer.id, first: 'Тарас', last: 'Шевченко', email: DEMO_CUSTOMER.email, phone: '+38 098 123 45 67',
    city: 'Київ', branch: 'Відділення №1', comment: 'Передзвоніть перед відправкою', total: 3820, status: 'Нове',
    method: 'Оплата при отриманні', payment: 'Оплата при отриманні', ago: '2 hours',
    items: [{ id: filter.id, title: filter.title, article: filter.article, quantity: 2, price: 185 }, { id: pump, title: 'Насос шестерний НШ-32М-3 лівого обертання', article: 'НШ-32М-3', quantity: 1, price: 3450 }],
  });
  await order({
    userId: null, first: 'Олена', last: 'Коваль', email: 'olena@example.com', phone: '+38 067 555 12 34',
    city: 'Полтава', branch: 'Відділення №7', comment: '', total: 14765, status: 'Відправлено',
    method: 'Оплата карткою онлайн', payment: 'Сплачено', meta: { maskedPan: '537541******1234', tranId: 'demo-001' }, ago: '1 day',
    items: [{ id: turbo, title: SUPPLIER_ITEMS[0].title, article: SUPPLIER_ITEMS[0].part_number, quantity: 1, price: 14765 }],
  });
  await query(
    `insert into support_requests (user_id, customer_first_name, customer_last_name, customer_email, customer_phone, message)
     values ($1, 'Тарас', 'Шевченко', $2, '+38 098 123 45 67', 'Чи підійде турбокомпресор ТКР-6 на МТЗ-82 з двигуном Д-243?')`,
    [customer.id, DEMO_CUSTOMER.email]
  );
  log('  accounts, 2 orders, 1 support request added');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const { rows } = await query('select count(*) as n from products');
    if (rows[0].n > 0 && !process.argv.includes('--force')) {
      console.log(`The database already has ${rows[0].n} products. Not adding demo data (use --force).`);
    } else {
      console.log('Adding demo data…');
      await seedDemo();
      console.log(`Done. Admin: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
    }
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await getPool()?.end();
  }
}
