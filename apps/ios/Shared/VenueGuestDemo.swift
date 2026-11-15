import Foundation

/// Only the internal TestFlight pipeline supplies an enabled demo resource.
/// Normal builds carry a disabled placeholder and continue using the venue API.
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

  func walletPassData(stamps: Int) -> Data? {
    guard let walletPasses, walletPasses.count == 7,
      (0..<walletPasses.count).contains(stamps) else { return nil }
    let data = walletPasses[stamps]
    return data.starts(with: [0x50, 0x4b, 0x03, 0x04]) ? data : nil
  }
}
