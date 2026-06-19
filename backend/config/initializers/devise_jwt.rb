Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret = ENV.fetch("DEVISE_JWT_SECRET_KEY") { Rails.application.secret_key_base }
    jwt.dispatch_requests = [
      ["POST", %r{^/api/v1/auth/login$}]
    ]
    jwt.revocation_requests = [
      ["DELETE", %r{^/api/v1/auth/logout$}]
    ]
    jwt.expiration_time = 1.day.to_i
  end
end
