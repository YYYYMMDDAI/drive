import { expect, test } from '@playwright/test';

test('SplitEase preset switching and premium upsell flow', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '動画ながら見デュアルビュー' })).toBeVisible();
  await expect(page.getByLabel('上ペイン: YouTube 動画')).toBeVisible();

  await page.getByRole('button', { name: 'B: Netflix + メモ を選択' }).click();
  await expect(page.getByLabel('クイックメモ')).toBeVisible();

  await page.getByRole('button', { name: 'プリセット追加' }).click();
  await expect(page.getByRole('dialog', { name: 'プレミアム案内' })).toBeVisible();

  await page.getByRole('button', { name: 'アップグレードする' }).click();
  await expect(page.getByRole('dialog', { name: 'プレミアム案内' })).toBeHidden();

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('カスタムペア編集画面');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'プリセット追加' }).click();
});
