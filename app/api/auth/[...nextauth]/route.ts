import { handlers } from "@/auth"; // @/auth は auth.ts を指します

// GETリクエストとPOSTリクエストをNextAuthに任せます。
export const { GET, POST } = handlers;
