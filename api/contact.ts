// Vercel Function for the landing page's contact form (apps/landing).
import { handleContact } from "../apps/landing/server/contact";

export function POST(request: Request) {
  return handleContact(request);
}
