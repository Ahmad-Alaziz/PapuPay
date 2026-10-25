import Foundation
@main struct InvocationTests {
  static func main() {
    let valid = ["https://papupay.com/go/koszyki/24": "24", "https://papupay.com/go/koszyki/037/": "37", "https://papupay.com/clip?venue=koszyki&table=9": "9", "https://papupay.com/?table=24": "24"]
    for (link, table) in valid { precondition(PapuInvocation.parse(URL(string:link)!) == .table(venueID:"koszyki", number:table), link) }
    let invalid = ["https://evil.example/go/koszyki/24", "https://papupay.com/go/other/24", "https://papupay.com/go/koszyki/0", "https://papupay.com/go/koszyki/1000", "https://papupay.com/go/koszyki/2x", "https://papupay.com/go/koszyki/24?table=37", "https://papupay.com/go/koszyki/24?venue=other", "https://papupay.com/clip?venue=other&table=24", "https://papupay.com/clip?venue=koszyki", "https://papupay.com/?table=2&table=3", "https://papupay.com/go/koszyki/24/extra", "https://papupay.com/go//koszyki/24", "https://papupay.com/go/koszyki/%32%34", "https://papupay.com:8443/go/koszyki/24"]
    for link in invalid { precondition(PapuInvocation.parse(URL(string:link)!) == .invalid, link) }
    precondition(PapuInvocation.parse(URL(string:"papupay://orders")!) == .orders)
    print("19 native invocation checks passed")
  }
}
