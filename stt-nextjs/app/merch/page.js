import { Shell } from '../../components/Shell';
import { Merch } from '../../components/views/Merch';
import { loadMerchData, getSidebarMeta } from '../../lib/data';
import { Alert } from '../../components/Alert';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let d = null;
  let meta = null;
  let error = null;
  try {
    [d, meta] = await Promise.all([loadMerchData(), getSidebarMeta()]);
  } catch (err) {
    error = err.message;
  }

  return (
    <Shell view="merch" pull={meta?.pull ?? '—'} lastComment={meta?.lastCommentDate ?? null}>
      {error ? (
        <Alert tone="danger" title="Couldn't load dashboard data">
          {error}
        </Alert>
      ) : (
        <Merch d={d} />
      )}
    </Shell>
  );
}
