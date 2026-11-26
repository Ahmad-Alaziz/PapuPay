import Foundation

/// A local, explicitly enabled presentation ledger. It never stores live membership credentials.
struct VenueDemoLoyalty: Codable, Equatable {
  static let goal = 6
  private(set) var created = false
  private(set) var stamps = 0
  private(set) var rewards = 0
  private var processedScans: [UUID] = []

  var rewardAvailable: Bool { created && stamps == Self.goal }

  mutating func create() {
    created = true
  }

  mutating func restoreSavedPass(stamps saved: Int) {
    guard !created, (0...Self.goal).contains(saved) else { return }
    created = true
    stamps = saved
  }

  @discardableResult mutating func scan(_ id: UUID) -> Bool {
    guard created, stamps < Self.goal, !processedScans.contains(id) else { return false }
    stamps += 1
    processedScans.append(id)
    // Keep retry protection across reward rounds without growing an unbounded local journal.
    if processedScans.count > 64 { processedScans.removeFirst(processedScans.count - 64) }
    return true
  }

  @discardableResult mutating func redeem() -> Bool {
    guard rewardAvailable else { return false }
    stamps = 0
    rewards += 1
    return true
  }

  private var isValid: Bool {
    (0...Self.goal).contains(stamps) && rewards >= 0 && processedScans.count <= 64 && (created || stamps == 0)
  }

  static func load(namespace: String, defaults: UserDefaults = .standard) -> Self {
    guard let data = defaults.data(forKey: storageKey(namespace)),
      let state = try? JSONDecoder().decode(Self.self, from: data), state.isValid else { return Self() }
    return state
  }

  func save(namespace: String, defaults: UserDefaults = .standard) {
    guard let data = try? JSONEncoder().encode(self) else { return }
    defaults.set(data, forKey: Self.storageKey(namespace))
  }

  private static func storageKey(_ namespace: String) -> String {
    "papupay.offline-demo.loyalty.v1." + Data(namespace.utf8).base64EncodedString()
  }
}
