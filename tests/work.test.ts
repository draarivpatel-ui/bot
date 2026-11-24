import { expect, test } from 'bun:test';
import { parseAsk } from '../src/work';

test('chat strips a sentence-ending period after a GitHub clone URL', () => {
  expect(parseAsk('Please score https://github.com/flisk-sh/flisk.git.')).toEqual({
    kind: 'readme-score',
    input: { repo: 'flisk-sh/flisk' },
  });
});
