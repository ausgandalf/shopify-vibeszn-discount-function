# Activate the "hide free shipping" delivery customization

Unlike discounts, a delivery-customization **function** does not auto-appear in the
admin — you must create one `DeliveryCustomization` instance that points at the
function so it runs at checkout. This is a **one-time** Admin API call per store.
No hosting required.

> **Configuration note:** the rate names to hide are NOT set here. They live in
> the **discount settings form** (`hideRateNames`), and the shipping function reads
> them from the active discount at checkout. So this mutation only needs to
> *enable* the function — no metafield required.

## Prerequisites

- The app is installed and `shopify app deploy` has run (so the
  `hide-free-shipping` function exists with a stable **function handle**).
- A way to run an authenticated Admin GraphQL call — easiest is the
  **Shopify GraphiQL App** installed on the store.

## 1. Find the function ID (skip on API version 2025-10+)

On 2025-10+ you can pass the stable function **handle** directly. Otherwise:

```graphql
query {
  shopifyFunctions(first: 25) {
    nodes { app { title } title apiType id }
  }
}
```

Use the node whose `apiType` is `delivery_customization`.

## 2. Create (enable) the delivery customization

```graphql
mutation {
  deliveryCustomizationCreate(
    deliveryCustomization: {
      functionId: "REPLACE_WITH_FUNCTION_ID"
      title: "Hide free shipping for VIP code"
      enabled: true
    }
  ) {
    deliveryCustomization { id }
    userErrors { field message }
  }
}
```

That's it — no metafields. To change which rates are hidden, edit the
**Shipping rates to hide** field in the discount's settings form in admin.

## Enable / disable later

```graphql
mutation {
  deliveryCustomizationUpdate(
    id: "gid://shopify/DeliveryCustomization/XXXXXXXX"
    deliveryCustomization: { enabled: false }
  ) {
    deliveryCustomization { id enabled }
    userErrors { field message }
  }
}
```

> Rate names are matched case-insensitively against each delivery option's title,
> so make them match the rate names in **Settings → Shipping and delivery**.
