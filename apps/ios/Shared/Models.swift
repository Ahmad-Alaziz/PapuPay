import ActivityKit
import Combine
import Foundation
import SwiftUI

struct Venue: Codable {
  let id, name, address, source: String
  let demo: Bool
}
struct Restaurant: Codable, Identifiable, Hashable {
  let id, name, officialName, cuisine, cuisineEn, category: String
  let unit, minutes: Int
  let color, image, tag, tagEn, description, descriptionEn, source: String
}
struct Dish: Codable, Identifiable, Hashable {
  let id, restaurantId, name, nameEn, description, descriptionEn: String
  let price: Int
  let image, category, tag: String
  let allergens: [String]
  let vegetarian: Bool
}
struct Catalog: Codable {
  let venue: Venue
  let restaurants: [Restaurant]
  let items: [Dish]
  static let shared: Catalog = {
    guard let url = Bundle.main.url(forResource: "catalog", withExtension: "json"),
      let data = try? Data(contentsOf: url),
      let catalog = try? JSONDecoder().decode(Catalog.self, from: data)
    else {
      fatalError("The bundled PapuPay demo catalog is missing or invalid.")
    }
    return catalog
  }()
}
struct CartLine: Codable, Identifiable, Hashable {
  var id: String
  let itemId: String
  var quantity: Int
  let extra: Bool
  let note: String
  var item: Dish { Catalog.shared.items.first { $0.id == itemId }! }
  var total: Int { (item.price + (extra ? 500 : 0)) * quantity }
}
struct DemoOrder: Codable, Identifiable {
  var venueId: String? = "koszyki"
  let id, restaurantId, table, name: String
  let lines: [CartLine]
  let total: Int
  let createdAt: Date
  var readyAt: Date
  var collected: Bool
  var restaurant: Restaurant { Catalog.shared.restaurants.first { $0.id == restaurantId }! }
  func stage(at now: Date = .now) -> Int {
    collected ? 3 : now >= readyAt ? 2 : now.timeIntervalSince(createdAt) >= 3 ? 1 : 0
  }
}
struct CartAddition: Identifiable {
  let id = UUID()
  let item: Dish
  let quantity: Int
}

struct SavedState: Codable {
  var cart: [CartLine]
  var orders: [DemoOrder]
  var english: Bool
}

@MainActor final class PapuStore: ObservableObject {
  @Published var cart: [CartLine] = [] { didSet { save() } }
  @Published var orders: [DemoOrder] = [] { didSet { save() } }
  @Published var lastAddition: CartAddition?
  @Published var english = false { didSet { save() } }
  @Published var table = "24"
  @Published var invocationError = false
  @Published var selectedTab = 0
  @Published var mapRestaurant = "atom"
  @Published var completedCheckoutID = UUID()
  @Published var catalogRequestID = UUID()
  @Published var showBasket = false
  @Published var toast: String?
  var now = Date.now
  @Published var notificationMessage: String?
  @Published var wantsReadyAlerts = true
  private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
  @Published var liveActivityMessage: String?
  let catalog = Catalog.shared
  private var timer: AnyCancellable?
  private var lastActivityStage = ""
  private var pendingActivityIDs: [String] = []
  private var toastTask: Task<Void, Never>?
  private var additionTask: Task<Void, Never>?
  var text: (String, String) -> String { { [english] pl, en in english ? en : pl } }
  var count: Int { cart.reduce(0) { $0 + $1.quantity } }
  var total: Int { cart.reduce(0) { $0 + $1.total } }
  var activeOrders: [DemoOrder] { orders.filter { !$0.collected } }
  var groupedCart: [(Restaurant, [CartLine])] {
    catalog.restaurants.compactMap { r in
      let lines = cart.filter { $0.item.restaurantId == r.id }
      return lines.isEmpty ? nil : (r, lines)
    }
  }
  init() {
    if let data = UserDefaults.standard.data(forKey: "papupay.demo.v1"),
      let value = try? JSONDecoder().decode(SavedState.self, from: data)
    {
      let validItems = Set(catalog.items.map(\.id))
      let validRestaurants = Set(catalog.restaurants.map(\.id))
      cart = value.cart.filter { validItems.contains($0.itemId) && (1...20).contains($0.quantity) }
      orders = value.orders.filter {
        ($0.venueId ?? "koszyki") == "koszyki" && validRestaurants.contains($0.restaurantId)
          && $0.lines.allSatisfy {
            validItems.contains($0.itemId) && (1...20).contains($0.quantity)
          }
      }
      english = value.english
    }
    if let url = ProcessInfo.processInfo.environment["_XCAppClipURL"].flatMap(URL.init(string:)) {
      handle(url)
    }
    ReadyNotifications.shared.configure()
    ReadyNotifications.shared.onOpen = { [weak self] url in
      self?.handle(url)
      self?.refreshOrderStages()
    }
    refreshOrderStages()
    timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect().sink { [weak self] date in
      guard let self else { return }
      self.refreshOrderStages(at: date)
    }
  }
  /// The shared store only changes at stage boundaries, never for a one-second clock tick.
  func refreshOrderStages(at date: Date = .now) {
    now = date
    let signature = orders.map { "\($0.id):\($0.stage(at: date))" }.joined(separator: "|")
    if signature != lastActivityStage {
      lastActivityStage = signature
      objectWillChange.send()
      updateActivities()
    }

  }
  private func keepDemoUpdatesAlive() {
    guard backgroundTask == .invalid else { return }
    backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "Finish short demo order") {
      [weak self] in
      Task { @MainActor in self?.finishBackgroundWork() }
    }
  }
  private func finishBackgroundWork() {
    guard backgroundTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(backgroundTask)
    backgroundTask = .invalid
  }
  private func save() {
    if let data = try? JSONEncoder().encode(
      SavedState(cart: cart, orders: orders, english: english))
    {
      UserDefaults.standard.set(data, forKey: "papupay.demo.v1")
    }
  }
  func handle(_ url: URL) {
    switch PapuInvocation.parse(url) {
    case .table(_, let number):
      table = number
      invocationError = false
      selectedTab = url.fragment == "orders" ? 2 : 0
      if selectedTab == 2 { finishCheckoutPresentation() }
    case .orders:
      finishCheckoutPresentation()
    case .invalid:
      showBasket = false
      invocationError = true
    }
  }
  func add(_ item: Dish, quantity: Int = 1, extra: Bool = false, note: String = "") {
    let clean = String(note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(180))
    let id = "\(item.id)|\(extra)|\(clean)"
    let previousCount = count
    if let i = cart.firstIndex(where: { $0.id == id }) {
      cart[i].quantity = min(20, cart[i].quantity + max(1, quantity))
    } else {
      cart.append(
        CartLine(
          id: id, itemId: item.id, quantity: min(20, max(1, quantity)), extra: extra, note: clean))
    }
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
    additionTask?.cancel()
    let added = max(0, count - previousCount)
    withAnimation(UIAccessibility.isReduceMotionEnabled ? nil : .spring(response: 0.35, dampingFraction: 0.86)) {
      lastAddition = CartAddition(item: item, quantity: added)
    }
    UIAccessibility.post(
      notification: .announcement,
      argument: (added > 0
        ? text("Dodano do koszyka: ", "Added to basket: ")
        : text("Limit 20 sztuk w koszyku: ", "20-item basket limit: ")) + text(item.name, item.nameEn))
    additionTask = Task {
      try? await Task.sleep(for: .seconds(6))
      guard !Task.isCancelled else { return }
      withAnimation(.easeOut(duration: 0.2)) { lastAddition = nil }
    }
  }
  func change(_ line: CartLine, by delta: Int) {
    guard let index = cart.firstIndex(where: { $0.id == line.id }) else { return }
    let quantity = min(20, cart[index].quantity + delta)
    if quantity <= 0 { cart.remove(at: index) } else { cart[index].quantity = quantity }
  }
  func announce(_ message: String) {
    toastTask?.cancel()
    withAnimation(.spring) { toast = message }
    toastTask = Task {
      try? await Task.sleep(for: .seconds(2.5))
      guard !Task.isCancelled else { return }
      withAnimation { toast = nil }
    }
  }
  func placeOrder(name: String) async {
    guard !cart.isEmpty, !invocationError else { return }
    let allowed = wantsReadyAlerts ? await ReadyNotifications.shared.authorize() : false
    guard !cart.isEmpty, !invocationError else { return }
    let time = Date.now
    let ticket = String(UUID().uuidString.prefix(4)).uppercased()
    let next = groupedCart.enumerated().map { index, group in
      DemoOrder(
        id: "P\(ticket)\(index + 1)", restaurantId: group.0.id, table: table,
        name: name.trimmingCharacters(in: .whitespaces).isEmpty ? text("Gość", "Guest") : name,
        lines: group.1, total: group.1.reduce(0) { $0 + $1.total }, createdAt: time,
        readyAt: time.addingTimeInterval(Double(12 + min(index, 8) * 2)), collected: false)
    }
    orders.insert(contentsOf: next, at: 0)
    cart = []
    lastAddition = nil
    selectedTab = 2
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    keepDemoUpdatesAlive()
    startActivity(for: next)
    if allowed {
      let scheduled = await ReadyNotifications.shared.schedule(next, english: english)
      notificationMessage =
        scheduled
        ? text(
          "Damy znać, nawet po zablokowaniu telefonu.",
          "We’ll notify you, even with your phone locked.")
        : text(
          "Nie udało się zaplanować powiadomienia. Śledź status tutaj.",
          "Couldn’t schedule the alert. Follow your order here.")
    } else {
      notificationMessage = text(
        "Powiadomienia wyłączone. Status sprawdzisz tutaj.",
        "Notifications are off. Follow your order here.")
    }
    refreshOrderStages()
  }
  func browseCatalog() {
    showBasket = false
    selectedTab = 0
    lastAddition = nil
    catalogRequestID = UUID()
  }
  func finishCheckoutPresentation() {
    showBasket = false
    selectedTab = 2
    lastAddition = nil
    completedCheckoutID = UUID()
  }
  func markReady(_ order: DemoOrder) {
    if let i = orders.firstIndex(where: { $0.id == order.id }) {
      guard orders[i].stage() < 2 else { return }
      orders[i].readyAt = .now
      let updated = orders[i]
      ReadyNotifications.shared.cancel([updated.id])
      if wantsReadyAlerts {
        Task {
          guard orders.contains(where: { $0.id == updated.id && !$0.collected }) else { return }
          _ = await ReadyNotifications.shared.schedule([updated], english: english)
          if !orders.contains(where: { $0.id == updated.id && !$0.collected }) {
            ReadyNotifications.shared.cancel([updated.id])
          }
        }
      }
      refreshOrderStages()
    }
    UINotificationFeedbackGenerator().notificationOccurred(.success)
  }
  func collect(_ order: DemoOrder) {
    if let i = orders.firstIndex(where: { $0.id == order.id }) {
      orders[i].collected = true
      ReadyNotifications.shared.cancel([order.id])
      refreshOrderStages()
    }
  }
  func reorder(_ order: DemoOrder) {
    order.lines.forEach { add($0.item, quantity: $0.quantity, extra: $0.extra, note: $0.note) }
    showBasket = true
  }
  func navigate(to restaurant: Restaurant) {
    mapRestaurant = restaurant.id
    selectedTab = 1
  }
  private func state(for activity: Activity<PapuOrderAttributes>)
    -> PapuOrderAttributes.ContentState
  {
    let matching = orders.filter { activity.attributes.orderIDs.contains($0.id) }
    let ready = matching.filter { $0.stage() >= 2 }.count
    let stage =
      matching.allSatisfy(\.collected)
      ? 3
      : ready == matching.count
        ? 2 : matching.contains { $0.stage() == 1 || $0.stage() == 2 } ? 1 : 0
    return .init(
      stage: stage, readyAt: matching.map(\.readyAt).max() ?? .now, readyCount: ready,
      totalKitchens: matching.count)
  }
  func resumePendingActivity() {
    guard !pendingActivityIDs.isEmpty else { return }
    let pending = orders.filter { pendingActivityIDs.contains($0.id) && !$0.collected }
    pendingActivityIDs = []
    if !pending.isEmpty {
      startActivity(for: pending)
      updateActivities()
    }
  }
  private func startActivity(for orders: [DemoOrder]) {
    guard UIApplication.shared.applicationState == .active else {
      pendingActivityIDs = orders.map(\.id)
      return
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      liveActivityMessage = text(
        "Live Activities są wyłączone w ustawieniach urządzenia.",
        "Live Activities are disabled in device settings.")
      return
    }
    do {
      let attributes = PapuOrderAttributes(
        orderIDs: orders.map(\.id), table: table,
        restaurants: orders.map { $0.restaurant.name }.joined(separator: " + "), english: english,
        pickupSummary: text("Odbiór · lokale ", "Pickup · units ")
          + orders.map { String($0.restaurant.unit) }.joined(separator: ", "))
      let content = ActivityContent(
        state: PapuOrderAttributes.ContentState(
          stage: 0, readyAt: orders.map(\.readyAt).max() ?? .now, readyCount: 0,
          totalKitchens: orders.count), staleDate: orders.map(\.readyAt).max())
      _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
      liveActivityMessage = text(
        "Papu jest też na ekranie blokady.", "Your food is on your Lock Screen, too.")
    } catch {
      liveActivityMessage = text(
        "Nie udało się uruchomić Live Activity. Status jest dostępny tutaj.",
        "Live Activity couldn’t start. You can still track your order here.")
    }
  }
  func updateActivities() {
    Task {
      for activity in Activity<PapuOrderAttributes>.activities {
        let next = state(for: activity)
        let content = ActivityContent(state: next, staleDate: next.stage >= 2 ? nil : next.readyAt)
        if next.stage == 3 {
          await activity.end(content, dismissalPolicy: .after(.now.addingTimeInterval(10)))
        } else {
          await activity.update(content)
        }
      }
      // Do not surrender the short background task before ActivityKit has received its final state.
      if activeOrders.allSatisfy({ $0.stage() >= 2 }) { finishBackgroundWork() }
    }
  }
  func resetOrders() {
    ReadyNotifications.shared.cancel(orders.map(\.id))
    orders = []
    pendingActivityIDs = []
    finishBackgroundWork()
    for a in Activity<PapuOrderAttributes>.activities {
      Task { await a.end(nil, dismissalPolicy: .immediate) }
    }
  }
}

func money(_ cents: Int, english: Bool = false) -> String {
  let f = CurrencyFormatters.values["\(english)-\(cents % 100 == 0)"]!
  return f.string(from: NSNumber(value: Double(cents) / 100)) ?? "\(cents / 100) zł"
}

private enum CurrencyFormatters {
  static let values: [String: NumberFormatter] = {
    var values: [String: NumberFormatter] = [:]
    for english in [false, true] {
      for whole in [false, true] {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "PLN"
        f.locale = Locale(identifier: english ? "en_GB" : "pl_PL")
        f.maximumFractionDigits = whole ? 0 : 2
        values["\(english)-\(whole)"] = f
      }
    }
    return values
  }()
}
