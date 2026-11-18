'use client';

import ProductPicker from './ProductPicker';

const money = (value) => Number(value || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

export default function HiddenProducts({ products, onHide, onShow, busyId }) {
    return (
        <div>
            <ProductPicker onPick={onHide} />
            <p className="vis-hint">Оберіть товар у списку, щоб приховати його. Синхронізація більше не покаже його на сайті.</p>
            {products.length === 0 ? (
                <p className="vis-empty">Окремо прихованих товарів немає</p>
            ) : (
                <div className="vis-tree">
                    {products.map((product) => (
                        <div className="vis-row" key={product.id}>
                            <span className="vis-name">
                                {product.title}
                                {product.article && <small>Код: {product.article}</small>}
                            </span>
                            <span className="vis-count">₴{money(product.price)}</span>
                            <span className="vis-action">
                                <button type="button" className="btn-small btn-edit" disabled={busyId === product.id} onClick={() => onShow(product)}>Показати</button>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
