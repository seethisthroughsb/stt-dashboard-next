import { Shell } from '../../components/Shell';
import { Campaigns } from '../../components/views/Campaigns';
import { loadCampaignsData, getSidebarMeta } from '../../lib/data';
import { Alert } from '../../components/Alert';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let d = null;
  let meta = null;
  let error = null;
  try {
    [d, meta] = await Promise.all([loadCampaignsData(), getSidebarMeta()]);
  } catch (err) {
    error = err.message;
  }

  return (
    <Shell view="campaigns" pull={meta?.pull ?? '—'} lastComment={meta?.lastCommentDate ?? null}>
      {error ? (
        <Alert tone="danger" title="Couldn't load dashboard data">
          {error}
        </Alert>
      ) : (
        <Campaigns d={d} />
      )}
    </Shell>
  );
}
