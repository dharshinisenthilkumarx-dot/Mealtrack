import React, { useState } from 'react';
import { Order } from '../types';
import { Printer, Copy, Check, X, ChefHat, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyTextReceipt = () => {
    if (!order) return;
    const itemsText = order.items
      ?.map((it) => `  ${it.quantity}x ${it.item_name} - $${(it.price * it.quantity).toFixed(2)}`)
      .join('\n') || '  1x Order items';

    const text = `
========================================
       FOOD DELIVERY ORDER RECEIPT
========================================
Order ID:       ${order.order_id}
Date:           ${new Date(order.created_at).toLocaleString()}
Restaurant:     ${order.restaurant_name}
Address:        ${order.restaurant_address}

CUSTOMER DETAILS:
Name:           ${order.customer_name}
Delivery To:    ${order.delivery_address}
Phone:          ${order.customer_phone}

ORDER ITEMS:
${itemsText}

----------------------------------------
Subtotal:       $${(order.total_amount - 3.99 - (order.total_amount - 3.99) * 0.08 / 1.08).toFixed(2)}
Delivery Fee:   $3.99
Tax (8%):       $${((order.total_amount - 3.99) * 0.08 / 1.08).toFixed(2)}
TOTAL:          $${order.total_amount.toFixed(2)}
----------------------------------------
Current Status: ${order.current_status}
Payment:        PAID (Card on File / Online)
========================================
  Thank you for choosing ${order.restaurant_name}!
========================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Subtotal and tax computation
  const itemsSubtotal = order.items?.reduce((acc, curr) => acc + curr.price * curr.quantity, 0) || (order.total_amount - 3.99);
  const deliveryFee = 3.99;
  const taxAmount = Math.max(0, order.total_amount - itemsSubtotal - deliveryFee);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between pb-4 mb-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-600" />
            <h3 className="text-base font-bold text-zinc-900 font-display">
              Order Receipt & Invoice
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTextReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="printable-receipt bg-white text-zinc-900 font-sans text-xs space-y-5">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-zinc-300">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 text-orange-600 mb-2">
              <ChefHat className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 font-display">
              {order.restaurant_name}
            </h2>
            <p className="text-zinc-500 text-[11px] mt-0.5">{order.restaurant_address}</p>
            <div className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest mt-2">
              Official Food Delivery Receipt
            </div>
          </div>

          {/* Meta Details */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed border-zinc-300">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Order Reference</span>
              <span className="font-mono text-xs font-bold text-zinc-900">{order.order_id}</span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Order Status</span>
              <span className="font-bold text-zinc-900">{order.current_status}</span>
              <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
                Paid in Full (Card on File)
              </span>
            </div>
          </div>

          {/* Customer & Destination */}
          <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-100 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Customer:</span>
              <span className="font-bold text-zinc-900">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Phone:</span>
              <span className="font-mono text-zinc-700">{order.customer_phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-medium">Dropoff Destination:</span>
              <span className="text-zinc-800 text-right font-medium max-w-[240px] truncate">{order.delivery_address}</span>
            </div>
            {order.notes && (
              <div className="flex justify-between pt-1 border-t border-zinc-200/60 text-amber-800 font-medium">
                <span>Special Instructions:</span>
                <span>{order.notes}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider pb-2 border-b border-zinc-200">
              <span>Item & Qty</span>
              <span>Total</span>
            </div>

            <div className="divide-y divide-zinc-100 py-1">
              {order.items && order.items.length > 0 ? (
                order.items.map((it) => (
                  <div key={it.order_item_id} className="py-2.5 flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-zinc-900 text-xs">
                        {it.quantity}x {it.item_name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                        ${it.price.toFixed(2)} each
                      </div>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 tabular-nums">
                      ${(it.price * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-2 flex justify-between">
                  <span>Custom Meal Package</span>
                  <span className="font-mono font-bold">${order.total_amount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="pt-3 border-t border-dashed border-zinc-300 space-y-1.5 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span>Food Items Subtotal</span>
              <span className="font-mono tabular-nums font-medium text-zinc-900">
                ${itemsSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Courier Delivery Fee</span>
              <span className="font-mono tabular-nums font-medium text-zinc-900">
                ${deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Sales Tax (8%)</span>
              <span className="font-mono tabular-nums font-medium text-zinc-900">
                ${taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-300 text-sm font-extrabold text-zinc-950">
              <span>Total Paid Amount</span>
              <span className="font-mono tabular-nums text-orange-600">
                ${order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Audit Timeline Summary */}
          {order.history && order.history.length > 0 && (
            <div className="pt-3 border-t border-zinc-200">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Fulfillment Timeline Checkpoints
              </span>
              <div className="space-y-1 text-[11px] text-zinc-600">
                {order.history.map((h) => (
                  <div key={h.history_id} className="flex justify-between">
                    <span className="font-medium text-zinc-800">{h.status}</span>
                    <span className="font-mono text-zinc-400 tabular-nums">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barcode & Footer */}
          <div className="text-center pt-4 border-t border-dashed border-zinc-300">
            {/* Visual Barcode bars */}
            <div className="flex items-center justify-center gap-1 h-8 mb-2">
              {[4, 2, 6, 1, 3, 5, 2, 4, 1, 6, 3, 2, 5, 1, 4, 2, 6, 3, 1, 5].map((w, i) => (
                <div
                  key={i}
                  className="bg-zinc-800 h-full"
                  style={{ width: `${w * 1.5}px` }}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
              *{order.order_id}*
            </span>
            <p className="text-[11px] text-zinc-500 mt-2">
              Thank you for ordering with OrderTrack! Please retain this receipt for your records.
            </p>
          </div>
        </div>

        {/* Modal Bottom Close (Hidden in print) */}
        <div className="no-print mt-6 pt-4 border-t border-zinc-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
