/**
 * Health check endpoint
 */

export function handleHealthRequest(): Response {
  return Response.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
}
