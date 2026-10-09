import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";
import { isAdminSession } from "./lib/site-auth.server";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const studioAuthMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const url = new URL(request.url);
    const isStudioPage =
      url.pathname === "/" ||
      url.pathname === "/dashboard" ||
      url.pathname.startsWith("/dashboard/");
    if (!isStudioPage || isAdminSession(request)) return next();

    const returnTo = `${url.pathname}${url.search}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?returnTo=${encodeURIComponent(returnTo)}`,
        "Cache-Control": "no-store",
      },
    });
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware, studioAuthMiddleware],
}));
