# Strict mode violation fails with a TypeError inside a slotted web component

Minimal reproduction for a Playwright bug. A locator that matches two elements should fail with a
strict mode violation. When one match is inside a web component that is slotted into a host, and
the host's shadow root renders a copy of that component, the error is
`TypeError: Cannot read properties of undefined (reading 'includes')` instead.

## Reproduce

```sh
npm install
npx playwright install chromium
npx playwright test
```

`tests/repro.spec.ts` has three tests. Each clicks `getByText('Client book', { exact: true })`,
which matches two elements, and expects the error message to contain `strict mode violation`.

| Test                                                         | Result                                   |
| ------------------------------------------------------------ | ---------------------------------------- |
| `bug: the strict mode violation fails with a TypeError`       | fails: the message is the `TypeError`    |
| `control: without the twin x-item in the host shadow root`   | passes                                   |
| `control: without the seven divs`                            | passes                                   |

The two controls each remove one condition the bug needs.

## The page

```html
<span>Client book</span>
<div></div> × 7
<x-host>
  #shadow-root
    <x-item class="c">
      #shadow-root
        <div class="k"><span></span></div>
    </x-item>
    <slot></slot>
  <x-item class="c" data-text="Client book">
    #shadow-root
      <div class="k"><span>Client book</span></div>
  </x-item>
</x-host>
```

## Why it fails

From `packages/injected/src/selectorGenerator.ts`:

1. The strict mode violation message suggests a locator for each match. For the second match, the
   generator also needs a selector for its parent, `div.k` inside the slotted `x-item`.
2. The only candidate for `div.k` is the tag name `div`. It is rejected because more than five
   other `div`s come before it (`if (index > 5) continue`). The seven empty `div`s are there for
   this. With no candidate, `cssFallback` runs for `div.k`.
3. `cssFallback` builds a path upwards. It keeps a path only if `querySelector` returns the target.
   It tells siblings apart with `element.parentNode.children` and `parent.querySelectorAll(token)`.
   These see the light DOM children of `x-host` only. The `>` combinator of Playwright's CSS engine
   also matches children of a host's shadow root. So every path it tries (`.k`, `x-item > .k`,
   `.c > .k`, `x-host > .c > .k`, up to `html > body > …`) finds the `div.k` in `x-host`'s own
   `x-item.c` first.
4. No path is unique. The last line, `return makeStrict(uniqueCSSSelector()!)`, then calls
   `parseSelector(undefined)`, which throws.

## Versions

Fails on `@playwright/test` 1.64.1 (Chrome for Testing 156.0.8078.4) and 1.63.0, on macOS 26.3
(arm64) with Node.js 22.16.0.
