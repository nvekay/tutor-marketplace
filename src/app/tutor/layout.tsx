import { requireViewer } from '@/lib/auth';
import { TutorTabs } from './tutor-tabs';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  await requireViewer('tutor');
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <TutorTabs />
      {children}
    </main>
  );
}
