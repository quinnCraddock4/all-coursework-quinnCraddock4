import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { CartItem as CartItemType } from '../types';
import CartItem from './CartItem';

export default function CartList() {
  const [items, setItems] = useState<CartItemType[]>([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleNameChange = (id: string, name: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, name } : item
      )
    );
  };

  const handleQuantityIncrease = (id: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id && item.quantity < 10
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleQuantityDecrease = (id: string) => {
    setItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity - 1;
            // If quantity would become 0 or less, remove the item
            if (newQuantity <= 0) {
              return null;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item): item is CartItemType => item !== null);
    });
  };

  const handleAddItem = () => {
    const newItem: CartItemType = {
      id: nanoid(),
      name: '',
      quantity: 1,
    };
    setItems((prevItems) => [...prevItems, newItem]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        {totalItems > 0 && (
          <span className="badge bg-primary rounded-pill fs-6 ms-2 px-3 py-1 text-white rounded-full text-base bg-blue-500">
            {totalItems}
          </span>
        )}
      </div>

      <button
        onClick={handleAddItem}
        className="mb-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        Add Item
      </button>

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-lg">
          Your cart is empty! Add some items to it.
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onNameChange={handleNameChange}
              onQuantityIncrease={handleQuantityIncrease}
              onQuantityDecrease={handleQuantityDecrease}
            />
          ))}
        </div>
      )}
    </div>
  );
}

