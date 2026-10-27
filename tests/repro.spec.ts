import { expect, test, type Page } from '@playwright/test';

// x-item renders <div class="k"><span>text</span></div> in its shadow root.
// x-host renders its own x-item.c in its shadow root, then a slot for its children.
const components = `
  <script>
    customElements.define('x-item', class extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML =
          '<div class="k"><span>' + (this.dataset.text || '') + '</span></div>';
      }
    });
    customElements.define('x-host', class extends HTMLElement {
      connectedCallback() {
        this.attachShadow({ mode: 'open' }).innerHTML =
          (this.dataset.noTwin ? '' : '<x-item class="c"></x-item>') + '<slot></slot>';
      }
    });
  </script>
`;

const sevenDivs = '<div></div>'.repeat(7);
const slotted = (hostAttrs = '') =>
  `<x-host ${hostAttrs}><x-item class="c" data-text="Client book"></x-item></x-host>`;

async function clickAmbiguousText(page: Page) {
  return page
    .getByText('Client book', { exact: true })
    .click({ timeout: 2_000 })
    .then(() => 'clicked', (error: Error) => error.message);
}

test('bug: the strict mode violation fails with a TypeError', async ({ page }) => {
  await page.setContent(`<span>Client book</span>${sevenDivs}${slotted()}${components}`);

  // Two elements match. Expected: "strict mode violation ... resolved to 2 elements".
  expect(await clickAmbiguousText(page)).toContain('strict mode violation');
});

test('control: without the twin x-item in the host shadow root', async ({ page }) => {
  await page.setContent(
    `<span>Client book</span>${sevenDivs}${slotted('data-no-twin="1"')}${components}`,
  );

  expect(await clickAmbiguousText(page)).toContain('strict mode violation');
});

test('control: without the seven divs', async ({ page }) => {
  await page.setContent(`<span>Client book</span>${slotted()}${components}`);

  expect(await clickAmbiguousText(page)).toContain('strict mode violation');
});
