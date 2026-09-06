import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/lib/user.functions";
import {
  metricsQueryOptions,
  annualPerformanceQueryOptions,
} from "@/features/dashboard/hooks";
import { DashboardPage } from "@/features/dashboard";

const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["currentUserProfile"],
    queryFn: () => getCurrentUserProfile(),
  });

export const Route = createFileRoute("/_authenticated/app")({
  loader: async ({ context }) => {
    const year = new Date().getFullYear();
    await Promise.all([
      context.queryClient.ensureQueryData(profileQueryOptions()),
      context.queryClient.ensureQueryData(metricsQueryOptions()),
      context.queryClient.ensureQueryData(annualPerformanceQueryOptions(year)),
    ]);
  },
  component: AppHome,
  errorComponent: AppError,
});

function AppHome() {
  const { data: profileData } = useSuspenseQuery(profileQueryOptions());

  if (profileData.unlinked) {
    throw new Error("Você não tem mais acesso a este hotel. Fale com um administrador.");
  }

  return <DashboardPage profile={profileData} />;
}

function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Erro ao carregar painel</CardTitle>
        <CardDescription>{error.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}
