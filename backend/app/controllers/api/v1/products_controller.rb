module Api
  module V1
    class ProductsController < BaseController
      before_action :set_product, only: %i[update destroy]

      # GET /api/v1/products
      def index
        products = current_account.products
        products = products.active unless params[:all] == 'true'
        render json: products.map { |p| serialize(p) }
      end

      # POST /api/v1/products
      def create
        product = current_account.products.new(product_params)
        if product.save
          render json: serialize(product), status: :created
        else
          render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/products/:id
      def update
        if @product.update(product_params)
          render json: serialize(@product)
        else
          render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/products/:id
      def destroy
        @product.destroy
        head :no_content
      end

      private

      def set_product
        @product = current_account.products.find(params[:id])
      end

      def product_params
        params.require(:product).permit(:name, :description, :value, :currency, :active)
      end

      def serialize(p)
        {
          id:          p.id,
          name:        p.name,
          description: p.description,
          value:       p.value,
          currency:    p.currency,
          active:      p.active,
          created_at:  p.created_at,
          updated_at:  p.updated_at
        }
      end
    end
  end
end
