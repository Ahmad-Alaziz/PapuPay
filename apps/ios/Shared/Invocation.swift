import Foundation

enum PapuInvocation: Equatable {
  case table(venueID: String, number: String)
  case orders
  case invalid

  static func parse(_ url: URL) -> PapuInvocation {
    if url.scheme == "papupay", url.host == "orders" { return .orders }
    guard url.scheme == "https", ["papupay.com", "papupay.vercel.app", "papupay.example"].contains(url.host ?? ""),
      url.user == nil, url.password == nil, url.port == nil,
      let parts = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return .invalid }
    let path = parts.percentEncodedPath.hasSuffix("/") && parts.percentEncodedPath != "/"
      ? String(parts.percentEncodedPath.dropLast()) : parts.percentEncodedPath
    let query = parts.queryItems ?? []
    var hall: String?
    var raw: String?
    if path.hasPrefix("/go") {
      let segments = path.components(separatedBy: "/")
      guard segments.count == 4, segments[1] == "go",
        !query.contains(where: { $0.name == "venue" || $0.name == "table" }) else { return .invalid }
      hall = segments[2]; raw = segments[3]
    } else if ["/", "", "/clip", "/app"].contains(path) {
      guard query.filter({ $0.name == "venue" }).count <= 1,
        query.filter({ $0.name == "table" }).count == 1 else { return .invalid }
      hall = query.first(where: { $0.name == "venue" })?.value ?? "koszyki"
      raw = query.first(where: { $0.name == "table" })?.value
    } else { return .invalid }
    guard hall == "koszyki", let raw, (1...3).contains(raw.utf8.count),
      raw.utf8.allSatisfy({ $0 >= 48 && $0 <= 57 }),
      let number = Int(raw), (1...999).contains(number) else { return .invalid }
    return .table(venueID: "koszyki", number: String(number))
  }
}
