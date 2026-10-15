import { expect, test } from '@playwright/test';

const ALLOWED_PAIRS = [
  ['F7', 'B♭7'],
  ['F7alt', 'B♭7'],
  ['B♭7', 'F7'],
  ['B°', 'F7'],
  ['F7', 'D7'],
  ['D7', 'C7'],
  ['C7', 'F7'],
  ['C7alt', 'F7'],
];

test('real API deck pairs two chords with a library exercise and preserves controls and library', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['F7', 'B♭7']);
  await expect(page.locator('.pair-guidance')).toContainText('Explore the scale over each chord');
  await page.locator('.chord-pair .chord').nth(1).click();
  await expect(page.locator('.chord-pair .chord').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('TEMPO', { exact: true })).toHaveValue('100');
  await page.screenshot({
    path: `../.playwright/${test.info().project.name}-practice.png`,
    fullPage: true,
  });
  await page.getByLabel('TEMPO', { exact: true }).fill('137');
  await page.getByLabel('TEMPO', { exact: true }).press('Tab');
  await expect(page.locator('.card-bottom')).toContainText('137');
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await expect(
    page.getByRole('img', { name: 'Guitar fretboard. Frets 8 through 12 highlighted.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Blues Scale', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['F7alt', 'B♭7']);
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await expect(page.locator('.chord-pair .chord').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Exercise library/ }).click();
  await expect(page.locator('.library-card')).toHaveCount(16);
  const titles = await page.locator('.library-card h3').allTextContents();
  await page.getByLabel('Search exercises').fill('HWHT');
  await expect(page.locator('.library-card')).toHaveCount(1);
  await page.locator('.library-card').click();
  await expect(page.getByRole('heading', { name: 'HWHT Enclosure', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Target Note Bends', exact: true })).toBeVisible();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await page.getByRole('button', { name: 'Shuffle deck', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Shuffle deck', exact: true })).toBeEnabled();
  const pair = await page.locator('.chord-pair .chord > span').allTextContents();
  expect(pair).toHaveLength(2);
  expect(ALLOWED_PAIRS).toContainEqual(pair);
  await expect(page.locator('.card-bottom')).toContainText('137');
  await expect(
    page.getByRole('img', { name: 'Guitar fretboard. Frets 8 through 12 highlighted.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Exercise library/ }).click();
  await page.getByLabel('Search exercises').fill('');
  await expect(page.locator('.library-card')).toHaveCount(16);
  expect((await page.locator('.library-card h3').allTextContents()).sort()).toEqual(titles.sort());
  await page.reload();
  await expect(page.getByLabel('TEMPO', { exact: true })).toHaveValue('137');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('8');
  expect(errors).toEqual([]);
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
});

test('selected chords retain exercise-specific notes and empty annotations', async ({ page }) => {
  // Fix the sampled pair so the annotation checks do not depend on randomness.
  await page.route('**/api/decks', async (route) => {
    const response = await route.fetch();
    const deck = await response.json();
    for (const card of deck) {
      if (['hwht-enclosure', 'target-note-bends'].includes(card.exercise.id)) {
        card.chords = ['B°', 'F7'].map((name) =>
          card.exercise.chords.find((chord: { name: string }) => chord.name === name),
        );
      }
    }
    await route.fulfill({ response, json: deck });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Exercise library', exact: true }).click();
  await page.getByLabel('Search exercises').fill('HWHT');
  await page.locator('.library-card').click();
  await expect(page.locator('.chord-pair .chord')).toHaveCount(2);
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['B°', 'F7']);
  await page.getByRole('button', { name: 'B° 1', exact: true }).click();
  await expect(page.locator('.chord-note')).toHaveText('Whole–Half or Half–Whole');
  await page.screenshot({
    path: `../.playwright/${test.info().project.name}-annotated-pair.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Target Note Bends', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'B° —', exact: true })).toBeVisible();
  await expect(page.locator('.chord-note')).toHaveCount(0);
});

test('deck navigation loops freely, and help and metronome work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'How it works' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Metronome', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Metronome', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.beat-dots .lit')).toHaveCount(1);
  await page.getByRole('button', { name: 'Metronome', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Metronome', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  for (let i = 0; i < 16; i++)
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next card', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous card', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Octaves (Up & Down Scale)', exact: true }),
  ).toBeVisible();
});
