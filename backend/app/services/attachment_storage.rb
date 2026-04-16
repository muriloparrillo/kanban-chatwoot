require 'fileutils'

# Pluggable storage: local FS in dev, S3 in production.
module AttachmentStorage
  module_function

  def driver
    ENV.fetch('STORAGE_DRIVER', 'local')
  end

  def upload(key:, file:)
    case driver
    when 's3' then upload_s3(key, file)
    else          upload_local(key, file)
    end
  end

  def delete(key)
    case driver
    when 's3' then s3_client.delete_object(bucket: ENV['S3_BUCKET'], key: key)
    else          File.delete(local_path(key)) rescue nil
    end
  end

  def upload_local(key, file)
    path = local_path(key)
    FileUtils.mkdir_p(File.dirname(path))
    File.binwrite(path, file.read)
    "/uploads/#{key}"
  end

  def local_path(key)
    File.join(ENV.fetch('UPLOADS_DIR', 'tmp/uploads'), key)
  end

  def upload_s3(key, file)
    s3_client.put_object(bucket: ENV['S3_BUCKET'], key: key, body: file.read,
                         content_type: file.content_type)
    "https://#{ENV['S3_BUCKET']}.s3.#{ENV.fetch('AWS_REGION', 'us-east-1')}.amazonaws.com/#{key}"
  end

  def s3_client
    require 'aws-sdk-s3'
    @s3_client ||= Aws::S3::Client.new(
      region: ENV.fetch('AWS_REGION', 'us-east-1'),
      access_key_id: ENV['AWS_ACCESS_KEY_ID'],
      secret_access_key: ENV['AWS_SECRET_ACCESS_KEY']
    )
  end
end
