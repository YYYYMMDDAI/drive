import { expect, test } from '@playwright/test';

test('generate flow shows loading and content placeholders', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', 'テスト記事のテーマ');
  await page.click('button:has-text("生成を開始")');
  await expect(page.getByText('AIがArtifactsを生成中…')).toBeVisible();
});
