// The Campaigns view's own "Export pool" button (separate from the header
// Export button) — exports just the approved quote pool ("Written for Me"
// comments) that the "Which message" section and its QuoteCards are built
// from, since that's the actual reusable artifact (ad copy candidates), not
// the whole view's analytics.
const { loadCampaignsData } = require('../../../../lib/data');
const { csvResponse } = require('../../../../lib/csv');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const d = await loadCampaignsData();
    const rows = [['Date', 'Platform', 'Quote', 'Likes', 'Title', 'Tags']];
    for (const c of d.writtenForMe) {
      rows.push([c.date, c.p, c.text, c.likes, c.title, c.tags.join('; ')]);
    }
    const date = new Date().toISOString().slice(0, 10);
    return csvResponse(`stt-campaigns-quote-pool-${date}.csv`, rows);
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
