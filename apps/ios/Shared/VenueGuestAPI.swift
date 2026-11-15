import Foundation
import Security

enum VenueGuestScreen: String, Hashable {
  case menu, card, reviews, wifi
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
      case ("go", "counter"): screen = .card
      case ("go", "menu"): screen = .menu
      case ("v", let destination?):
        guard let value = VenueGuestScreen(rawValue: destination) else { return nil }
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

struct VenueGuestConfig: Decodable {
  let id: String?
  let name: String?
  let address: String?
  let logoUrl: String?
  let photoUrl: String?
  let photoMotion: String?
  let menuFallback: String?
  let theme: VenueGuestTheme?
  let reviewUrl: URL?
  let mapUrl: URL?
  let menuPdf: [String: String?]?
  let wifi: VenueGuestWiFi?
}

struct VenueLoyaltyCard: Decodable, Equatable {
  let code: String
  let checkout: String
  let stamps: Int
  let goal: Int
  let rewardAvailable: Bool
}

struct VenueGuestAPI {
  private struct CardResponse: Decodable { let card: VenueLoyaltyCard? }
  private struct WiFiResponse: Decodable { let wifi: VenueGuestWiFi? }
  private struct VenueResponse: Decodable { let venues: [VenueGuestConfig] }
  struct WalletResponse: Decodable {
    enum Status: String, Decodable { case unconfigured, requires_card, ready }
    let status: Status
    let passUrl: String?
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

  func card(create: Bool = false) async throws -> VenueLoyaltyCard? {
    let cardRequest = request(loyaltyPath)
    guard let url = cardRequest.url else { throw URLError(.badURL) }
    let membership = VenueMembership(venue: venue, requestURL: url)
    for credential in membership.candidates() {
      var validation = cardRequest
      validation.httpShouldHandleCookies = false
      validation.setValue("\(membership.cookieName)=\(credential.token)", forHTTPHeaderField: "Cookie")
      let data = try await transport(validation, session: Self.membershipValidation)
      let decoded = try JSONDecoder().decode(CardResponse.self, from: data)
      try Task.checkCancellation()
      if let card = decoded.card {
        membership.accept(credential)
        return card
      }
      membership.discard(credential)
    }
    let result: CardResponse = try await json(loyaltyPath, create ? "POST" : "GET")
    if result.card != nil, let credential = membership.nativeCredential() {
      membership.accept(credential)
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

    var isValid: Bool {
      token.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil &&
        (expires.map { $0 > Date() } ?? true)
    }
  }

  private static let clipService = "com.papupay.app.membership.clip"
  private static let appService = "com.papupay.app.membership.full"
  private static let lastVenueAccount = "last-venue"

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

  func accept(_ credential: Credential) {
    guard credential.isValid, let host = venue.origin.host else { return }
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
    if let data = try? encoder.encode(credential) {
      Self.write(data, service: Self.currentService, account: account)
    }
#if PAPUPAY_APP_CLIP
    let cardURL = venue.origin.appending(path: "v/\(venue.slug)/card")
    Self.write(Data(cardURL.absoluteString.utf8), service: Self.clipService, account: Self.lastVenueAccount)
#endif
  }

  func discard(_ credential: Credential) {
    if let cookie = nativeCookie, cookie.value == credential.token {
      HTTPCookieStorage.shared.deleteCookie(cookie)
    }
    for service in services where self.credential(for: service)?.token == credential.token {
      SecItemDelete(Self.key(service: service, account: account) as CFDictionary)
    }
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
