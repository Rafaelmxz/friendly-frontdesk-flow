import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/lib/user.functions";

export const currentProfileQueryOptions = () =>
  queryOptions({
    queryKey: ["currentUserProfile"],
    queryFn: () => getCurrentUserProfile(),
  });

export function useCurrentRole() {
  const { data } = useSuspenseQuery(currentProfileQueryOptions());
  return {
    role: data.role,
    isAdmin: data.role === "admin",
    fullName: data.fullName,
    hotelName: data.hotelName,
  };
}
