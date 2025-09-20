export async function GET() {
  if (process.env.SHOW_WELL_KNOWN_WARNINGS === 'true') {
    // eslint-disable-next-line no-console
    console.warn('[.well-known] Served appspecific/com.chrome.devtools.json placeholder');
  }
  return new Response(null, { status: 204 });
}
