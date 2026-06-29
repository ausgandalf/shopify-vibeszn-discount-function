import { useState } from "react";
import {
  reactExtension,
  useApi,
  FunctionSettings,
  Section,
  TextField,
  NumberField,
  BlockStack,
  Text,
} from "@shopify/ui-extensions-react/admin";

const TARGET = "admin.discount-details.function-settings.render";
const NAMESPACE = "$app:vip-free-item";
const KEY = "function-configuration";

const DEFAULTS = {
  excludedProductTags: ["nodiscount"],
  excludedCustomerTags: ["usedcode"],
  nearFreePrice: "0.01",
  productLimit: 1,
  discountMessage: "Free item with this code",
};

export default reactExtension(TARGET, () => <App />);

function App() {
  const { applyMetafieldChange, data } = useApi(TARGET);
  const initial = readInitialConfig(data);

  const [excludedProductTags, setExcludedProductTags] = useState(
    initial.excludedProductTags.join(", "),
  );
  const [excludedCustomerTags, setExcludedCustomerTags] = useState(
    initial.excludedCustomerTags.join(", "),
  );
  const [nearFreePrice, setNearFreePrice] = useState(initial.nearFreePrice);
  const [productLimit, setProductLimit] = useState(Number(initial.productLimit));
  const [discountMessage, setDiscountMessage] = useState(initial.discountMessage);

  async function onSave() {
    const config = {
      excludedProductTags: splitTags(excludedProductTags),
      excludedCustomerTags: splitTags(excludedCustomerTags),
      nearFreePrice: String(nearFreePrice),
      productLimit: Number(productLimit) || 1,
      discountMessage,
    };

    await applyMetafieldChange({
      type: "updateMetafield",
      namespace: NAMESPACE,
      key: KEY,
      value: JSON.stringify(config),
      valueType: "json",
    });
  }

  return (
    <FunctionSettings onSave={onSave}>
      <Section>
        <BlockStack gap="base">
          <Text fontWeight="bold">Free item offer</Text>
          <TextField
            label="Excluded product tags (comma-separated)"
            value={excludedProductTags}
            onChange={setExcludedProductTags}
          />
          <TextField
            label="Excluded customer tags (comma-separated)"
            value={excludedCustomerTags}
            onChange={setExcludedCustomerTags}
          />
          <TextField
            label="Near-free price (per item)"
            value={nearFreePrice}
            onChange={setNearFreePrice}
          />
          <NumberField
            label="Number of items to discount"
            value={Number(productLimit)}
            onChange={setProductLimit}
          />
          <TextField
            label="Discount message"
            value={discountMessage}
            onChange={setDiscountMessage}
          />
        </BlockStack>
      </Section>
    </FunctionSettings>
  );
}

function readInitialConfig(data) {
  try {
    const metafield = data?.metafields?.find((m) => m.key === KEY);
    if (!metafield?.value) return { ...DEFAULTS };
    const parsed = JSON.parse(metafield.value);
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
