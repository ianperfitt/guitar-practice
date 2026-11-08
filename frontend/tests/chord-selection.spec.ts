import { expect, test } from '@playwright/test';
import type { Card } from '../lib/practice';

test('guitar selects pairs per card, preserves targets and ranges, and supports both shuffle modes', async ({
  page,
}) => {
  await page.goto('/');
  const pair = page.getByRole('combobox', { name: 'YOUR TWO CHORDS', exact: true });
  await expect(pair.locator('option')).toHaveText([
    'F7 → B♭7',
    'F7alt → B♭7',
    'B♭7 → F7',
    'B° → F7',
    'F7 → D7',
    'D7 → C7',
    'C7 → F7',
    'C7alt → F7',
  ]);
  await page.getByLabel('TEMPO', { exact: true }).fill('127');
  await page.getByLabel('TEMPO', { exact: true }).press('Tab');
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await page.getByLabel('STRING RANGE', { exact: true }).selectOption('4');
  await page.getByLabel('Target note for F7', { exact: true }).selectOption('A');
  await page.getByLabel('Target note for B♭7', { exact: true }).selectOption('D');
  await pair.selectOption('B♭7|F7');
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['B♭7', 'F7']);
  await expect(page.locator('.chord-pair select').nth(0)).toHaveValue('D');
  await expect(page.locator('.chord-pair select').nth(1)).toHaveValue('A');
  await expect(page.locator('.chord-pair .chord').first()).toHaveAttribute('aria-pressed', 'true');
  await pair.selectOption('B°|F7');
  await expect(page.locator('.chord-pair select').nth(0)).toHaveValue('B');
  await expect(page.locator('.chord-pair select').nth(1)).toHaveValue('A');
  await expect(page.locator('.card-bottom')).toContainText('127');
  await expect(page.locator('.fretboard')).toHaveAttribute(
    'aria-label',
    'Guitar fretboard. Frets 8 through 12, strings 4 through 6 highlighted.',
  );
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(pair).toHaveValue('F7alt|B♭7');
  await page.getByRole('button', { name: 'Previous card', exact: true }).click();
  await expect(pair).toHaveValue('B°|F7');

  await page.getByRole('checkbox', { name: 'Keep chords when shuffling' }).check();
  await page.getByRole('button', { name: 'Shuffle deck', exact: true }).click();
  await expect(pair).toHaveValue('B°|F7');
  await expect(page.locator('.chord-pair select').nth(1)).toHaveValue('A');
  await page.getByRole('checkbox', { name: 'Keep chords when shuffling' }).uncheck();
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/decks') &&
        response.request().postDataJSON()?.shuffle === true,
    ),
    page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
  ]);
  const deck: Card[] = await response.json();
  await expect(pair).toHaveValue(deck[0].chords.map((chord) => chord.name).join('|'));
  await expect(pair.locator('option')).toHaveCount(8);
});

test('pair choices follow the song and preserve exercise-specific chord annotations', async ({
  page,
}) => {
  await page.goto('/');
  const pair = page.getByRole('combobox', { name: 'YOUR TWO CHORDS', exact: true });
  await expect(pair).toBeEnabled();
  await page.getByRole('button', { name: 'Guitar exercise library', exact: true }).click();
  await page.getByLabel('Search exercises').fill('HWHT');
  await page.locator('.library-card').click();
  await pair.selectOption('B°|F7');
  await expect(page.locator('.chord-note')).toHaveText('Whole–Half or Half–Whole');
  await expect(page.getByRole('button', { name: 'B° 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await pair.selectOption('B°|F7');
  await expect(page.getByRole('button', { name: 'B° —', exact: true })).toBeVisible();
  await expect(page.locator('.chord-note')).toHaveCount(0);

  await page.getByLabel('SONG', { exact: true }).selectOption('all-blues');
  await expect(pair.locator('option')).toHaveText([
    'G7 → C7',
    'C7 → G7',
    'G7 → Dalt',
    'Dalt → D#alt',
    'D#alt → G7',
  ]);
  await pair.selectOption('Dalt|D#alt');
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['Dalt', 'D#alt']);
  await expect(page.locator('.chord-pair select').nth(0)).toHaveValue('D');
  await expect(page.locator('.chord-pair select').nth(1)).toHaveValue('D♯');
  await page.getByLabel('SONG', { exact: true }).selectOption('billies-bounce');
  await expect(pair.locator('option')).toHaveCount(8);
  await expect(pair).toHaveValue('F7|B♭7');
});

test('piano selects all nine allowed changes and keeps selections separate from guitar', async ({
  page,
}) => {
  await page.goto('/');
  const instrument = page.getByRole('combobox', { name: 'Instrument', exact: true });
  const pair = page.getByRole('combobox', { name: 'YOUR TWO CHORDS', exact: true });
  await expect(pair).toBeEnabled();
  await pair.selectOption('C7alt|F7');
  await instrument.selectOption('piano');
  const options = [
    'G7 → C7',
    'C7 → G7',
    'C7 → C#dim',
    'G7 → B7',
    'B7 → E7',
    'E7 → Aalt',
    'Aalt → D7',
    'D7 → G7',
    'G7 → D7',
  ];
  await expect(pair.locator('option')).toHaveText(options);
  for (const option of options) {
    const chords = option.split(' → ');
    await pair.selectOption(chords.join('|'));
    await expect(page.locator('.chord-pair .chord > span')).toHaveText(chords);
  }
  await pair.selectOption('C7|C#dim');
  await expect(
    page.getByLabel('Target note for C#dim', { exact: true }).locator('option'),
  ).toHaveText(['C♯ · Root', 'E · ♭3', 'G · ♭5']);
  await page.getByLabel('Target note for C#dim', { exact: true }).selectOption('E');
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(pair).toHaveValue('C7|C#dim');
  await instrument.selectOption('guitar');
  await expect(pair).toHaveValue('C7alt|F7');
  await instrument.selectOption('piano');
  await expect(pair).toHaveValue('C7|C#dim');
  await expect(page.getByLabel('Target note for C#dim', { exact: true })).toHaveValue('E');
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/decks') &&
        response.request().postDataJSON()?.shuffle === true,
    ),
    page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
  ]);
  const deck: Card[] = await response.json();
  await expect(pair).toHaveValue(deck[0].chords.map((chord) => chord.name).join('|'));
  await expect(
    page.getByRole('heading', { name: 'Block Chords: Approach From Below', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '../.playwright/piano-chord-selection.png', fullPage: true });
});
