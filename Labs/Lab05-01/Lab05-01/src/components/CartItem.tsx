import type { CartItem as CartItemType } from '../types';

interface CartItemProps {
  item: CartItemType;
  onNameChange: (id: string, name: string) => void;
  onQuantityIncrease: (id: string) => void;
  onQuantityDecrease: (id: string) => void;
}

export default function CartItem({
  item,
  onNameChange,
  onQuantityIncrease,
  onQuantityDecrease,
}: CartItemProps) {
  const isNameValid = item.name.trim() !== '';
  const isPlusDisabled = item.quantity >= 10;
  const isMinusDisabled = item.quantity <= 0;

  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-200">
      <input
        type="text"
        value={item.name}
        onChange={(e) => onNameChange(item.id, e.target.value)}
        className={`CartItem-name form-control px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          isNameValid
            ? 'is-valid border-green-500 focus:ring-green-500'
            : 'is-invalid border-red-500 focus:ring-red-500'
        }`}
        placeholder="Item name"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQuantityDecrease(item.id)}
          disabled={isMinusDisabled}
          className={`CartItem-remove btn btn-danger m-1 px-3 py-1 rounded-md ${
            isMinusDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          -
        </button>
        <span className="text-lg font-semibold min-w-[2rem] text-center">
          {item.quantity}
        </span>
        <button
          onClick={() => onQuantityIncrease(item.id)}
          disabled={isPlusDisabled}
          className={`CartItem-add btn btn-primary m-1 px-3 py-1 rounded-md ${
            isPlusDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}

