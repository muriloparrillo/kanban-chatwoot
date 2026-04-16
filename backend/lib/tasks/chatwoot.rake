namespace :chatwoot do
  desc "Backfill leads from Chatwoot conversations for all accounts"
  task backfill: :environment do
    limit = ENV.fetch('LIMIT', 200).to_i
    Account.find_each do |account|
      puts "Syncing account #{account.id} – #{account.name}…"
      count = Chatwoot::ConversationSync.new(account).backfill!(limit: limit)
      account.update(last_synced_at: Time.current)
      puts "  → #{count} conversas sincronizadas."
    rescue => e
      warn "  ✗ Erro: #{e.message}"
    end
    puts "Done."
  end

  desc "Backfill leads for a single account (ACCOUNT_ID=...)"
  task backfill_account: :environment do
    id = ENV.fetch('ACCOUNT_ID') { raise "Set ACCOUNT_ID=<id>" }.to_i
    limit = ENV.fetch('LIMIT', 500).to_i
    account = Account.find(id)
    count = Chatwoot::ConversationSync.new(account).backfill!(limit: limit)
    account.update(last_synced_at: Time.current)
    puts "Sincronizadas #{count} conversas para '#{account.name}'."
  end

  desc "Sync agents for all accounts"
  task sync_agents: :environment do
    Account.find_each do |account|
      puts "Agents for #{account.name}…"
      agents = account.chatwoot_client.agents
      puts "  → #{Array(agents).size} agentes."
    rescue => e
      warn "  ✗ #{e.message}"
    end
  end
end
