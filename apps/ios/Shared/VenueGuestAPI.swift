import Foundation
import Security
import CryptoKit

enum VenueGuestScreen: String, Hashable {
  case menu, card, checkout, reviews, wifi
}

struct VenueGuestLink: Hashable {
  var origin: URL
  var slug: String

  static let starter = VenueGuestLink(origin: configuredOrigin, slug: "sweeto")

  private static let defaultOrigin = URL(string: "https://papupay.com")!
  private static var configuredOrigin: URL {
    guard let value = Bundle.main.object(forInfoDictionaryKey: "PapuPayWebOrigin") as? String,
      let url = URL(string: value), url.scheme == "https", url.host != nil else {
      return defaultOrigin
    }
    return url
  }

  static func parse(_ url: URL) -> (Self, VenueGuestScreen?, SweetoLanguage?)? {
    guard url.scheme == "https", url.user == nil, url.password == nil,
      let host = url.host, [defaultOrigin.host, "papupay.vercel.app", configuredOrigin.host].contains(host),
      var parts = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
    let rawPath = parts.percentEncodedPath
    let trimmed = rawPath.hasSuffix("/") ? String(rawPath.dropLast()) : rawPath
    let path = trimmed.isEmpty ? [] : trimmed.dropFirst().split(separator: "/", omittingEmptySubsequences: false).map(String.init)
    var slug = "sweeto"
    let screen: VenueGuestScreen?
    switch path {
    case [], ["app"], ["app.html"], ["clip"], ["clip.html"]: screen = nil
    default:
      guard (2...3).contains(path.count), ["v", "go"].contains(path[0]),
        path[1].range(of: "^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$", options: .regularExpression) != nil
      else { return nil }
      slug = path[1] == "maka-maslo" ? "sweeto" : path[1]
      switch (path[0], path.count == 3 ? path[2] : nil) {
      case ("go", "table"), ("v", nil): screen = nil
      case ("go", "counter"): screen = .checkout
      case ("go", "menu"): screen = .menu
      case ("v", let destination?):
        guard let value = VenueGuestScreen(rawValue: destination), value != .checkout else { return nil }
        screen = value
      default: return nil
      }
    }
    let language = parts.queryItems?.first(where: { $0.name == "lang" })?.value
      .flatMap(SweetoLanguage.init(rawValue:))
    parts.path = ""
    parts.query = nil
    parts.fragment = nil
    guard let origin = parts.url else { return nil }
    return (VenueGuestLink(origin: origin, slug: slug), screen, language)
  }

  func imageURL(_ value: String?) -> URL? {
    guard let value, let url = URL(string: value, relativeTo: origin)?.absoluteURL,
      url.scheme == "https", url.host != nil, url.user == nil, url.password == nil
    else { return nil }
    return url
  }

  func googleReviewURL(_ value: URL?) -> URL? {
    guard let url = validGoogleURL(value), let host = url.host else { return nil }
    let path = url.path
    switch host {
    case "search.google.com":
      let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
      let placeID = query?.first(where: { $0.name == "placeid" })?.value
      return path == "/local/writereview" && placeID?.isEmpty == false ? url : nil
    case "g.page":
      return path.range(of: "^/r/[A-Za-z0-9_-]+/review/?$", options: .regularExpression) != nil ? url : nil
    case "maps.app.goo.gl":
      return path.range(of: "^/[A-Za-z0-9_-]+/?$", options: .regularExpression) != nil ? url : nil
    case "goo.gl":
      return path.range(of: "^/maps/[A-Za-z0-9_-]+/?$", options: .regularExpression) != nil ? url : nil
    case "www.google.com", "www.google.pl":
      return path.hasPrefix("/maps/place/") ? url : nil
    default:
      return nil
    }
  }

  func googleMapsURL(_ value: URL?) -> URL? {
    guard let url = validGoogleURL(value), let host = url.host else { return nil }
    if ["maps.google.com", "www.google.com", "www.google.pl", "google.com"].contains(host),
      url.path == "/maps" || url.path.hasPrefix("/maps/") {
      return url
    }
    return googleReviewURL(url)
  }

  private func validGoogleURL(_ value: URL?) -> URL? {
    guard let value, value.scheme == "https", value.port == nil, value.user == nil,
      value.password == nil else { return nil }
    return value
  }
}

struct VenueGuestTheme: Decodable {
  let background: String?
  let ink: String?
  let accent: String?
  let muted: String?
  let surface: String?
  let font: String?
  let motionTheme: String?
}

struct VenueGuestWiFi: Decodable {
  enum Security: String, Decodable { case WPA, WEP, nopass }
  let ssid: String
  let security: Security
  let hidden: Bool
  let password: String?
}

struct VenueGuestPhotoDrip: Decodable, Sendable {
  let x: Double
  let color: String
  /// Photo row that sits flush with the card's bottom edge.
  var y: Double? = nil
  /// Fraction of the fitted photo occupied by its sauce outlet.
  var width: Double? = nil

  var isValid: Bool {
    (0.1...0.9).contains(x)
      && color.range(of: #"^#[0-9a-fA-F]{6}$"#, options: .regularExpression) != nil
      && (y.map { (0.8...1).contains($0) } ?? true)
      && (width.map { (0.01...0.20).contains($0) } ?? true)
  }
}

struct VenueGuestConfig: Decodable {
  let id: String?
  let name: String?
  let address: String?
  let logoUrl: String?
  let logoWhiteUrl: String?
  let photoUrl: String?
  let photoMotion: String?
  let photoDrip: VenueGuestPhotoDrip?
  let menuFallback: String?
  let menuImageUrl: String?
  let theme: VenueGuestTheme?
  let reviewUrl: URL?
  let mapUrl: URL?
  let menuPdf: [String: String?]?
  let wifi: VenueGuestWiFi?

  var animatesMenuSauce: Bool {
    photoMotion == "sauce-drip" || photoMotion == "chocolate-drip"
  }
}

struct VenueLoyaltyCard: Codable, Equatable {
  let code: String
  let checkout: String
  let stamps: Int
  let goal: Int
  let rewardAvailable: Bool
  var visits: Int?
  var updatedAt: String?

  var revisionDate: Date? {
    guard let updatedAt else { return nil }
    return try? Date(updatedAt, strategy: .iso8601.year().month().day()
      .time(includingFractionalSeconds: true).timeZone(separator: .omitted))
  }

  func fingerprint(in venue: VenueGuestLink) -> Data {
    Data(SHA256.hash(data: Data((venue.origin.absoluteString + "|" + venue.slug + "|" + checkout).utf8)))
  }
}

/// A checkpoint of progress actually shown at checkout. No barcode or session token is stored.
struct VenueStampObservation: Codable, Equatable {
  let membership: Data
  let visits: Int
  let stamps: Int
  let goal: Int
  let updated: Date

  enum Change: Equatable { case quiet, stale, earned(Int) }

  @MainActor static func record(
    _ card: VenueLoyaltyCard?, venue: VenueGuestLink, defaults: UserDefaults = .standard
  ) -> Change {
    let key = "papupay.observed-stamps.v1." + venue.origin.absoluteString + "/" + venue.slug
    guard let card else {
      defaults.removeObject(forKey: key)
      return .quiet
    }
    guard let visits = card.visits, let updated = card.revisionDate,
      visits >= 0, !card.checkout.isEmpty, card.goal > 0, (0...card.goal).contains(card.stamps), card.stamps <= visits,
      card.rewardAvailable == (card.stamps == card.goal)
    else { return .quiet }
    let current = Self(membership: card.fingerprint(in: venue),
                       visits: visits, stamps: card.stamps, goal: card.goal, updated: updated)
    let previous = defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(Self.self, from: $0) }
    if previous == current { return .quiet }
    if let previous, previous.membership == current.membership, current.updated < previous.updated { return .stale }
    guard let data = try? JSONEncoder().encode(current) else { return .quiet }
    defaults.set(data, forKey: key)
    guard let previous, previous.membership == current.membership, previous.goal == current.goal else { return .quiet }
    let gained = current.stamps - previous.stamps
    // Redemptions and reversed redemptions can move the displayed balance without a new stamp.
    guard gained > 0, current.visits - previous.visits == gained else { return .quiet }
    return .earned(gained)
  }
}

struct VenueGuestAPI {
  private struct CardResponse: Decodable { let card: VenueLoyaltyCard? }
  private struct WiFiResponse: Decodable { let wifi: VenueGuestWiFi? }
  private struct VenueResponse: Decodable { let venues: [VenueGuestConfig] }
  private struct GoogleWalletResponse: Decodable { let url: URL }
  struct WalletResponse: Decodable {
    enum Status: String, Decodable { case unconfigured, requires_card, ready }
    let status: Status
    let passUrl: String?
    let updatesEnabled: Bool?
    let recoveryEnabled: Bool?
    let googleStatus: Status?
  }
  let venue: VenueGuestLink

  private func request(_ path: String, method: String = "GET") -> URLRequest {
    var request = URLRequest(url: venue.origin.appending(path: path), cachePolicy: .reloadIgnoringLocalCacheData)
    request.httpMethod = method
    request.timeoutInterval = 10
    return request
  }

  private func transport(
    _ request: URLRequest, contentType: String? = "application/json", session: URLSession = .shared
  ) async throws -> Data {
    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
      http.url?.scheme == "https", http.url?.host == venue.origin.host
    else { throw URLError(.badServerResponse) }
    if let contentType, http.mimeType != contentType { throw URLError(.cannotDecodeContentData) }
    return data
  }

  private func json<Value: Decodable>(_ path: String, _ method: String = "GET") async throws -> Value {
    let data = try await transport(request(path, method: method))
    return try JSONDecoder().decode(Value.self, from: data)
  }

  private var tenantPath: String { "api/v/\(venue.slug)" }
  private var venuePath: String { "\(tenantPath)/venue" }
  private var loyaltyPath: String { "\(tenantPath)/loyalty/card" }

  func configuration() async throws -> VenueGuestConfig { try await json(venuePath) }

  func venues() async throws -> [VenueGuestConfig] {
    let result: VenueResponse = try await json("api/venues")
    return result.venues
  }

  @MainActor func cachedCard() -> VenueLoyaltyCard? {
    let url = venue.origin.appending(path: loyaltyPath)
    return VenueMembership(venue: venue, requestURL: url).cachedCard()
  }

  func card(create: Bool = false) async throws -> VenueLoyaltyCard? {
    let cardRequest = request(loyaltyPath)
    guard let url = cardRequest.url else { throw URLError(.badURL) }
    let membership = VenueMembership(venue: venue, requestURL: url)
    let startedAt = ContinuousClock.now
    for credential in membership.candidates() {
      var validation = cardRequest
      validation.httpShouldHandleCookies = false
      validation.setValue("\(membership.cookieName)=\(credential.token)", forHTTPHeaderField: "Cookie")
      let data = try await transport(validation, session: Self.membershipValidation)
      let decoded = try JSONDecoder().decode(CardResponse.self, from: data)
      try Task.checkCancellation()
      if let card = decoded.card {
        guard await membership.accept(credential, card: card, startedAt: startedAt, validating: true) else {
          throw CancellationError()
        }
        return card
      }
      guard await membership.discard(credential, startedAt: startedAt) else { throw CancellationError() }
    }
    let result: CardResponse = try await json(loyaltyPath, create ? "POST" : "GET")
    try Task.checkCancellation()
    if let card = result.card, let credential = membership.nativeCredential() {
      guard await membership.accept(credential, card: card, startedAt: startedAt) else {
        throw CancellationError()
      }
    }
    return result.card
  }

  // A migrated bearer token goes only to the exact checkout endpoint, never through a redirect.
  private static let membershipValidation = URLSession(
    configuration: .ephemeral, delegate: NoMembershipRedirects(), delegateQueue: nil
  )

  func wifi() async throws -> VenueGuestWiFi? {
    let result: WiFiResponse = try await json("\(venuePath)/wifi")
    return result.wifi
  }

  func countReview() async {
    _ = try? await transport(request("\(venuePath)/review-click", method: "POST"), contentType: nil)
  }

  func wallet() async throws -> WalletResponse { try await json("\(tenantPath)/loyalty/wallet") }

  func applePass(language: SweetoLanguage) async throws -> Data {
    var request = request("\(tenantPath)/loyalty/apple-wallet.pkpass")
    request.url = request.url?.appending(queryItems: [.init(name: "lang", value: language.rawValue)])
    return try await transport(request, contentType: "application/vnd.apple.pkpass")
  }

  func googlePassURL() async throws -> URL {
    let response: GoogleWalletResponse = try await json("\(tenantPath)/loyalty/google-wallet", "POST")
    let url = response.url
    guard url.scheme == "https", url.host == "pay.google.com", url.port == nil,
      url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
      url.path.range(of: #"^/gp/v/save/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$"#, options: .regularExpression) != nil
    else { throw URLError(.badServerResponse) }
    return url
  }

  struct RecoveryPreview: Decodable {
    let code: String
    let stamps: Int
    let goal: Int
    var name: String?
  }

  enum RecoveryFailure: Error { case invalid }

  // The link is a bearer capability. Keep it in memory and send it only in the
  // body of a POST to the exact venue origin, without redirects or URL caching.
  private func recover(_ token: String, preview: Bool) async throws -> (Data, HTTPURLResponse) {
    let path = "\(tenantPath)/loyalty/restore" + (preview ? "/preview" : "")
    var query = request(path, method: "POST")
    query.httpShouldHandleCookies = false
    query.setValue("application/json", forHTTPHeaderField: "Content-Type")
    query.httpBody = try JSONEncoder().encode(["token": token])
    let (body, response) = try await Self.membershipValidation.data(for: query)
    guard let http = response as? HTTPURLResponse, http.url == query.url else { throw URLError(.badServerResponse) }
    if [400, 401, 403, 410].contains(http.statusCode) { throw RecoveryFailure.invalid }
    guard http.statusCode == 200, http.mimeType == "application/json" else { throw URLError(.badServerResponse) }
    return (body, http)
  }

  func recoveryPreview(_ token: String) async throws -> RecoveryPreview {
    let (body, _) = try await recover(token, preview: true)
    return try JSONDecoder().decode(RecoveryPreview.self, from: body)
  }

  func restoreCard(_ token: String) async throws -> VenueLoyaltyCard {
    let startedAt = ContinuousClock.now
    let (body, response) = try await recover(token, preview: false)
    let requestURL = venue.origin.appending(path: loyaltyPath)
    let membership = VenueMembership(venue: venue, requestURL: requestURL)
    guard let card = try JSONDecoder().decode(CardResponse.self, from: body).card,
          let header = response.value(forHTTPHeaderField: "Set-Cookie"),
          let cookie = HTTPCookie.cookies(withResponseHeaderFields: ["Set-Cookie": header], for: requestURL)
            .first(where: { $0.name == membership.cookieName && $0.isSecure }) else { throw URLError(.badServerResponse) }
    let credential = VenueMembership.Credential(token: cookie.value, expires: cookie.expiresDate)
    guard await membership.accept(credential, card: card, startedAt: startedAt) else { throw CancellationError() }
    return card
  }
}

private final class NoMembershipRedirects: NSObject, URLSessionTaskDelegate {
  func urlSession(
    _ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void
  ) {
    completionHandler(nil)
  }
}

struct VenueMembership {
  struct Credential: Codable {
    let token: String
    let expires: Date?
    var cachedCard: VenueLoyaltyCard?

    var isValid: Bool {
      token.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil &&
        (expires.map { $0 > Date() } ?? true)
    }
  }

  private static let clipService = "com.papupay.app.membership.clip"
  private static let appService = "com.papupay.app.membership.full"
  private static let lastVenueAccount = "last-venue"
  @MainActor private static var lastResolvedRequest: [String: ContinuousClock.Instant] = [:]

  private static var currentService: String {
#if PAPUPAY_APP_CLIP
    clipService
#else
    appService
#endif
  }

  private var services: [String] {
#if PAPUPAY_APP_CLIP
    [Self.clipService]
#else
    [Self.appService, Self.clipService]
#endif
  }

  let venue: VenueGuestLink
  let requestURL: URL

  var cookieName: String { "papupay_\(venue.slug)_card" }
  private var account: String { venue.origin.absoluteString + "|" + venue.slug }
  private var nativeCookie: HTTPCookie? {
    HTTPCookieStorage.shared.cookies(for: requestURL)?.first(where: { $0.name == cookieName })
  }

  func nativeCredential() -> Credential? {
    guard let cookie = nativeCookie else { return nil }
    let credential = Credential(token: cookie.value, expires: cookie.expiresDate)
    return credential.isValid ? credential : nil
  }

  func candidates() -> [Credential] {
    var tokens = Set<String>()
    return ([nativeCredential()] + services.map(credential(for:))).compactMap { candidate in
      guard let candidate, tokens.insert(candidate.token).inserted else { return nil }
      return candidate
    }
  }

  @MainActor func cachedCard() -> VenueLoyaltyCard? {
    guard let token = candidates().first?.token else { return nil }
    return services
      .compactMap(credential(for:))
      .compactMap { $0.token == token ? $0.cachedCard : nil }
      .max { ($0.revisionDate ?? .distantPast) < ($1.revisionDate ?? .distantPast) }
  }

  @MainActor func accept(
    _ credential: Credential, card: VenueLoyaltyCard, startedAt: ContinuousClock.Instant, validating: Bool = false
  ) -> Bool {
    let service = Self.currentService
    guard !Task.isCancelled, credential.isValid, let host = venue.origin.host,
      Self.lastResolvedRequest[account].map({ $0 <= startedAt }) ?? true,
      !validating || candidates().contains(where: { $0.token == credential.token })
    else { return false }
    Self.lastResolvedRequest[account] = startedAt
    if let previous = self.credential(for: service), previous.token == credential.token,
       let saved = previous.cachedCard, saved.checkout == card.checkout,
       let savedRevision = saved.revisionDate, let incomingRevision = card.revisionDate,
       incomingRevision < savedRevision {
      return true
    }
    if nativeCookie?.value != credential.token {
      var properties: [HTTPCookiePropertyKey: Any] = [
        .name: cookieName, .value: credential.token, .domain: host, .path: "/api",
        .secure: "TRUE", HTTPCookiePropertyKey("HttpOnly"): "TRUE",
      ]
      if let expires = credential.expires { properties[.expires] = expires }
      if let cookie = HTTPCookie(properties: properties) { HTTPCookieStorage.shared.setCookie(cookie) }
    }
    let encoder = JSONEncoder()
    encoder.outputFormatting = .sortedKeys
    // Keep an authenticated counter code readable while the venue is offline.
    // Code and valid credential are stored together in the device Keychain.
    // Confirmation and reward redemption remain server-side.
    let saved = Credential(token: credential.token, expires: credential.expires,
                           cachedCard: Self.canStore(card) ? card : nil)
    if let data = try? encoder.encode(saved) {
      Self.write(data, service: service, account: account)
    }
#if PAPUPAY_APP_CLIP
    let cardURL = venue.origin.appending(path: "v/\(venue.slug)/card")
    Self.write(Data(cardURL.absoluteString.utf8), service: Self.clipService, account: Self.lastVenueAccount)
#endif
    return true
  }

  @MainActor func discard(_ credential: Credential, startedAt: ContinuousClock.Instant) -> Bool {
    guard !Task.isCancelled, Self.lastResolvedRequest[account].map({ $0 <= startedAt }) ?? true else { return false }
    Self.lastResolvedRequest[account] = startedAt
    if let cookie = nativeCookie, cookie.value == credential.token {
      HTTPCookieStorage.shared.deleteCookie(cookie)
    }
    for service in services where self.credential(for: service)?.token == credential.token {
      SecItemDelete(Self.key(service: service, account: account) as CFDictionary)
    }
    return true
  }

  private static func canStore(_ card: VenueLoyaltyCard) -> Bool {
    !card.checkout.isEmpty && !card.code.isEmpty && card.goal > 0 &&
      (0...card.goal).contains(card.stamps) && card.rewardAvailable == (card.stamps == card.goal)
  }

  private func credential(for service: String) -> Credential? {
    guard let data = Self.read(service: service, account: account),
      let item = try? JSONDecoder().decode(Credential.self, from: data), item.isValid else { return nil }
    return item
  }

#if !PAPUPAY_APP_CLIP
  static func clipVenueForUpgrade() -> VenueGuestLink? {
    guard let data = read(service: clipService, account: lastVenueAccount),
      let urlString = String(data: data, encoding: .utf8), let url = URL(string: urlString),
      let (venue, screen, _) = VenueGuestLink.parse(url), screen == .card,
      VenueMembership(venue: venue, requestURL: url).credential(for: clipService) != nil
    else { return nil }
    return venue
  }
#endif

  // Apple exposes an App Clip's default Keychain entries to its associated full app.
  // Separate services retain previous full-app entries across Clip and app reinstall cycles.
  private static func key(service: String, account: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }

  private static func read(service: String, account: String) -> Data? {
    var query = key(service: service, account: account)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var value: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess else { return nil }
    return value as? Data
  }

  private static func write(_ data: Data, service: String, account: String) {
    guard read(service: service, account: account) != data else { return }
    let query = key(service: service, account: account)
    let update = [kSecValueData as String: data]
    if SecItemUpdate(query as CFDictionary, update as CFDictionary) == errSecItemNotFound {
      var item = query
      item[kSecValueData as String] = data
      item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
      SecItemAdd(item as CFDictionary, nil)
    }
  }
}
