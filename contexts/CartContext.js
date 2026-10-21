'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { trackAddToCart } from '@/lib/analytics';

const CartContext = createContext();

function slimProduct(product) {
    const weightSpec = product.specs?.['Вага'] ?? product.specs?.['Маса, кг'];
    return {
        id: product.id,
        title: product.title,
        price: product.price,
        article: product.article || '',
        images: product.images?.[0] ? [product.images[0]] : [],
        weight: product.weight ?? null,
        length: product.length ?? null,
        width: product.width ?? null,
        height: product.height ?? null,
        specs: weightSpec ? { 'Вага': weightSpec } : {},
    };
}

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedCart = localStorage.getItem('agrolab_cart');
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                setCart(parsed.map(item => ({ ...item, cartKey: String(item.id) })));
            } catch (e) {
                console.error('Failed to parse cart');
            }
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem('agrolab_cart', JSON.stringify(cart));
        }
    }, [cart, isMounted]);

    const addToCart = (product, quantity = 1) => {
        const cartKey = String(product.id);
        trackAddToCart(product, quantity);

        setCart(prev => {
            const existing = prev.find(item => item.cartKey === cartKey);
            if (existing) {
                return prev.map(item =>
                    item.cartKey === cartKey
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...slimProduct(product), quantity, cartKey }];
        });
    };

    const updateQuantity = (cartKey, quantity) => {
        if (quantity < 1) {
            removeFromCart(cartKey);
            return;
        }
        setCart(prev =>
            prev.map(item =>
                item.cartKey === cartKey ? { ...item, quantity } : item
            )
        );
    };

    const removeFromCart = (cartKey) => {
        setCart(prev => prev.filter(item => item.cartKey !== cartKey));
    };

    const clearCart = () => setCart([]);

    const updatePrices = (prices) => {
        setCart(prev => prev.map(item => (
            prices[item.id] !== undefined ? { ...item, price: prices[item.id] } : item
        )));
    };

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
            updatePrices,
            cartTotal,
            cartCount,
            isMounted,
            isCartOpen,
            openCart,
            closeCart
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
