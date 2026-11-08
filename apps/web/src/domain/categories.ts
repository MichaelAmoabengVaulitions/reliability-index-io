import type { MerchantCategory } from '@/api/schemas';

/**
 * Returns the backend's name for a merchant category code. While the names
 * are loading, or when the backend has no name for a code, the code itself is
 * shown, so we never make up a name.
 */
export function categoryLabel(
  code: string,
  categories: readonly MerchantCategory[] | undefined,
): string {
  return categories?.find((category) => category.code === code)?.name ?? code;
}
