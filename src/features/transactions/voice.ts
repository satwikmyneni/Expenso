import { format, subDays } from "date-fns";
import type { TransactionType } from "@/features/finance/types";

interface SpeechRecognitionEventLike extends Event { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechConstructor = new () => SpeechRecognitionLike;

export async function startVoiceCapture(): Promise<string> {
  const browser = window as typeof window & { SpeechRecognition?: SpeechConstructor; webkitSpeechRecognition?: SpeechConstructor };
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) throw new Error("Voice recognition is not supported here. You can still use text entry.");
  return new Promise((resolve, reject) => {
    const recognition = new Constructor();
    let resolved = false;
    recognition.lang = "en-IN"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = (event) => { resolved = true; resolve(event.results[0][0].transcript); };
    recognition.onerror = () => reject(new Error("I couldn't hear that clearly. Please try again."));
    recognition.onend = () => { if (!resolved) reject(new Error("No speech detected.")); };
    recognition.start();
  });
}

export function parseVoiceTransaction(transcript: string): { amount?: string; merchant?: string; type?: TransactionType; date?: string } {
  const normalized = transcript.trim();
  const amount = normalized.match(/(?:₹|rs\.?|rupees?\s*)?([\d,]+(?:\.\d{1,2})?)/i)?.[1]?.replaceAll(",", "");
  const income = /\b(got|received|salary|income|earned|credited)\b/i.test(normalized);
  const yesterday = /\byesterday\b/i.test(normalized);
  const merchantMatch = normalized.match(/(?:at|from)\s+(.+?)(?:\s+(?:today|yesterday))?[.!]?$/i) ?? normalized.match(/(?:for|on)\s+(.+?)(?:\s+(?:today|yesterday))?[.!]?$/i);
  return { amount, type: income ? "income" : "expense", merchant: merchantMatch?.[1]?.replace(/\s+(today|yesterday)$/i, "").trim(), date: format(yesterday ? subDays(new Date(), 1) : new Date(), "yyyy-MM-dd") };
}
