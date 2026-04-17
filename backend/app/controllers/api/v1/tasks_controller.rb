module Api
  module V1
    class TasksController < BaseController
      before_action :set_task, only: %i[show update destroy]

      # GET /api/v1/tasks?status=pending&lead_id=&priority=
      def index
        scope = current_account.tasks.ordered
        scope = scope.where(status:   params[:status])   if params[:status].present?
        scope = scope.where(lead_id:  params[:lead_id])  if params[:lead_id].present?
        scope = scope.where(priority: params[:priority]) if params[:priority].present?
        render json: scope.map { |t| serialize(t) }
      end

      def show
        render json: serialize(@task)
      end

      def create
        task = current_account.tasks.new(task_params)
        if task.save
          render json: serialize(task), status: :created
        else
          render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @task.update(task_params)
          render json: serialize(@task)
        else
          render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private

      def set_task
        @task = current_account.tasks.find(params[:id])
      end

      def task_params
        params.require(:task).permit(
          :title, :description, :status, :priority,
          :due_at, :lead_id, :assignee_chatwoot_user_id, :assignee_name
        )
      end

      def serialize(t)
        {
          id:           t.id,
          title:        t.title,
          description:  t.description,
          status:       t.status,
          priority:     t.priority,
          due_at:       t.due_at,
          lead_id:      t.lead_id,
          lead_title:   t.lead&.title,
          assignee_id:  t.assignee_chatwoot_user_id,
          assignee_name: t.assignee_name,
          overdue:      t.status == 'pending' && t.due_at.present? && t.due_at < Time.current,
          created_at:   t.created_at,
          updated_at:   t.updated_at
        }
      end
    end
  end
end
