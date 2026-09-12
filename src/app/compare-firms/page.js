import { redirect } from 'next/navigation';

export default async function CompareFirmsRedirect({ searchParams }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp || {})) {
    const list = Array.isArray(value) ? value : [value];
    for (const item of list) {
      if (item != null && item !== '') params.append(key, String(item));
    }
  }
  const q = params.toString();
  redirect(q ? `/compare?${q}` : '/compare');
}
