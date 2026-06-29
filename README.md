# adam-script-replacement

An **extension-only** Shopify app (no hosted backend, no server) that replaces two
legacy Shopify Scripts being shut down with the Script Editor. Everything runs as
Shopify Functions (Wasm) on Shopify's infrastructure; you only ever run the
Shopify CLI to deploy.

## What this replaces

| Legacy Ruby script | New extension | Type |
| --- | --- | --- |
| `2.rb` — cheapest item for 1¢ with `FREEVIP`, excludes `nodiscount` products and `usedcode` customers | `extensions/vip-free-item-discount` (+ `vip-free-item-settings` UI) | Discount function + admin settings UI |
| `Shipping_ignores_free_shipping...rb` — hide free-shipping rates when `FREEVIP` is used | `extensions/hide-free-shipping` | Delivery customization function |

The original `.rb` files are kept in the repo /ref for reference.

## Behaviour notes / differences from the scripts

- **No more code-string matching.** In Functions, the merchant creates a code
  discount named `FREEVIP` in the admin and attaches it to the discount function,
  so the function only runs for that discount. (Customer-tag and product-tag gates
  still live in the function.)
- **Shipping function can't see the discount code.** The delivery customization API
  doesn't expose applied discount codes, so `hide-free-shipping` triggers on the
  presence of a product discount allocation on a cart line instead. If you run
  other line-item discounts, they would also trigger the hide — tighten via
  `minAllocatedAmount` in the config if needed.

## Project layout

```
shopify.app.toml                       # extension-only app config
extensions/
  vip-free-item-discount/              # discount Function (replaces 2.rb)
  vip-free-item-settings/              # admin UI to edit the discount config
  hide-free-shipping/                  # delivery customization Function
scripts/create-delivery-customization.md   # one-time activation for the shipping fn
```

## Configuration

All config lives in **metafields** (no code edits needed to change values):

- **Discount** (`$app:vip-free-item` / `function-configuration`) — edited in the
  admin via the settings UI on the discount page:
  ```json
  {
    "excludedProductTags": ["nodiscount"],
    "excludedCustomerTags": ["usedcode"],
    "nearFreePrice": "0.01",
    "productLimit": 1,
    "discountMessage": "Free item with this code"
  }
  ```
- **Shipping** (`$app:hide-free-shipping` / `function-configuration`) — set once via
  `deliveryCustomizationCreate`, see `scripts/create-delivery-customization.md`:
  ```json
  { "hideRateNames": ["free domestic", "Free International"] }
  ```

## Setup & deploy

```bash
# 1. Install dependencies (npm workspaces installs every extension)
npm install

# 2. Link to a Partner app + dev store (opens a browser to log in).
#    On first run this creates the app and fills client_id in shopify.app.toml.
shopify app dev          # live-reload against your dev store, OR
shopify app deploy       # push a versioned release

# (the CLI compiles the JS functions to Wasm for you)
```

Then, in the Shopify admin:

1. **Discounts → Create discount →** pick **VIP free item discount** (the function).
   Set the code to `FREEVIP`, fill in the settings form (the `vip-free-item-settings`
   UI), and save.
2. Activate the shipping function once via
   `scripts/create-delivery-customization.md`.

## Caveats to verify on first `shopify app dev`

These were hand-scaffolded to current Shopify conventions; `shopify app dev` /
`typegen` will validate against the live schema and surface any drift:

- The admin UI extension API (`useApi` / `applyMetafieldChange` / `FunctionSettings`
  props) is version-specific (`api_version = 2025-07`). If it fails to build,
  regenerate the skeleton with `shopify app generate extension` (Discount → "Discount
  function settings") and paste in the body of `DiscountFunctionSettings.jsx`.
- `discount.metafield`, customer/product `hasAnyTag`, and the
  `productDiscountsAdd` / `fixedAmount` shapes are validated by `npm run typegen`
  in each function extension.
```
