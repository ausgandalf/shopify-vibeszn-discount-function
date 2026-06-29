import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * Replacement for the legacy "2.rb" Shopify Script.
 *
 * When the discount code attached to this function is applied, it discounts the
 * cheapest eligible line item(s) down to a near-free price (the legacy script
 * used 1 cent / "oneforacent").
 *
 * Eligibility gates from the original script:
 *   - excluded product tags  (legacy: products tagged "nodiscount")
 *   - excluded customer tags (legacy: customers tagged "usedcode")
 *   - product limit          (legacy: product_limit, default 1)
 *
 * The discount *code* match (legacy: "FREEVIP") is no longer checked here — in
 * Functions the merchant creates a code discount in the admin and attaches it to
 * this function, so the function only ever runs for that discount.
 */

const DEFAULT_CONFIG = {
  nearFreePrice: "0.01",
  productLimit: 1,
  discountMessage: "Free item with this code",
};

const NO_DISCOUNT = { operations: [] };

export function cartLinesDiscountsGenerateRun(input) {
  const config = {
    ...DEFAULT_CONFIG,
    ...parseConfig(input.discount?.metafield?.value),
  };

  // This function only produces product-level discounts.
  if (!input.discount.discountClasses.includes(DiscountClass.Product)) {
    return NO_DISCOUNT;
  }

  // Excluded customer (e.g. has already redeemed the offer) -> nothing.
  if (input.cart.buyerIdentity?.customer?.isExcluded) {
    return NO_DISCOUNT;
  }

  const nearFree = Number(config.nearFreePrice) || 0;
  const limit = Math.max(1, Number(config.productLimit) || 1);

  // Eligible lines = products NOT carrying an excluded tag.
  const eligible = input.cart.lines.filter(
    (line) => !line.merchandise?.product?.isExcluded,
  );
  if (eligible.length === 0) return NO_DISCOUNT;

  // Cheapest first, matching the legacy `sort_by { variant.price }`.
  const sorted = eligible
    .slice()
    .sort((a, b) => unitPrice(a) - unitPrice(b));

  const candidates = [];
  for (const line of sorted) {
    if (candidates.length >= limit) break;

    // Amount to take off so a single unit ends up at `nearFree`.
    const amountOff = (unitPrice(line) - nearFree).toFixed(2);
    if (Number(amountOff) <= 0) continue;

    candidates.push({
      message: config.discountMessage,
      targets: [{ cartLine: { id: line.id } }],
      value: {
        fixedAmount: {
          amount: amountOff,
          // Apply once to the line (not per unit) => exactly one unit goes
          // near-free, mirroring the legacy `split(take: product_limit)`.
          appliesToEachItem: false,
        },
      },
    });
  }

  if (candidates.length === 0) return NO_DISCOUNT;

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}

function unitPrice(line) {
  return Number(line.cost.amountPerQuantity.amount);
}

function parseConfig(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
