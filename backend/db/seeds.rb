# Example seed for local dev – creates one demo account (do NOT run in production).
if Rails.env.development? && Account.none?
  acc = Account.create!(
    chatwoot_account_id: 1,
    name: 'Demo',
    chatwoot_base_url: 'https://app.chatwoot.com',
    chatwoot_api_access_token: 'DEMO_TOKEN_REPLACE'
  )
  funnel = acc.funnels.create!(name: 'Vendas Demo', is_default: true)
  puts "Seeded account_token: #{acc.account_token}"
  puts "Funnel: #{funnel.name} (#{funnel.stages.count} etapas)"
end
