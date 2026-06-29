Output.shipping_rates = Input.shipping_rates
#Shipping rate name to hide when discount is used

SHIPPING_RATE_NAMES = ['free domestic','Free International']



# Discount code(s) to trigger the script

DISCOUNT_CODES = ['FREEVIP']



# ======================================================================================= #



# ============================== Script Code (do not edit) ============================== #

# ======================================================================================= #



# Rate Selector

class RateNameSelector

  def initialize(names)

    @names = names.map(&:downcase).map(&:strip)

  end



  def match?(rate)

    @names.include?(rate.name.downcase)

  end

end



# DiscountCodeShippingCampaign

#

# If the cart has the entered discount code, then we want

# the specified shipping rate to be the only one showing



class DiscountCodeShippingCampaign



  def initialize(shipping_name, discount_codes, rate_name_selector)

    @shipping_name = shipping_name.map { |name| name.downcase.strip }

    @discount_codes = discount_codes.map { |discount_code| discount_code.downcase.strip }

    @rate_name_selector = rate_name_selector

  end



   def run(rates, cart)

    # Don't run if there are no discount codes in cart

    return if cart.discount_code.nil?

    # Delete Rates

    rates.delete_if do |shipping_rate|

      # Don't run if there are any unspecified rates in the cart

      return unless @discount_codes.any? { |discount_code| cart.discount_code.code.downcase.strip == discount_code }

      # Delete all rates that do not match the specified rate

      @rate_name_selector.match?(shipping_rate)

    end

  end

 end



CAMPAIGNS = [

  DiscountCodeShippingCampaign.new(

    SHIPPING_RATE_NAMES,

    DISCOUNT_CODES,

    RateNameSelector.new(SHIPPING_RATE_NAMES)

  ),

]



CAMPAIGNS.each do |campaign|

  campaign.run(Input.shipping_rates, Input.cart)

end



Output.shipping_rates = Input.shipping_rates