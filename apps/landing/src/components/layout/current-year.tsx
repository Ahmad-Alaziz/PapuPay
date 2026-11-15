/** Rendered at build time: the site is a static export, so rebuilds keep it current. */
export function CurrentYear() {
  return <>{new Date().getFullYear()}</>;
}
