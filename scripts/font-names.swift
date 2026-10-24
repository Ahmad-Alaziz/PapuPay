import Foundation
import CoreText
for path in CommandLine.arguments.dropFirst() {
 let url = URL(fileURLWithPath:path)
 if let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor] {
  for descriptor in descriptors { print(CTFontDescriptorCopyAttribute(descriptor, kCTFontNameAttribute) ?? "unknown" as CFString) }
 }
}
