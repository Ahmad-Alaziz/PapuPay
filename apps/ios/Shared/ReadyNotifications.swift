import Foundation
import UserNotifications

/// Scheduled by iOS, so a deterministic demo order can notify while PapuPay is suspended.
/// Production replaces these local demo deadlines with server-authoritative push events.
@MainActor final class ReadyNotifications: NSObject, UNUserNotificationCenterDelegate {
  static let shared = ReadyNotifications()
  var onOpen: ((URL) -> Void)?
  private let center = UNUserNotificationCenter.current()
  func configure() { center.delegate = self }
  func authorize() async -> Bool {
    let settings = await center.notificationSettings()
    switch settings.authorizationStatus {
    case .authorized, .provisional, .ephemeral: return true
    case .notDetermined:
      return (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
    default: return false
    }
  }
  func schedule(_ orders: [DemoOrder], english: Bool) async -> Bool {
    var succeeded = true
    for order in orders {
      let content = UNMutableNotificationContent()
      content.title = english ? "Your papu is ready!" : "Pora na papu!"
      content.subtitle = order.restaurant.name
      content.body =
        english
        ? "Table \(order.table) · Collect #\(order.id) at unit \(order.restaurant.unit). Demo order."
        : "Stolik \(order.table) · Odbierz #\(order.id) przy lokalu \(order.restaurant.unit). Zamówienie demo."
      content.sound = .default
      content.threadIdentifier = "papupay.koszyki.\(order.table)"
      let invocationURL = "https://papupay.com/go/koszyki/\(order.table)#orders"
      content.targetContentIdentifier = invocationURL
      content.userInfo = ["url": invocationURL]
      let trigger = UNTimeIntervalNotificationTrigger(
        timeInterval: max(1, order.readyAt.timeIntervalSinceNow), repeats: false)
      do {
        try await center.add(
          UNNotificationRequest(
            identifier: "papupay.ready.\(order.id)", content: content, trigger: trigger))
      } catch { succeeded = false }
    }
    return succeeded
  }
  func cancel(_ ids: [String]) {
    let identifiers = ids.map { "papupay.ready.\($0)" }
    center.removePendingNotificationRequests(withIdentifiers: identifiers)
    center.removeDeliveredNotifications(withIdentifiers: identifiers)
  }
  // Keep UIKit's completion on the main actor. The async Objective-C bridge can
  // otherwise complete on a worker thread and crash during notification-driven restoration.
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler:
      @escaping @Sendable (UNNotificationPresentationOptions) -> Void
  ) {
    Task { @MainActor in completionHandler([.banner, .sound]) }
  }
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping @Sendable () -> Void
  ) {
    let url = (response.notification.request.content.userInfo["url"] as? String).flatMap(
      URL.init(string:))
    Task { @MainActor in
      if let url { self.onOpen?(url) }
      completionHandler()
    }
  }
}
