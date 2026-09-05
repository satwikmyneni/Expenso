const SESSION_PROPAGATION_DELAY_MS = 4_000;

export async function replaceWithAuthenticatedRoute(destination: string) {
  // Auth and PostgREST can briefly straddle adjacent clock seconds just after
  // token issuance. Wait through that boundary before the protected layout
  // mounts and makes its first finance-data request.
  await new Promise((resolve) => setTimeout(resolve, SESSION_PROPAGATION_DELAY_MS));
  window.location.replace(destination);
}
