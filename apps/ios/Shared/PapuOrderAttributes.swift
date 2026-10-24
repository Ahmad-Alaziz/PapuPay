import ActivityKit
import Foundation

struct PapuOrderAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var stage: Int
    var readyAt: Date
    var readyCount: Int
    var totalKitchens: Int
  }
  let orderIDs: [String]
  let table: String
  let restaurants: String
  let english: Bool
}
