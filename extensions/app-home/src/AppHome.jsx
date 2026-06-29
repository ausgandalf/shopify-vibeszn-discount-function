import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

const FUNCTION_HANDLE = "hide-free-shipping";
const CUSTOMIZATION_TITLE = "Hide free shipping for VIP code";

const LIST_QUERY = `#graphql
  query {
    deliveryCustomizations(first: 50) {
      nodes { id title enabled }
    }
  }`;

const CREATE_MUTATION = `#graphql
  mutation Create($input: DeliveryCustomizationInput!) {
    deliveryCustomizationCreate(deliveryCustomization: $input) {
      deliveryCustomization { id enabled }
      userErrors { field message }
    }
  }`;

const UPDATE_MUTATION = `#graphql
  mutation Update($id: ID!, $input: DeliveryCustomizationInput!) {
    deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
      deliveryCustomization { id enabled }
      userErrors { field message }
    }
  }`;

export default async () => {
  render(<App />, document.body);
};

function App() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [customization, setCustomization] = useState(null); // { id, enabled } | null
  const [error, setError] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await shopify.query(LIST_QUERY);
      const node = (res?.data?.deliveryCustomizations?.nodes || []).find(
        (n) => n.title === CUSTOMIZATION_TITLE,
      );
      setCustomization(node || null);
    } catch (e) {
      setError(`Couldn't read status: ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function setEnabled(target) {
    setBusy(true);
    setError(null);
    try {
      if (!customization) {
        const res = await shopify.query(CREATE_MUTATION, {
          variables: {
            input: {
              functionHandle: FUNCTION_HANDLE,
              title: CUSTOMIZATION_TITLE,
              enabled: true,
            },
          },
        });
        throwOnUserErrors(res?.data?.deliveryCustomizationCreate?.userErrors);
      } else {
        const res = await shopify.query(UPDATE_MUTATION, {
          variables: { id: customization.id, input: { enabled: target } },
        });
        throwOnUserErrors(res?.data?.deliveryCustomizationUpdate?.userErrors);
      }
      await refresh();
    } catch (e) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const active = Boolean(customization && customization.enabled);

  return (
    <s-page heading="VibeSzn Discount Functions">
      <s-button slot="primary-action" variant="primary" href="shopify://admin/discounts">
        Go to Discounts
      </s-button>

      <s-section heading="What this app does">
        <s-stack gap="base">
          <s-paragraph>
            <s-text>
              Two checkout behaviors that run automatically on Shopify — no extra
              hosting, all configured from the discount itself:
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">Free item with a code. </s-text>
            <s-text>
              When a customer applies your discount code, the cheapest eligible
              item in their cart is discounted to a near-free price. You control
              which products and customers are excluded, the price, the number of
              items, and the message.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">Hide free shipping while the offer is active. </s-text>
            <s-text>
              When the free-item offer applies to a cart, the shipping rates you
              choose are hidden at checkout, so the freebie can't be combined with
              free shipping. It only triggers for this specific offer.
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Set up the discount">
        <s-stack gap="base">
          <s-paragraph>
            <s-text weight="bold">1. Create the discount. </s-text>
            <s-text>Open </s-text>
            <s-link href="shopify://admin/discounts">Discounts</s-link>
            <s-text> → Create discount → choose “VibeSzn — Free Item with Code”.</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">2. Enter your discount code </s-text>
            <s-text>(for example, FREEVIP).</s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">3. Fill in the settings </s-text>
            <s-text>
              on the discount page: excluded product/customer tags, near-free
              price, number of items, the message, and the shipping rates to hide.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">4. Save the discount.</s-text>
          </s-paragraph>
          <s-box>
            <s-button variant="primary" href="shopify://admin/discounts">
              Create a discount
            </s-button>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Free-shipping hiding">
        <s-stack gap="base">
          <s-paragraph>
            <s-text>
              Turn this on to let the app remove your chosen shipping rates at
              checkout whenever the free-item offer is active. It must be enabled
              once per store. The rates it hides come from the “Shipping rates to
              hide” field on your discount — there's nothing else to configure here.
            </s-text>
          </s-paragraph>

          {error ? <s-banner tone="critical">{error}</s-banner> : null}

          {loading ? (
            <s-text>Checking status…</s-text>
          ) : (
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-text weight="bold">
                Status: {active ? "Enabled" : "Disabled"}
              </s-text>
              {active ? (
                <s-button
                  tone="critical"
                  disabled={busy}
                  onclick={() => setEnabled(false)}
                >
                  {busy ? "Working…" : "Disable"}
                </s-button>
              ) : (
                <s-button
                  variant="primary"
                  disabled={busy}
                  onclick={() => setEnabled(true)}
                >
                  {busy ? "Working…" : "Enable"}
                </s-button>
              )}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Good to know">
        <s-stack gap="base">
          <s-paragraph>
            <s-text>
              All configuration lives on the discount. To change anything later,
              just edit the discount — no redeploy needed.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text>
              The shipping hide is precise: it fires only for this offer, not for
              order-wide discounts or other promotions.
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

function throwOnUserErrors(userErrors) {
  const errs = userErrors || [];
  if (errs.length > 0) {
    throw new Error(errs.map((e) => e.message).join("; "));
  }
}
