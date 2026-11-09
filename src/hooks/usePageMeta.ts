import { useEffect } from 'react';
import { setPageMeta, type PageMeta } from '../lib/seo';

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    setPageMeta(meta);
  }, [meta.title, meta.description, meta.path, meta.ogImage, meta.noIndex]);
}
