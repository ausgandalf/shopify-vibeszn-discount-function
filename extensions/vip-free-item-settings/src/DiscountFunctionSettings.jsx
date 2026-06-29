import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

const NAMESPACE = "$app:vip-free-item";
const KEY = "function-configuration";

const DEFAULTS = {
  excludedProductTags: ["nodiscount"],
  excludedCustomerTags: ["usedcode"],
  nearFreePrice: "0.01",
  productLimit: 1,
  discountMessage: "Free item with this code",
};

export default async () => {
  render(<App />, document.body);
};

function App() {
  const { applyMetafieldChange, data, query } = shopify;

  const initial = parseConfig(
    data?.metafields?.find((metafield) => metafield.key === KEY)?.value,
  );

  const [excludedProductTags, setExcludedProductTags] = useState(
    initial.excludedProductTags.join(", "),
  );
  const [excludedCustomerTags, setExcludedCustomerTags] = useState(
    initial.excludedCustomerTags.join(", "),
  );
  const [nearFreePrice, setNearFreePrice] = useState(String(initial.nearFreePrice));
  const [productLimit, setProductLimit] = useState(String(initial.productLimit));
  const [discountMessage, setDiscountMessage] = useState(initial.discountMessage);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();

  // The metafield DEFINITION (with admin read/write access) must exist on the
  // DISCOUNT owner type before applyMetafieldChange is allowed to write the
  // config. Create it once if it's missing.
  useEffect(() => {
    (async () => {
      try {
        await ensureMetafieldDefinition(query);
      } catch (e) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit() {
    await applyMetafieldChange({
      type: "updateMetafield",
      namespace: NAMESPACE,
      key: KEY,
      value: JSON.stringify({
        excludedProductTags: splitTags(excludedProductTags),
        excludedCustomerTags: splitTags(excludedCustomerTags),
        nearFreePrice: String(nearFreePrice),
        productLimit: Number(productLimit) || 1,
        discountMessage,
      }),
      valueType: "json",
    });
  }

  function resetForm() {
    setExcludedProductTags(initial.excludedProductTags.join(", "));
    setExcludedCustomerTags(initial.excludedCustomerTags.join(", "));
    setNearFreePrice(String(initial.nearFreePrice));
    setProductLimit(String(initial.productLimit));
    setDiscountMessage(initial.discountMessage);
  }

  if (loading) {
    return <s-text>Loading…</s-text>;
  }

  return (
    <s-function-settings
      onSubmit={(event) => {
        event.waitUntil?.(onSubmit());
      }}
      onReset={resetForm}
    >
      <s-heading>Free item offer</s-heading>
      <s-section>
        <s-stack gap="base">
          {error ? <s-banner tone="critical">{error}</s-banner> : null}
          <s-text-field
            label="Excluded product tags (comma-separated)"
            name="excludedProductTags"
            value={excludedProductTags}
            onChange={(event) => setExcludedProductTags(event.currentTarget.value)}
          />
          <s-text-field
            label="Excluded customer tags (comma-separated)"
            name="excludedCustomerTags"
            value={excludedCustomerTags}
            onChange={(event) => setExcludedCustomerTags(event.currentTarget.value)}
          />
          <s-text-field
            label="Near-free price (per item)"
            name="nearFreePrice"
            value={nearFreePrice}
            onChange={(event) => setNearFreePrice(event.currentTarget.value)}
          />
          <s-number-field
            label="Number of items to discount"
            name="productLimit"
            value={String(productLimit)}
            min={1}
            onChange={(event) => setProductLimit(event.currentTarget.value)}
          />
          <s-text-field
            label="Discount message"
            name="discountMessage"
            value={discountMessage}
            onChange={(event) => setDiscountMessage(event.currentTarget.value)}
          />
        </s-stack>
      </s-section>
    </s-function-settings>
  );
}

async function ensureMetafieldDefinition(query) {
  const getDefinition = `#graphql
    query GetMetafieldDefinition {
      metafieldDefinitions(
        first: 1
        ownerType: DISCOUNT
        namespace: "${NAMESPACE}"
        key: "${KEY}"
      ) {
        nodes { id }
      }
    }`;

  const existing = await query(getDefinition);
  if (existing?.data?.metafieldDefinitions?.nodes?.length > 0) {
    return;
  }

  const createDefinition = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message }
      }
    }`;

  const result = await query(createDefinition, {
    variables: {
      definition: {
        name: "VIP free item configuration",
        namespace: NAMESPACE,
        key: KEY,
        type: "json",
        ownerType: "DISCOUNT",
        access: { admin: "MERCHANT_READ_WRITE" },
      },
    },
  });

  const userErrors = result?.data?.metafieldDefinitionCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((e) => e.message).join("; "));
  }
}

function parseConfig(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return {
      excludedProductTags: parsed.excludedProductTags ?? DEFAULTS.excludedProductTags,
      excludedCustomerTags: parsed.excludedCustomerTags ?? DEFAULTS.excludedCustomerTags,
      nearFreePrice: parsed.nearFreePrice ?? DEFAULTS.nearFreePrice,
      productLimit: parsed.productLimit ?? DEFAULTS.productLimit,
      discountMessage: parsed.discountMessage ?? DEFAULTS.discountMessage,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function splitTags(value) {
  return (value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
