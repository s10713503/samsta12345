import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPublicPostPreview } from "@/lib/public-post.functions";

const SITE = "https://project--34ef53e2-79d6-4739-af02-bb0528af0794.lovable.app";

export const Route = createFileRoute("/p/$postId")({
  loader: ({ params }) => getPublicPostPreview({ data: { postId: params.postId } }),
  errorComponent: () => <Fallback message="This post could not be loaded." />,
  notFoundComponent: () => <Fallback message="This post no longer exists." />,
  head: ({ params, loaderData }) => {
    const preview = loaderData as Awaited<ReturnType<typeof getPublicPostPreview>> | undefined;
    const who = preview?.username ? `@${preview.username}` : (preview?.fullName ?? "a Samsta member");
    const title = preview?.isPrivate
      ? "Private post — Samsta"
      : `${preview?.caption?.slice(0, 60) || `A ${preview?.kind ?? "post"}`} — Samsta`;
    const description = preview?.isPrivate
      ? "This account is private. Follow to see their posts on Samsta."
      : `Shared by ${who} on Samsta — moments, reels and podcasts.`;
    const image = `${SITE}/api/public/og/post/${params.postId}`;
    const url = `${SITE}/p/${params.postId}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Samsta" },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PostDeepLink,
});

function Fallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 px-8 text-center">
      <h1 className="font-display text-xl italic">Samsta</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function PostDeepLink() {
  const { postId } = Route.useParams();
  const preview = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!preview) return;
    void navigate({
      to: "/profile/$userId",
      params: { userId: preview.userId },
      search: { post: postId },
      replace: true,
    });
  }, [preview, postId, navigate]);

  if (!preview) return <Fallback message="This post no longer exists." />;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Opening this post…</p>
    </div>
  );
}
