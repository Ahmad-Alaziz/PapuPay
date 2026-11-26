import { forwardVenueRequest } from "../../../../server/venue-gateway.mjs";

function handle(request: Request) {
  return forwardVenueRequest(request, process.env.PAPUPAY_API_ORIGIN);
}

export { handle as GET, handle as HEAD, handle as POST, handle as DELETE };
