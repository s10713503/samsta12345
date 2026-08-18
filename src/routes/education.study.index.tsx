// @ts-nocheck
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/education/study/")({
  beforeLoad: () => {
    throw redirect({ to: "/education/study/$exam", params: { exam: "jee" } });
  },
});
