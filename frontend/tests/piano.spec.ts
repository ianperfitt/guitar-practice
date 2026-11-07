import { expect, test } from '@playwright/test';
import type { Card } from '../lib/practice';

const PIANO_PAIRS = [
  ['G7', 'C7'],
  ['C7', 'G7'],
  ['C7', 'C#dim'],
  ['G7', 'B7'],
  ['B7', 'E7'],
  ['E7', 'Aalt'],
  ['Aalt', 'D7'],
  ['D7', 'G7'],
  ['G7', 'D7'],
];

test('switching instruments preserves each shuffled deck and current selections independently', async ({
  page,
}) => {
  await page.goto('/');
  const instrument = page.getByRole('combobox', { name: 'Instrument', exact: true });
  const shuffle = page.getByRole('button', { name: 'Shuffle deck', exact: true });
  const deckRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/decks')) deckRequests.push(request.postDataJSON().instrument);
  });

  async function shuffleAndReadDeck() {
    await expect(shuffle).toBeEnabled();
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/decks') &&
          response.request().postDataJSON()?.shuffle === true,
      ),
      shuffle.click(),
    ]);
    await expect(shuffle).toBeEnabled();
    return (await response.json()) as Card[];
  }

  await expect(
    page.getByRole('heading', { name: 'Guitar practice deck', exact: true }),
  ).toBeVisible();
  const guitarDeck = await shuffleAndReadDeck();
  expect(guitarDeck).toHaveLength(16);
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  const guitarCard = guitarDeck[2];
  const guitarTargets = guitarCard.chords.map((chord) => chord.targetNoteOptions[1].name);
  for (let i = 0; i < 2; i++)
    await page.locator('.chord-pair select').nth(i).selectOption(guitarTargets[i]);
  const guitarPosition = await page.locator('.fretboard').getAttribute('aria-label');

  await instrument.selectOption('piano');
  await expect(
    page.getByRole('heading', { name: 'Piano practice deck', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guitar practice deck', exact: true })).toHaveCount(
    0,
  );
  const pianoDeck = await shuffleAndReadDeck();
  expect(pianoDeck).toHaveLength(1);
  expect(pianoDeck[0].exercise.id).toBe('block-chords-ascending');
  const pianoTargets = pianoDeck[0].chords.map((chord) => chord.targetNoteOptions[1].name);
  for (let i = 0; i < 2; i++)
    await page.locator('.chord-pair select').nth(i).selectOption(pianoTargets[i]);

  const requestsBeforeSwitchingBack = deckRequests.length;
  await instrument.selectOption('guitar');
  await expect(page.locator('.card-number')).toHaveText('CARD 03/16');
  await expect(
    page.getByRole('heading', { name: guitarCard.exercise.title, exact: true }),
  ).toBeVisible();
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(
    guitarCard.chords.map((chord) => chord.name),
  );
  await expect(page.locator('.fretboard')).toHaveAttribute('aria-label', guitarPosition!);
  for (let i = 0; i < 2; i++)
    await expect(page.locator('.chord-pair select').nth(i)).toHaveValue(guitarTargets[i]);
  await expect(page.locator('.chord-pair .chord').nth(1)).toHaveAttribute('aria-pressed', 'true');

  // Shuffling piano must leave the entire guitar deck intact.
  await instrument.selectOption('piano');
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(
    pianoDeck[0].chords.map((chord) => chord.name),
  );
  for (let i = 0; i < 2; i++)
    await expect(page.locator('.chord-pair select').nth(i)).toHaveValue(pianoTargets[i]);
  expect(deckRequests).toHaveLength(requestsBeforeSwitchingBack);
  await shuffleAndReadDeck();
  await instrument.selectOption('guitar');
  for (let i = 0; i < guitarDeck.length; i++) {
    const expected = guitarDeck[(i + 2) % guitarDeck.length];
    await expect(
      page.getByRole('heading', { name: expected.exercise.title, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.chord-pair .chord > span')).toHaveText(
      expected.chords.map((chord) => chord.name),
    );
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
  }

  // Each library also keeps its own search and selected view.
  await page.getByRole('button', { name: 'Guitar exercise library', exact: true }).click();
  await page.getByLabel('Search exercises').fill('triad');
  const guitarMatches = await page.locator('.library-card h3').allTextContents();
  expect(guitarMatches.length).toBeGreaterThan(1);
  await instrument.selectOption('piano');
  await page.getByRole('button', { name: 'Piano exercise library', exact: true }).click();
  await expect(page.locator('.library-card h3')).toHaveText('Block Chords: Approach');
  await expect(page.getByLabel('Search exercises')).toHaveValue('');
  await instrument.selectOption('guitar');
  await expect(page.getByLabel('Search exercises')).toHaveValue('triad');
  await expect(page.locator('.library-card h3')).toHaveText(guitarMatches);
});

test('piano has its own deck, library, song, and saved preferences', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const instrument = page.getByRole('combobox', { name: 'Instrument', exact: true });
  const tempo = page.getByLabel('TEMPO', { exact: true });
  const song = page.getByRole('combobox', { name: 'SONG', exact: true });
  await expect(tempo).toBeEnabled();
  await tempo.fill('140');
  await tempo.press('Tab');
  await page.getByLabel('FRET RANGE', { exact: true }).selectOption('8');
  await page.getByLabel('STRING RANGE', { exact: true }).selectOption('4');
  await song.selectOption('all-blues');
  await expect(song).toHaveValue('all-blues');
  await expect(song).toBeEnabled();

  await instrument.selectOption('piano');
  await expect(
    page.getByRole('heading', { name: 'Block Chords: Approach', exact: true }),
  ).toBeVisible();
  await expect(tempo).toHaveValue('100');
  await expect(song.locator('option')).toHaveText(["Bag's Groove"]);
  await expect(page.locator('#song-chords')).toHaveText(
    'Chords: G7 · C7 · C#dim · B7 · E7 · Aalt · D7',
  );
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(['G7', 'C7']);
  await expect(page.locator('.card-number')).toHaveText('CARD 01/1');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('STRING RANGE', { exact: true })).toHaveCount(0);
  await expect(page.locator('.fretboard')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Keep chords when shuffling' })).toHaveCount(0);
  await tempo.fill('115');
  await tempo.press('Tab');
  await page.getByRole('combobox', { name: 'Target note for G7', exact: true }).selectOption('B');
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Target note for G7', exact: true })).toHaveValue(
    'B',
  );

  await page.getByRole('button', { name: 'Piano exercise library', exact: true }).click();
  await expect(page.locator('.library-card')).toHaveCount(1);
  await expect(page.locator('.library-card h3')).toHaveText('Block Chords: Approach');
  await expect(page.locator('.library-card-bottom')).not.toContainText('Frets');
  await page.getByLabel('Search exercises').fill('triad');
  await expect(page.locator('.library-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await page.locator('.library-card').click();

  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/decks') &&
        response.request().postDataJSON()?.shuffle === true,
    ),
    page.getByRole('button', { name: 'Shuffle deck', exact: true }).click(),
  ]);
  expect(response.request().postDataJSON()).toMatchObject({
    instrument: 'piano',
    songId: 'bags-groove',
    bpm: 115,
    fretStart: null,
    stringStart: null,
  });
  const deck: Card[] = await response.json();
  expect(deck).toHaveLength(1);
  expect(PIANO_PAIRS).toContainEqual(deck[0].chords.map((chord) => chord.name));
  await expect(page.locator('.chord-pair .chord > span')).toHaveText(
    deck[0].chords.map((chord) => chord.name),
  );
  await expect(page.locator('.card-bottom')).toHaveText('115 BPM');
  await page.getByRole('button', { name: 'How it works', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('nine allowed two-chord changes');
  await expect(page.getByRole('dialog')).not.toContainText('frets');
  await page.getByRole('button', { name: 'Let’s play', exact: true }).click();
  await page.screenshot({ path: '../.playwright/piano-practice.png', fullPage: true });

  await page.reload();
  await expect(instrument).toHaveValue('piano');
  await expect(tempo).toHaveValue('115');
  await expect(song).toHaveValue('bags-groove');
  await instrument.selectOption('guitar');
  await expect(page.getByRole('heading', { name: 'Up & Down Scale', exact: true })).toBeVisible();
  await expect(tempo).toHaveValue('140');
  await expect(song).toHaveValue('all-blues');
  await expect(page.getByLabel('FRET RANGE', { exact: true })).toHaveValue('8');
  await expect(page.getByLabel('STRING RANGE', { exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'Guitar exercise library', exact: true }).click();
  await expect(page.locator('.library-card')).toHaveCount(16);
  await instrument.selectOption('piano');
  await expect(tempo).toHaveValue('115');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
});
