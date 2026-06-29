/**
 * Replacement for the legacy "Shipping ignores free shipping" Shopify Script.
 *
 * Legacy behaviour: when the cart used discount code FREEVIP, the named shipping
 * rates ("free domestic", "Free International") were removed so free shipping
 * could not be stacked with the free-item offer.
 *
 * Functions caveat: the delivery customization API does NOT expose the applied
 * discount code. We therefore trigger off the presence of a line-level discount
 * allocation (i.e. the "free item" product discount is active on the cart) and
 * hide the configured rate names.
 *
 * Config metafield ($app:hide-free-shipping / function-configuration), JSON:
 *   {
 *     "hideRateNames": ["free domestic", "Free International"],
 *     "minAllocatedAmount": "0"   // optional: ignore tiny/unrelated allocations
 *   }
 */

const NO_CHANGES = { operations: [] };

export function cartDeliveryOptionsTransformRun(input) {
  const config = parseConfig(input.deliveryCustomization?.metafield?.value);
  const hideRateNames = (config.hideRateNames || []).map(normalize).filter(Boolean);
  if (hideRateNames.length === 0) return NO_CHANGES;

  const minAllocated = Number(config.minAllocatedAmount) || 0;

  // Is a qualifying LINE-ITEM (product) discount active on any line?
  // We deliberately ignore order-wide discounts: Shopify spreads an
  // "amount off entire order" discount across the line items as allocations,
  // but those carry targetSelection === "ALL". The free-item offer targets a
  // specific line, so its allocation is "ENTITLED"/"EXPLICIT".
  const discountActive = input.cart.lines.some((line) =>
    (line.discountAllocations || []).some((alloc) => {
      const application = alloc.discountApplication;
      return (
        application?.targetType === "LINE_ITEM" &&
        application?.targetSelection !== "ALL" &&
        Number(alloc.discountedAmount?.amount) > minAllocated
      );
    }),
  );
  if (!discountActive) return NO_CHANGES;

  const operations = [];
  for (const group of input.cart.deliveryGroups) {
    for (const option of group.deliveryOptions) {
      if (hideRateNames.includes(normalize(option.title))) {
        operations.push({
          deliveryOptionHide: { deliveryOptionHandle: option.handle },
        });
      }
    }
  }

  return operations.length > 0 ? { operations } : NO_CHANGES;
}

function normalize(value) {
  return (value || "").toLowerCase().trim();
}

function parseConfig(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
