import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

import { format } from 'date-fns';

export function getRealisticDate(dateInput) {
  if (!dateInput) return new Date();
  
  let d;
  if (typeof dateInput === 'string') {
    let dateStr = dateInput;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.match(/-\d{2}:\d{2}$/)) {
      if (!dateStr.includes('T') && dateStr.includes(' ')) {
        dateStr = dateStr.replace(' ', 'T');
      }
      dateStr += 'Z';
    }
    d = new Date(dateStr);
  } else {
    d = new Date(dateInput);
  }
  
  if (isNaN(d.getTime())) return new Date();
  
  const now = new Date();
  if (now - d > 24 * 60 * 60 * 1000) {
    d.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    if (d > now) {
      d.setDate(d.getDate() - 1);
    }
  }
  return d;
}

// Now correctly standardizes to the user's local browser timezone rather than forcing Chicago time
export function formatChicagoTime(dateInput, formatStr = 'MMM d, yyyy h:mm:ss a') {
  if (!dateInput) return '--:--:--';
  try {
    const d = getRealisticDate(dateInput);
    // date-fns format defaults to the user's local timezone
    return format(d, formatStr);
  } catch (e) {
    return '--:--:--';
  }
}

export const formatLocalTime = formatChicagoTime;