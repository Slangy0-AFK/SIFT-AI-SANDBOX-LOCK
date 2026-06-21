import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

import { format } from 'date-fns';

// Now correctly standardizes to the user's local browser timezone rather than forcing Chicago time
export function formatChicagoTime(dateInput, formatStr = 'MMM d, yyyy h:mm:ss a') {
  if (!dateInput) return '--:--:--';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '--:--:--';
    // date-fns format defaults to the user's local timezone
    return format(d, formatStr);
  } catch (e) {
    return '--:--:--';
  }
}

export const formatLocalTime = formatChicagoTime;