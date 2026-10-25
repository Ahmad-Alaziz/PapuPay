import SwiftUI

/// Small SVG path reader for our own vector mark and the official hall polygons.
/// Supports only the M/L/H/V/C/Q/Z commands used by these checked-in assets.
struct SVGShape: Shape {
  let data: String
  var canvas = CGSize(width: 100, height: 120)
  init(_ data: String, canvas: CGSize = CGSize(width: 100, height: 120)) {
    self.data = data
    self.canvas = canvas
  }
  private static let cache = NSCache<NSString, CachedPath>()
  private final class CachedPath { let path: Path; init(_ path: Path) { self.path = path } }
  func path(in rect: CGRect) -> Path {
    let cached: Path
    if let value = Self.cache.object(forKey: data as NSString) { cached = value.path }
    else { cached = parse(); Self.cache.setObject(CachedPath(cached), forKey: data as NSString) }
    return cached.applying(CGAffineTransform(scaleX: rect.width / canvas.width, y: rect.height / canvas.height))
      .applying(CGAffineTransform(translationX: rect.minX, y: rect.minY))
  }
  private func parse() -> Path {
    let regex = try! NSRegularExpression(
      pattern: "[MmLlHhVvCcQqZz]|[-+]?(?:[0-9]*\\.)?[0-9]+(?:[eE][-+]?[0-9]+)?")
    let ns = data as NSString
    let tokens = regex.matches(in: data, range: NSRange(location: 0, length: ns.length)).map {
      ns.substring(with: $0.range)
    }
    var path = Path()
    var i = 0
    var command = "M"
    var point = CGPoint.zero
    var start = CGPoint.zero
    func number() -> CGFloat {
      guard i < tokens.count, let value = Double(tokens[i]) else {
        i = tokens.count
        return 0
      }
      i += 1
      return value
    }
    func pair(relative: Bool) -> CGPoint {
      let p = CGPoint(x: number(), y: number())
      return relative ? CGPoint(x: point.x + p.x, y: point.y + p.y) : p
    }
    while i < tokens.count {
      if tokens[i].first?.isLetter == true {
        command = tokens[i]
        i += 1
      }
      let relative = command == command.lowercased()
      switch command.uppercased() {
      case "M":
        point = pair(relative: relative)
        path.move(to: point)
        start = point
        command = relative ? "l" : "L"
      case "L":
        point = pair(relative: relative)
        path.addLine(to: point)
      case "H":
        let n = number()
        point.x = relative ? point.x + n : n
        path.addLine(to: point)
      case "V":
        let n = number()
        point.y = relative ? point.y + n : n
        path.addLine(to: point)
      case "C":
        let c1 = pair(relative: relative)
        let c2 = pair(relative: relative)
        let end = pair(relative: relative)
        path.addCurve(to: end, control1: c1, control2: c2)
        point = end
      case "Q":
        let control = pair(relative: relative)
        let end = pair(relative: relative)
        path.addQuadCurve(to: end, control: control)
        point = end
      case "Z":
        path.closeSubpath()
        point = start
        command = "M"
      default: i = tokens.count
      }
    }
    return path
  }
}
