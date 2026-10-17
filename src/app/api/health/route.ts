// Docker HEALTHCHECK and Lattice's health checks hit this.
export function GET() {
  return Response.json({ status: "ok" });
}
