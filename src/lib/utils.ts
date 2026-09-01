import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let _counter = 0;
export function nanoid(): string {
  _counter++;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${_counter}`;
}

export function formatDate(iso: string | Date): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | Date): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

