import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { LoginRequiredError, useAuth } from "@workos-inc/authkit-react";

export function useAuthFromAuthKit() {
  const { isLoading, user, organizationId, getAccessToken } = useAuth();
  const userId = user?.id ?? null;
  const sessionRef = useRef<{
    active: boolean;
    userId: string | null;
    organizationId: typeof organizationId;
    getAccessToken: typeof getAccessToken;
  } | null>(null);

  // Initialize before Convex's passive effect requests a token. Invalidate
  // pending requests when the user or organization changes, or on unmount.
  useLayoutEffect(() => {
    const session = {
      active: !!userId,
      userId,
      organizationId,
      getAccessToken,
    };
    sessionRef.current = session;
    return () => {
      session.active = false;
    };
  }, [userId, organizationId, getAccessToken]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const session = sessionRef.current;
      if (
        !session ||
        session.userId !== userId ||
        session.organizationId !== organizationId ||
        session.getAccessToken !== getAccessToken
      )
        return null;
      // Convex does not catch token-fetch rejections. Allow brief network
      // failures to recover, then return null so login can offer recovery.
      for (let attempt = 0; attempt < 3 && session.active; attempt++) {
        try {
          const token = await session.getAccessToken({
            forceRefresh: forceRefreshToken,
          });
          return session.active ? token : null;
        } catch (error) {
          if (error instanceof LoginRequiredError || attempt === 2) return null;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
      return null;
    },
    [userId, organizationId, getAccessToken],
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated: !!userId, fetchAccessToken }),
    [isLoading, userId, fetchAccessToken],
  );
}
