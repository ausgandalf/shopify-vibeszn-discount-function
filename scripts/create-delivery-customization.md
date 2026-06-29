# Activate the "hide free shipping" delivery customization

Unlike discounts, a delivery-customization **function** does not auto-appear in the
admin — you must create one `DeliveryCustomization` instance that points at the
function and carries its configuration metafield. This is a **one-time** Admin API
call per store. No hosting required.

## Prerequisites

- The app is installed on the store and `shopify app deploy` has run (so the
  `hide-free-shipping` function exists and has a stable **function handle**).
- A way to run an authenticated Admin GraphQL call. Easiest options:
  - Install Shopify's **Shopify GraphiQL App** on the store, or
  - Use an Admin API access token with `curl` / Postman.

## 1. Find the function ID (only if your API version < 2025-10)

On 2025-10+ you can pass the stable function **handle** directly, so you can skip
this. Otherwise look it up:

```graphql
query {
  shopifyFunctions(first: 25) {
    nodes { app { title } title apiType id }
  }
}
```

Find the node whose `apiType` is `delivery_customization`.

## 2. Create the delivery customization with its config

Replace `functionId` with the function ID (or use `functionHandle:
"hide-free-shipping"` on 2025-10+). The metafield value is the config the function
reads at runtime.

```graphql
mutation {
  deliveryCustomizationCreate(
    deliveryCustomization: {
      functionId: "REPLACE_WITH_FUNCTION_ID"
      title: "Hide free shipping for VIP code"
      enabled: true
      metafields: [
        {
          namespace: "$app:hide-free-shipping"
          key: "function-configuration"
          type: "json"
          value: "{\"hideRateNames\":[\"free domestic\",\"Free International\"],\"minAllocatedAmount\":\"0\"}"
        }
      ]
    }
  ) {
    deliveryCustomization { id }
    userErrors { field message }
  }
}
```

## 3. Update the config later

```graphql
mutation {
  deliveryCustomizationUpdate(
    id: "gid://shopify/DeliveryCustomization/XXXXXXXX"
    deliveryCustomization: {
      metafields: [
        {
          namespace: "$app:hide-free-shipping"
          key: "function-configuration"
          type: "json"
          value: "{\"hideRateNames\":[\"free domestic\",\"Free International\"]}"
        }
      ]
    }
  ) {
    deliveryCustomization { id }
    userErrors { field message }
  }
}
```

> `hideRateNames` are matched case-insensitively against each delivery option's
> title. Make sure they match the rate names in **Settings → Shipping and
> delivery**.
