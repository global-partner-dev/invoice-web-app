import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a phone number to the format: 5217221015653
 * Removes all non-digit characters and ensures it starts with country code 52
 * 
 * Examples:
 * - "52 1 722 101 5653" -> "5217221015653"
 * - "+5217221015653" -> "5217221015653"
 * - "+ 52 1 722 101 5653" -> "5217221015653"
 * - "17221015653" -> "5217221015653" (adds 52 if missing)
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");
  
  // If empty, return as is
  if (!digitsOnly) {
    return phone;
  }
  
  // If it already starts with 52, return as is
  if (digitsOnly.startsWith("52")) {
    return digitsOnly;
  }
  
  // If it starts with 1 (Mexican mobile prefix), add country code 52
  if (digitsOnly.startsWith("1")) {
    return `52${digitsOnly}`;
  }
  
  // For other cases, assume it's a Mexican number and add 52
  // This handles cases like "7221015653" -> "527221015653"
  // But we need to check if it's a valid length first
  if (digitsOnly.length >= 10) {
    return `52${digitsOnly}`;
  }
  
  // If it's too short, just add 52 anyway (let validation handle it)
  return `52${digitsOnly}`;
}