/**
 * Replacement for the legacy "Shipping ignores free shipping" Shopify Script.
 *
 * Legacy behaviour: when the cart used discount code FREEVIP, the named shipping
 * rates ("free domestic", "Free International") were removed so free shipping
 * could not be stacked with the free-item offer.
 *
 * Functions approach: the delivery customization API does NOT expose the applied
 * discount code, but each line's discountApplication exposes the discount's own
 * metafield. Our free-item discount is the only one carrying
 * $app:vip-free-item/function-configuration, so:
 *   - its presence identifies OUR offer precisely (order-wide discounts and
 *     other product discounts never carry it), and
 *   - its JSON value holds the merchant-edited `hideRateNames`.
 *
 * Result: ALL configuration is edited in the discount settings form in admin —
 * no hosting, no separate delivery-customization config metafield.
 */

const NO_CHANGES = { operations: [] };

export function cartDeliveryOptionsTransformRun(input) {
  // Find OUR free-item discount's config, carried on its discountApplication.
  const configValue = findFreeItemConfig(input.cart.lines);
  if (configValue == null) return NO_CHANGES; // our offer isn't active

  const config = parseConfig(configValue);
  const hideRateNames = (config.hideRateNames || []).map(normalize).filter(Boolean);
  if (hideRateNames.length === 0) return NO_CHANGES;

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

function findFreeItemConfig(lines) {
  for (const line of lines) {
    for (const alloc of line.discountAllocations || []) {
      const value = alloc.discountApplication?.freeItemConfig?.value;
      if (value != null) return value;
    }
  }
  return null;
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
