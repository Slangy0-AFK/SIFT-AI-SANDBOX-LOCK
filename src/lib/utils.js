import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

import { format } from 'date-fns';

export function formatChicagoTime(dateInput, formatStr = 'MMM d, yyyy h:mm:ss a') {
  if (!dateInput) return '--:--:--';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '--:--:--';
    // Format the date in Chicago timezone as a string, then parse it back
    // This tricks date-fns into formatting the Chicago time as if it were local
    const chicagoTimeStr = d.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const chicagoDate = new Date(chicagoTimeStr);
    return format(chicagoDate, formatStr);
  } catch (e) {
    return '--:--:--';
  }
}