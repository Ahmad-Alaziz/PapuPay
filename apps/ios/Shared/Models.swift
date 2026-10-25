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
    collected ? 3 : now >= readyAt ? 2 : now.timeIntervalSince(createdAt) > 8 ? 1 : 0
  }
}
struct SavedState: Codable {
  var cart: [CartLine]
  var orders: [DemoOrder]
  var favorites: Set<String>
  var english: Bool
}

@MainActor final class PapuStore: ObservableObject {
  @Published var cart: [CartLine] = [] { didSet { save() } }
  @Published var orders: [DemoOrder] = [] { didSet { save() } }
  @Published var favorites: Set<String> = [] { didSet { save() } }
  @Published var english = false { didSet { save() } }
  @Published var table = "24"
  @Published var invocationError = false
  @Published var selectedTab = 0
  @Published var mapRestaurant = "atom"
  @Published var showBasket = false
  @Published var toast: String?
  @Published var now = Date.now
  @Published var liveActivityMessage: String?
  let catalog = Catalog.shared
  private var timer: AnyCancellable?
  private var lastActivityStage = -1
  private var toastTask: Task<Void, Never>?
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
      favorites = value.favorites.intersection(validRestaurants)
      english = value.english
    }
    if let url = ProcessInfo.processInfo.environment["_XCAppClipURL"].flatMap(URL.init(string:)) {
      handle(url)
    }
    timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect().sink { [weak self] date in
      guard let self else { return }
      self.now = date
      let signature = self.activeOrders.reduce(0) { $0 + $1.stage(at: date) }
      if signature != self.lastActivityStage {
        self.lastActivityStage = signature
        self.updateActivities()
      }
    }
  }
  private func save() {
    if let data = try? JSONEncoder().encode(
      SavedState(cart: cart, orders: orders, favorites: favorites, english: english))
    {
      UserDefaults.standard.set(data, forKey: "papupay.demo.v1")
    }
  }
  func handle(_ url: URL) {
    switch PapuInvocation.parse(url) {
    case .table(_, let number):
      table = number
      invocationError = false
      selectedTab = 0
    case .orders:
      selectedTab = 2
    case .invalid:
      showBasket = false
      invocationError = true
    }
  }
  func add(_ item: Dish, quantity: Int = 1, extra: Bool = false, note: String = "") {
    let clean = String(note.trimmingCharacters(in: .whitespacesAndNewlines).prefix(180))
    let id = "\(item.id)|\(extra)|\(clean)"
    if let i = cart.firstIndex(where: { $0.id == id }) {
      cart[i].quantity = min(20, cart[i].quantity + max(1, quantity))
    } else {
      cart.append(
        CartLine(
          id: id, itemId: item.id, quantity: min(20, max(1, quantity)), extra: extra, note: clean))
    }
    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
    announce(text("Mniam! Dodano do koszyka.", "Yum! Added to your basket."))
  }
  func change(_ line: CartLine, by delta: Int) {
    guard let index = cart.firstIndex(where: { $0.id == line.id }) else { return }
    let quantity = min(20, cart[index].quantity + delta)
    if quantity <= 0 { cart.remove(at: index) } else { cart[index].quantity = quantity }
  }
  func favorite(_ id: String) {
    if favorites.contains(id) { favorites.remove(id) } else { favorites.insert(id) }
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
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
  func placeOrder(name: String) {
    guard !cart.isEmpty, !invocationError else { return }
    let time = Date.now
    let ticket = String(UUID().uuidString.prefix(4)).uppercased()
    let next = groupedCart.enumerated().map { index, group in
      DemoOrder(
        id: "P\(ticket)\(index + 1)", restaurantId: group.0.id, table: table,
        name: name.trimmingCharacters(in: .whitespaces).isEmpty ? text("Gość", "Guest") : name,
        lines: group.1, total: group.1.reduce(0) { $0 + $1.total }, createdAt: time,
        readyAt: time.addingTimeInterval(Double(45 + index * 12)), collected: false)
    }
    orders.insert(contentsOf: next, at: 0)
    cart = []
    selectedTab = 2
    UINotificationFeedbackGenerator().notificationOccurred(.success)
    startActivity(for: next)
  }
  func markReady(_ order: DemoOrder) {
    if let i = orders.firstIndex(where: { $0.id == order.id }) {
      orders[i].readyAt = .now
      now = .now
      updateActivities()
    }
    UINotificationFeedbackGenerator().notificationOccurred(.success)
  }
  func collect(_ order: DemoOrder) {
    if let i = orders.firstIndex(where: { $0.id == order.id }) {
      orders[i].collected = true
      updateActivities()
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
  private func startActivity(for orders: [DemoOrder]) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      liveActivityMessage = text(
        "Live Activities są wyłączone w ustawieniach urządzenia.",
        "Live Activities are disabled in device settings.")
      return
    }
    do {
      let attributes = PapuOrderAttributes(
        orderIDs: orders.map(\.id), table: table,
        restaurants: orders.map { $0.restaurant.name }.joined(separator: " + "), english: english)
      let content = ActivityContent(
        state: PapuOrderAttributes.ContentState(
          stage: 0, readyAt: orders.map(\.readyAt).max() ?? .now, readyCount: 0,
          totalKitchens: orders.count), staleDate: Date.now.addingTimeInterval(90))
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
    for activity in Activity<PapuOrderAttributes>.activities {
      let next = state(for: activity)
      Task {
        let content = ActivityContent(
          state: next, staleDate: next.stage >= 2 ? nil : Date.now.addingTimeInterval(90))
        if next.stage == 3 {
          await activity.end(content, dismissalPolicy: .after(.now.addingTimeInterval(10)))
        } else {
          await activity.update(content)
        }
      }
    }
  }
  func resetOrders() {
    orders = []
    for a in Activity<PapuOrderAttributes>.activities {
      Task { await a.end(nil, dismissalPolicy: .immediate) }
    }
  }
}

func money(_ cents: Int, english: Bool = false) -> String {
  let f = NumberFormatter()
  f.numberStyle = .currency
  f.currencyCode = "PLN"
  f.locale = Locale(identifier: english ? "en_GB" : "pl_PL")
  f.maximumFractionDigits = cents % 100 == 0 ? 0 : 2
  return f.string(from: NSNumber(value: Double(cents) / 100)) ?? "\(cents / 100) zł"
}
