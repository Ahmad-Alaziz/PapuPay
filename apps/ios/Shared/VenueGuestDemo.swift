import Foundation

/// Only the internal TestFlight pipeline supplies an enabled demo resource.
/// Physical devices use the venue API unless that resource is enabled.
struct VenueGuestDemo: Decodable {
  let enabled: Bool
  let venueId: String
  let cardCode: String
  let checkout: String
  let wifi: VenueGuestWiFi?
  private let walletPasses: [Data]?

  private static let bundled: Self? = {
    guard let url = Bundle.main.url(forResource: "GuestDemo", withExtension: "plist"),
      let data = try? Data(contentsOf: url),
      let demo = try? PropertyListDecoder().decode(Self.self, from: data),
      demo.enabled, demo.venueId == "sweeto", demo.cardCode == "DEMO2026",
      demo.checkout == "PAPUPAY-DEMO:SWEETO:DEMO2026"
    else { return nil }
    return demo
  }()

  static func configuration(for venue: VenueGuestLink) -> Self? {
    guard let demo = bundled, venue.slug == demo.venueId else { return nil }
    return demo
  }

  static func loyaltyConfiguration(for venue: VenueGuestLink) -> Self? {
    guard !UserDefaults.standard.bool(forKey: livePreference(for: venue)) else { return nil }
    if let provisioned = configuration(for: venue) { return provisioned }
    #if DEBUG && targetEnvironment(simulator)
    if venue == .starter && !ProcessInfo.processInfo.arguments.contains("-useLiveLoyalty") {
      return Self(enabled: true, venueId: venue.slug, cardCode: "SIMDEMO", checkout: "PAPUPAY-SIMULATOR:SWEETO:SIMDEMO", wifi: nil, walletPasses: nil)
    }
    #endif
    return nil
  }

  private static func livePreference(for venue: VenueGuestLink) -> String {
    "papupay.recovered-live-membership." + venue.origin.absoluteString + "|" + venue.slug
  }

  static func preferRecoveredMembership(for venue: VenueGuestLink) {
    UserDefaults.standard.set(true, forKey: livePreference(for: venue))
  }

  func loyaltyNamespace(for venue: VenueGuestLink) -> String {
    venue.origin.absoluteString + "|" + venue.slug + "|" + cardCode
  }

  func loyaltyCard(for venue: VenueGuestLink) -> VenueLoyaltyCard? {
    let ledger = VenueDemoLoyalty.load(namespace: loyaltyNamespace(for: venue))
    return ledger.created ? VenueLoyaltyCard(code: cardCode, checkout: checkout, stamps: ledger.stamps, goal: VenueDemoLoyalty.goal, rewardAvailable: ledger.rewardAvailable) : nil
  }

  func walletPassData(stamps: Int) -> Data? {
    guard let walletPasses, walletPasses.count == 7,
      (0..<walletPasses.count).contains(stamps) else { return nil }
    let data = walletPasses[stamps]
    return data.starts(with: [0x50, 0x4b, 0x03, 0x04]) ? data : nil
  }
}
