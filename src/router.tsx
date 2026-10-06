import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Page content renders on the client only: the UI language is detected from browser
    // storage, which the server cannot see, so SSR content would mismatch on hydration.
    defaultSsr: false,
  });

  return router;
};
