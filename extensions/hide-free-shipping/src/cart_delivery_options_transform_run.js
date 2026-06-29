/**
 * Replacement for the legacy "Shipping ignores free shipping" Shopify Script.
 *
 * Identifies OUR free-item discount by the app-reserved metafield it carries
 * ($app:vip-free-item/function-configuration), surfaced on each line's
 * discountApplication. That metafield's JSON also holds `hideRateNames` (edited
 * in the discount settings form), so all config lives on the discount.
 *
 * NOTE: console.log output is written to the function run logs — view with
 * `shopify app dev` (live) or in the app's function run history. Remove the logs
 * once the behavior is confirmed.
 */

const NO_CHANGES = { operations: [] };

export function cartDeliveryOptionsTransformRun(input) {
  const lines = input.cart.lines || [];

  // --- DEBUG: dump what the function actually received ---
  const allocationsDump = lines.map((line, i) => ({
    line: i,
    allocations: (line.discountAllocations || []).map((a) => ({
      hasMarker: a.discountApplication?.freeItemConfig != null,
      markerValue: a.discountApplication?.freeItemConfig?.value ?? null,
    })),
  }));
  const optionTitles = (input.cart.deliveryGroups || []).flatMap((g) =>
    (g.deliveryOptions || []).map((o) => o.title),
  );
  console.log(
    "[hide-free-shipping] lines:",
    lines.length,
    "| allocations:",
    JSON.stringify(allocationsDump),
    "| optionTitles:",
    JSON.stringify(optionTitles),
  );
  // --- end DEBUG ---

  const configValue = findFreeItemConfig(lines);
  if (configValue == null) {
    console.log("[hide-free-shipping] no free-item marker found -> no changes");
    return NO_CHANGES;
  }

  const config = parseConfig(configValue);
  const hideRateNames = (config.hideRateNames || []).map(normalize).filter(Boolean);
  console.log("[hide-free-shipping] hideRateNames:", JSON.stringify(hideRateNames));
  if (hideRateNames.length === 0) return NO_CHANGES;

  const operations = [];
  for (const group of input.cart.deliveryGroups || []) {
    for (const option of group.deliveryOptions || []) {
      if (hideRateNames.includes(normalize(option.title))) {
        operations.push({
          deliveryOptionHide: { deliveryOptionHandle: option.handle },
        });
      }
    }
  }

  console.log("[hide-free-shipping] hiding", operations.length, "option(s)");
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
