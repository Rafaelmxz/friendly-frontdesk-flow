import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/lib/user.functions";

export const currentProfileQueryOptions = () =>
  queryOptions({
    queryKey: ["currentUserProfile"],
    queryFn: () => getCurrentUserProfile(),
  });

export function useCurrentRole() {
  const { data } = useSuspenseQuery(currentProfileQueryOptions());

  // O layout autenticado já bloqueia usuários sem vínculo antes de renderizar.
  if (data.unlinked) {
    throw new Error("Você não tem mais acesso a este hotel. Fale com um administrador.");
  }

  return {
    role: data.role,
    isAdmin: data.role === "admin",
    fullName: data.fullName,
    hotelName: data.hotelName,
  };
}
