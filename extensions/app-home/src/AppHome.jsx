import { render } from "preact";

export default async () => {
  render(<App />, document.body);
};

function App() {
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

      <s-section heading="Set it up">
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
              on the discount page: excluded product tags, excluded customer tags,
              near-free price, number of items, the discount message, and the
              shipping rates to hide while the offer is active.
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

      <s-section heading="Turn on the shipping behavior (one time)">
        <s-paragraph>
          <s-text>
            The “hide free shipping” function must be enabled once per store. After
            that it reads its settings from the active discount automatically — no
            further setup. This one-time activation is a single Admin API call
            (deliveryCustomizationCreate); see the developer setup notes.
          </s-text>
        </s-paragraph>
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
