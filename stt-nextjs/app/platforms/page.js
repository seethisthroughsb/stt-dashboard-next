import { Shell } from '../../components/Shell';
import { Platforms } from '../../components/views/Platforms';
import { loadPlatformsData, getSidebarMeta } from '../../lib/data';
import { Alert } from '../../components/Alert';

export const dynamic = 'force-dynamic';

export default async function Page() {
  let d = null;
  let meta = null;
  let error = null;
  try {
    [d, meta] = await Promise.all([loadPlatformsData(), getSidebarMeta()]);
  } catch (err) {
    error = err.message;
  }

  return (
    <Shell view="platforms" pull={meta?.pull ?? '—'} lastComment={meta?.lastCommentDate ?? null}>
      {error ? (
        <Alert tone="danger" title="Couldn't load dashboard data">
          {error}
        </Alert>
      ) : (
        <Platforms d={d} />
      )}
    </Shell>
  );
}
