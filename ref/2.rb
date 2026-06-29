# Script Setting Information:
#--------------------------------------------------------------------------
#--------------------------------------------------------------------------
# - 'discount_code_match_type' determines whether the below
#     strings should be an exact or partial match. Can be:
#       - ':exact' for an exact match
#       - ':partial' for a partial match
#   - 'discount_codes' is a list of strings to identify discount
#     codes
#   - 'product_selector_match_type' determines whether we look for
#     products that do or don't match the entered selectors. Can
#     be:
#       - ':include' to check if the product does match
#       - ':exclude' to make sure the product doesn't match
#   - 'product_selector_type' determines how eligible products
#     will be identified. Can be either:
#       - ':tag' to find products by tag
#       - ':type' to find products by type
#       - ':vendor' to find products by vendor
#       - ':product_id' to find products by ID
#       - ':variant_id' to find products by variant ID
#       - ':subscription' to find subscription products
#       - ':all' for all products
#   - 'product_selectors' is a list of identifiers (from above)
#     for qualifying products. Product/Variant ID lists should
#     only contain numbers (ie. no quotes). If ':all' is used,
#     this can also be 'nil'.
#   - 'discount_type' is the type of discount to provide. Can be
#     either:
#       - ':percent'
#       - ':dollar'
#   - 'discount_amount' is the percentage/dollar discount to
#     apply (per item)
#   - 'discount_message' is the message to show when a discount
#     is applied
#   - 'product_limit' is the maximum number of products that can 
#      be discounted
#   - 'customer_tag_match_type' determines whether we look for
#     customers that do or don't match the entered tags. Can
#     be:
#       - ':include' to check if the customer does match
#       - ':exclude' to make sure the customer doesn't match
#   - 'customer_tags' is a list of tags, separated by commas, to check the customer for
#     e.g ["tag1", "tag2", "tag3"]
#--------------------------------------------------------------------------
#--------------------------------------------------------------------------
# Script Settings:
#--------------------------------------------------------------------------
#--------------------------------------------------------------------------
PRODUCT_DISCOUNTS_BY_DISCOUNT_CODE = [
  {
    discount_code_match_type: :exact,
    discount_codes: ["FREEVIP"],
    product_selector_match_type: :exclude,
    product_selector_type: :tag,
    product_selectors: ["nodiscount"],
    discount_type: :oneforacent,
    discount_amount: 99.9,
    discount_message: 'Free item with this code',
    product_limit: 1,
    customer_tag_match_type: :exclude,
    customer_tags: ["usedcode"]
  }
]

# ================================ Script Code (do not edit) ================================
# ================================================================
# DiscountCodeSelector
#
# Finds whether the supplied discount code matches any of the
# entered codes.
# ================================================================
class DiscountCodeSelector
  def initialize(match_type, discount_codes)
    @comparator = match_type == :exact ? '==' : 'include?'
    @discount_codes = discount_codes.map { |discount_code| discount_code.upcase.strip }
  end

  def match?(discount_code)
    @discount_codes.any? { |code| discount_code.code.upcase.send(@comparator, code) }
  end
end

# ================================================================
# CustomerTagSelector
#
# Finds whether the supplied customer has any of the entered tags.
# ================================================================
class CustomerTagSelector
  def initialize(match_type, tags)
    @comparator = match_type == :include ? 'any?' : 'none?'
    @tags = tags.map { |tag| tag.downcase.strip }
  end
  def match?(customer)
    customer_tags = customer.tags.map { |tag| tag.downcase.strip }
    (@tags & customer_tags).send(@comparator)
  end
end

# ================================================================
# ProductSelector
#
# Finds matching products by the entered criteria.
# ================================================================
class ProductSelector
  def initialize(match_type, selector_type, selectors)
    @match_type = match_type
    @comparator = match_type == :include ? 'any?' : 'none?'
    @selector_type = selector_type
    @selectors = selectors
  end

  def match?(line_item)
    if self.respond_to?(@selector_type)
      self.send(@selector_type, line_item)
    else
      raise RuntimeError.new('Invalid product selector type')
    end
  end

  def tag(line_item)
    product_tags = line_item.variant.product.tags.map { |tag| tag.downcase.strip }
    @selectors = @selectors.map { |selector| selector.downcase.strip }
    (@selectors & product_tags).send(@comparator)
  end

  def type(line_item)
    @selectors = @selectors.map { |selector| selector.downcase.strip }
    (@match_type == :include) == @selectors.include?(line_item.variant.product.product_type.downcase.strip)
  end

  def vendor(line_item)
    @selectors = @selectors.map { |selector| selector.downcase.strip }
    (@match_type == :include) == @selectors.include?(line_item.variant.product.vendor.downcase.strip)
  end

  def product_id(line_item)
    (@match_type == :include) == @selectors.include?(line_item.variant.product.id)
  end

  def variant_id(line_item)
    (@match_type == :include) == @selectors.include?(line_item.variant.id)
  end

  def subscription(line_item)
    !line_item.selling_plan_id.nil?
  end

  def all(line_item)
    true
  end
end

# ================================================================
# DiscountApplicator
#
# Applies the entered discount to the supplied line item.
# ================================================================
class DiscountApplicator
  def initialize(discount_type, discount_amount, discount_message)
    @discount_type = discount_type
    @discount_message = discount_message

    @discount_amount = if discount_type == :percent
      1 - (discount_amount * 0.01)
    else
      Money.new(cents: 100) * discount_amount
    end
  end

  def apply(line_item)

    new_line_price = if @discount_type == :percent

      line_item.line_price * @discount_amount

    elsif  @discount_type == :amount

      [line_item.line_price - (@discount_amount * line_item.quantity), Money.zero].max

    else

      Money.new(cents:1)

    end



    line_item.change_line_price(new_line_price, message: @discount_message)

  end
end

# ================================================================
# ProductDiscountByCodeCampaign
#
# If any matching discount codes are used, any matching items
# will be discounted by the entered amount.
# ================================================================
class ProductDiscountByCodeCampaign
  def initialize(campaigns)
    @campaigns = campaigns
  end

  def run(cart)
    #return unless cart.customer&.tags
    return if cart.discount_code.nil?

    @campaigns.each do |campaign|
      discount_code_selector = DiscountCodeSelector.new(
        campaign[:discount_code_match_type],
        campaign[:discount_codes]
      )
      if cart.customer&.tags
      customer_tag_selector = CustomerTagSelector.new(campaign[:customer_tag_match_type], campaign[:customer_tags])
      next unless customer_tag_selector.match?(cart.customer)
    end
    
      next unless discount_code_selector.match?(cart.discount_code)

      product_selector = ProductSelector.new(
        campaign[:product_selector_match_type],
        campaign[:product_selector_type],
        campaign[:product_selectors]
      )

      @product_limit = campaign[:product_limit]

      discount_applicator = DiscountApplicator.new(
        campaign[:discount_type],
        campaign[:discount_amount],
        campaign[:discount_message]
      )

      sorted_line_items = cart.line_items.sort_by { |line_item| line_item.variant.price }

      sorted_line_items.each do |line_item|
        next unless product_selector.match?(line_item)
        if line_item.quantity > @product_limit
          # Taking amount we need to discount
          discounted_item = line_item.split(take: @product_limit)
          # Apply the discount
          discount_applicator.apply(discounted_item)
          position = cart.line_items.find_index(line_item)
          # Push the item/s back into the main line_item array
          cart.line_items.insert(position + 1, discounted_item)
        else
          # If the quantity is already at or below our limit
          # we simply apply a discount to all of it
          discount_applicator.apply(line_item)
        end
        # Reduce the product limit by one
        @product_limit -= 1
        
        # If the product limit hits 0 we are done discounting and ca
        # break out of looping all the cart's line_items
        break if @product_limit <= 0          
      end
    end
  end
end

CAMPAIGNS = [
  ProductDiscountByCodeCampaign.new(PRODUCT_DISCOUNTS_BY_DISCOUNT_CODE),
]

CAMPAIGNS.each do |campaign|
 campaign.run(Input.cart)
end

Output.cart = Input.cart