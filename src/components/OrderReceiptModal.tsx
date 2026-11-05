import React from 'react';
import { Order } from '../types';
import { Printer, X, CheckCircle2, MapPin, Phone, Clock, FileText } from 'lucide-react';

interface OrderReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.items
    ? order.items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0)
    : order.total_amount - 3.99 - (order.total_amount * 0.08);
  const deliveryFee = 3.99;
  const tax = Math.round(subtotal * 0.08 * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="no-print p-4 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider font-display">
              Official Food Delivery Receipt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="printable-receipt-card p-6 sm:p-8 text-zinc-900 bg-white font-sans max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center pb-6 border-b border-dashed border-zinc-300">
            <div className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
              Food Delivery Order Tracker
            </div>
            <h2 className="text-xl font-extrabold text-zinc-950 font-display tracking-tight mt-1">
              {order.restaurant_name}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">{order.restaurant_address}</p>
            <div className="text-[11px] text-zinc-400 mt-1">
              Tax Invoice & Delivery Receipt
            </div>

            {/* Stylized Receipt Barcode */}
            <div className="my-3 flex justify-center">
              <div className="font-mono text-xs tracking-[0.3em] font-semibold text-zinc-800 bg-zinc-100 px-4 py-1.5 rounded border border-zinc-200">
                ||| | ||||| | || |||| | ||| {order.order_id}
              </div>
            </div>
          </div>

          {/* Order & Customer Metadata */}
          <div className="py-4 border-b border-dashed border-zinc-300 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Order ID:</span>
              <span className="font-mono font-bold text-zinc-900">{order.order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Order Date:</span>
              <span className="font-mono tabular-nums text-zinc-800">
                {new Date(order.created_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Payment Method:</span>
              <span className="font-semibold text-emerald-700">Digital Paid / Confirmed</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Fulfillment Status:</span>
              <span className="font-bold text-zinc-900">{order.current_status}</span>
            </div>

            {/* Delivery Recipient Info */}
            <div className="pt-2 mt-2 border-t border-zinc-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Recipient Details
              </div>
              <div className="font-semibold text-zinc-900">{order.customer_name}</div>
              <div className="text-zinc-600">{order.delivery_address}</div>
              <div className="text-zinc-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-zinc-400" />
                <span>{order.customer_phone}</span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-4 border-b border-dashed border-zinc-300">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                  <th className="text-left pb-2">Item Description</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Unit</th>
                  <th className="text-right pb-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it) => (
                    <tr key={it.order_item_id} className="py-2">
                      <td className="py-2 text-zinc-800 font-medium max-w-[180px] truncate">
                        {it.item_name}
                      </td>
                      <td className="py-2 text-center font-mono tabular-nums text-zinc-700">
                        {it.quantity}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-zinc-500">
                        ${it.price.toFixed(2)}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums font-semibold text-zinc-900">
                        ${(it.price * it.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-zinc-500 italic">
                      Food Order Fulfillment Bundle
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Totals */}
          <div className="py-4 border-b border-dashed border-zinc-300 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Item Subtotal:</span>
              <span className="font-mono tabular-nums text-zinc-800">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Delivery & Courier Fee:</span>
              <span className="font-mono tabular-nums text-zinc-800">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>City & State Tax (8%):</span>
              <span className="font-mono tabular-nums text-zinc-800">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-zinc-950 pt-2 border-t border-zinc-200">
              <span>Grand Total Paid:</span>
              <span className="font-mono tabular-nums text-orange-600">
                ${order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Timeline Checkpoints */}
          {order.history && order.history.length > 0 && (
            <div className="py-4 border-b border-dashed border-zinc-300">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Order Execution Milestones
              </div>
              <div className="space-y-1.5 text-[11px] text-zinc-600">
                {order.history.map((h) => (
                  <div key={h.history_id} className="flex justify-between">
                    <span className="font-medium text-zinc-800">{h.status}</span>
                    <span className="font-mono text-zinc-400 tabular-nums">
                      {new Date(h.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Receipt Footer */}
          <div className="pt-6 text-center text-[11px] text-zinc-400 space-y-1">
            <div className="font-semibold text-zinc-700">Thank you for ordering with us!</div>
            <div>Please keep this receipt for order verification.</div>
            <div className="font-mono text-[10px] text-zinc-400 mt-2">
              DISPATCH-ID-{order.order_id.replace('ORD-', '')}-{new Date(order.created_at).getTime().toString().slice(-6)}
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls (Hidden in Print) */}
        <div className="no-print p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">Ready to print or save as PDF</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
