// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  getMyAccessTo,
  getTheirAccessToMe,
  permsOf,
  subscribeConnections,
  NO_PERMS,
} from "@/lib/api/connections";

/**
 * Communication permissions between me and a peer.
 * `perms` = what the peer has granted ME (drives which buttons render).
 */
export function useConnection(myId: string | undefined, peerId: string | undefined) {
  const q = useQuery({
    queryKey: ["connection", myId, peerId],
    enabled: !!myId && !!peerId && myId !== peerId,
    queryFn: async () => {
      const [mine, theirs] = await Promise.all([
        getMyAccessTo(myId!, peerId!),
        getTheirAccessToMe(myId!, peerId!),
      ]);
      return { mine, theirs };
    },
  });

  useEffect(() => {
    if (!myId) return;
    return subscribeConnections(myId, () => q.refetch());
  }, [myId, peerId]);

  const mine = q.data?.mine ?? null;
  const theirs = q.data?.theirs ?? null;
  return {
    loading: q.isLoading,
    row: mine,
    incoming: theirs,
    perms: mine ? permsOf(mine) : NO_PERMS,
    status: mine?.status ?? null,
    iBlockedThem: theirs?.status === "blocked",
    refetch: q.refetch,
  };
}
