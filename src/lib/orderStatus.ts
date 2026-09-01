import type { OrderStatus } from '@/types/erp';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  pending: 'Pending',
  assigned: 'Assigned',
  wax_in_progress: 'Wax In Progress',
  wax_completed: 'Wax Completed',
  stone_setting_pending: 'Stone Setting Pending',
  stone_setting_in_progress: 'Stone Setting',
  stone_setting_completed: 'Stone Completed',
  production_completed: 'Production Complete',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  confirmed: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-purple-100 text-purple-800',
  wax_in_progress: 'bg-orange-100 text-orange-800',
  wax_completed: 'bg-amber-100 text-amber-800',
  stone_setting_pending: 'bg-pink-100 text-pink-800',
  stone_setting_in_progress: 'bg-indigo-100 text-indigo-800',
  stone_setting_completed: 'bg-teal-100 text-teal-800',
  production_completed: 'bg-green-100 text-green-800',
  ready: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-100 text-red-800',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'draft', 'confirmed', 'pending', 'assigned',
  'wax_in_progress', 'wax_completed',
  'stone_setting_pending', 'stone_setting_in_progress', 'stone_setting_completed',
  'production_completed', 'ready', 'delivered',
];

export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  if (current === 'cancelled') return [];
  const idx = ORDER_STATUS_FLOW.indexOf(current);
  const next: OrderStatus[] = [];
  if (idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1) {
    next.push(ORDER_STATUS_FLOW[idx + 1]);
  }
  // Always allow cancellation unless delivered or already cancelled
  const nonCancellable: OrderStatus[] = ['delivered', 'cancelled'];
  if (!nonCancellable.includes(current)) {
    next.push('cancelled');
  }
  return next;
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}
