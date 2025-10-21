import { auth, handlers, signIn, signOut } from "@/lib/auth-config";

export { handlers, auth, signIn, signOut };
export const { GET, POST } = handlers;
