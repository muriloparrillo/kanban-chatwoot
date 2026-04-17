module Api
  module V1
    class LeadProductsController < BaseController
      before_action :set_lead

      # POST /api/v1/leads/:lead_id/lead_products
      # body: { product_id: X }
      def create
        product = current_account.products.find(params[:product_id])
        lp = @lead.lead_products.find_or_initialize_by(product_id: product.id)
        lp.unit_value = product.value
        if lp.save
          render json: serialize(lp), status: :created
        else
          render json: { errors: lp.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/leads/:lead_id/lead_products/:id
      def destroy
        lp = @lead.lead_products.find(params[:id])
        lp.destroy
        head :no_content
      end

      private

      def set_lead
        @lead = current_account.leads.find(params[:lead_id])
      end

      def serialize(lp)
        {
          id:         lp.id,
          product_id: lp.product_id,
          unit_value: lp.unit_value,
          product:    {
            id:           lp.product.id,
            name:         lp.product.name,
            value:        lp.product.value,
            currency:     lp.product.currency,
            billing_type: lp.product.billing_type
          }
        }
      end
    end
  end
end
