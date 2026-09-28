import { Shell } from '../components/Shell';
import { RightNow } from '../components/views/RightNow';
import { loadRightNowData } from '../lib/data';
import { Alert } from '../components/Alert';

// Data changes whenever a sync runs — never statically cache this page.
export const dynamic = 'force-dynamic';

export default async function Page() {
  let d = null;
  let error = null;
  try {
    d = await loadRightNowData();
  } catch (err) {
    error = err.message;
  }

  return (
    <Shell view="now" pull={d?.pull ?? '—'} lastComment={d?.lastCommentDate ?? null}>
      {error ? (
        <Alert tone="danger" title="Couldn't load dashboard data">
          {error}
        </Alert>
      ) : (
        <RightNow d={d} />
      )}
    </Shell>
  );
}
