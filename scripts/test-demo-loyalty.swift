import Foundation

@main
struct DemoLoyaltyTests {
  static func main() {
    var ledger = VenueDemoLoyalty()
    let firstScan = UUID()
    precondition(!ledger.scan(firstScan) && !ledger.redeem(), "An uncreated card cannot collect or redeem")
    ledger.create()
    precondition(ledger.scan(firstScan))
    precondition(!ledger.scan(firstScan) && ledger.stamps == 1, "Retried scans cannot add another stamp")
    for _ in 1..<6 { precondition(ledger.scan(UUID())) }
    precondition(ledger.rewardAvailable && ledger.stamps == 6)
    precondition(!ledger.scan(UUID()), "A completed card waits for redemption")
    precondition(ledger.redeem() && ledger.stamps == 0 && ledger.rewards == 1)
    precondition(!ledger.redeem(), "A reward can only be redeemed once")
    precondition(!ledger.scan(firstScan), "Retry protection survives redemption")
    precondition(ledger.scan(UUID()) && ledger.stamps == 1, "The same card starts a new round")

    let suite = "com.papupay.demo-tests." + UUID().uuidString
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    ledger.save(namespace: "sweeto-test", defaults: defaults)
    precondition(VenueDemoLoyalty.load(namespace: "sweeto-test", defaults: defaults) == ledger)
    precondition(!VenueDemoLoyalty.load(namespace: "other-venue", defaults: defaults).created)
    print("Demo loyalty checks passed: creation, retry protection, goal, redemption, next round, persistence and venue isolation.")
  }
}
