import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/education/$catKey")({
  component: () => <Outlet />,
});