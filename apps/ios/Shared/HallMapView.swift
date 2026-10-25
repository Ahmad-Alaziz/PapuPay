import SwiftUI

private struct MapGeometry: Decodable { let units: [MapUnit] }
private struct MapUnit: Decodable, Identifiable {
  let id: String
  let number: String
  let tag: String
  let d, points, x, y, width, height: String?
  enum CodingKeys: String, CodingKey {
    case id, tag, d, points, x, y, width, height
    case number = "data-id"
  }
  var path: String {
    if let d { return d }
    if let points {
      let values = points.split(separator: " ")
      return stride(from: 0, to: values.count - 1, by: 2).map {
        "\($0==0 ? "M" : "L")\(values[$0]) \(values[$0+1])"
      }.joined(separator: " ") + " Z"
    }
    return "M\(x ?? "0") \(y ?? "0") h\(width ?? "0") v\(height ?? "0") h-\(width ?? "0") Z"
  }
}
struct HallMapView: View {
  @EnvironmentObject var store: PapuStore
  @State private var selectedRestaurant: Restaurant?
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var pan = CGSize.zero
  @GestureState private var drag = CGSize.zero
  @State private var zoom: CGFloat = 1.5
  @State private var showRoute = true
  private static let units: [MapUnit] = {
    guard let url = Bundle.main.url(forResource: "map", withExtension: "json"),
      let data = try? Data(contentsOf: url),
      let map = try? JSONDecoder().decode(MapGeometry.self, from: data)
    else { return [] }
    return map.units
  }()
  private let positions: [Int: CGPoint] = [
    1: .init(x: 127, y: 550), 2: .init(x: 80, y: 500), 3: .init(x: 85, y: 426),
    4: .init(x: 85, y: 387), 5: .init(x: 80, y: 344), 6: .init(x: 157, y: 310),
    7: .init(x: 205, y: 358), 8: .init(x: 205, y: 376), 9: .init(x: 215, y: 310),
    10: .init(x: 246, y: 310), 11: .init(x: 250, y: 250), 13: .init(x: 346, y: 210),
    14: .init(x: 402, y: 252), 15: .init(x: 389, y: 319), 16: .init(x: 450, y: 309),
    17: .init(x: 550, y: 335), 18: .init(x: 509, y: 445), 19: .init(x: 525, y: 478),
    20: .init(x: 543, y: 535), 21: .init(x: 511, y: 550), 22: .init(x: 445, y: 550),
    23: .init(x: 444, y: 486), 24: .init(x: 451, y: 426), 25: .init(x: 420, y: 426),
    26: .init(x: 392, y: 420), 27: .init(x: 366, y: 445), 28: .init(x: 318, y: 367),
    29: .init(x: 270, y: 433), 30: .init(x: 219, y: 426), 31: .init(x: 188, y: 426),
    32: .init(x: 194, y: 505), 33: .init(x: 416, y: 367),
  ]
  private let routes: [Int: String] = [
    20: "M318 317 L342 317 L342 338 L470 338 Q480 338 480 348 L480 500 Q480 510 490 510 L494 510",
    8: "M318 317 L318 338 L225 338 L225 376 L215 376",
    7: "M318 317 L318 338 L226 338 L226 358 L215 358", 9: "M318 317 L318 340 L215 340 L215 328",
    11: "M318 317 L285 317 L285 280 L263 280", 16: "M318 317 L342 317 L342 338 L450 338 L450 327",
    15: "M318 317 L342 317 L342 338 L389 338 L389 328",
    33: "M318 317 L342 317 L342 338 L390 338 L390 368 L406 368",
    30: "M318 317 L250 317 L250 340 L237 340 L237 395 L219 395 L219 408", 28: "M318 317 L318 350",
  ]
  private var selected: Restaurant {
    store.catalog.restaurants.first { $0.id == store.mapRestaurant } ?? store.catalog.restaurants[0]
  }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 23) {
        Eyebrow(text: "HALA KOSZYKI · WARSZAWA")
        (Text(store.text("Podążaj za ", "Follow the "))
          + Text(store.text("apetytem", "good food")).foregroundColor(Papu.green)).font(
            Papu.display(36)
          ).fixedSize(horizontal: false, vertical: true)
        VStack(spacing: 0) {
          HStack {
            Button {
              withAnimation(reduceMotion ? nil : .smooth(duration: 0.3)) {
                zoom = zoom > 1 ? 1 : 1.5
                pan = .zero
              }
            } label: {
              Label(
                zoom > 1
                  ? store.text("Strefa gastro · Parter", "Food court · Ground")
                  : store.text("Cały plan · Parter", "Full plan · Ground"),
                systemImage: "circle.fill"
              )
            }.font(Papu.body(12)).foregroundStyle(Papu.green).padding(.horizontal, 12).padding(
              .vertical, 9
            ).background(Papu.cream, in: Capsule())
            Spacer()
            Button {
              withAnimation(.smooth(duration: 0.3)) {
                zoom = selected.unit == 20 ? 1 : 1.5
                pan = .zero
              }
            } label: {
              Image(systemName: "location.viewfinder").frame(width: 44, height: 44).background(
                Papu.cream, in: Circle())
            }.accessibilityLabel(store.text("Wyśrodkuj mapę", "Center map"))
          }.padding(16)
          GeometryReader { geometry in
            let sx = geometry.size.width / 609
            let sy = geometry.size.height / 620
            ZStack(alignment: .topLeading) {
              SVGShape(
                "M18 578 V310 L148 300 V163 L182 170 L230 109 L291 145 L389 44 L452 109 L365 199 L595 285 V580 H417 V467 H222 V580 Z",
                canvas: .init(width: 609, height: 620)
              ).fill(Color(hex: "BDCAAF")).offset(y: 6)
              ForEach(Self.units) { unit in
                let n = Int(unit.number) ?? 0
                let r = store.catalog.restaurants.first { $0.unit == n }
                let active = r?.id == selected.id
                SVGShape(unit.path, canvas: .init(width: 609, height: 620)).fill(
                  active ? Papu.orange : r != nil ? Color(hex: "B4C7A5") : Color(hex: "DEE5D4")
                ).overlay(
                  SVGShape(unit.path, canvas: .init(width: 609, height: 620)).stroke(
                    Papu.cream, lineWidth: 1.5)
                ).offset(y: active ? -3 : 0).onTapGesture {
                  if let r {
                    withAnimation(.smooth) { store.mapRestaurant = r.id }
                    UISelectionFeedbackGenerator().selectionChanged()
                  }
                }
                if let p = positions[n] {
                  Text(n == 11 ? "11–12" : String(format: "%02d", n)).font(
                    .system(size: n == 7 || n == 8 ? 6 : 8, weight: .semibold)
                  ).foregroundStyle(active ? Papu.ink : Papu.muted).position(
                    x: p.x * sx, y: p.y * sy
                  ).allowsHitTesting(false)
                }
              }
              if showRoute, let route = routes[selected.unit] {
                MapRoute(path: route).id(selected.id).allowsHitTesting(false)
              }
              Circle().fill(Papu.green.opacity(0.15)).frame(width: 22, height: 22).position(
                x: 318 * sx, y: 317 * sy)
              Circle().fill(Papu.green).frame(width: 8, height: 8).overlay(
                Circle().stroke(.white, lineWidth: 2)
              ).position(x: 318 * sx, y: 317 * sy)
              Text("KOSZYKOWA").font(.system(size: 8, weight: .medium)).tracking(2).foregroundStyle(
                Papu.muted
              ).position(x: 315 * sx, y: 598 * sy)
            }.scaleEffect(zoom)
              .offset(
                x: zoom > 1 ? pan.width + drag.width : 0, y: zoom > 1 ? pan.height + drag.height : 0
              )
              .gesture(
                DragGesture(minimumDistance: 10).updating($drag) { value, state, _ in
                  if zoom > 1 { state = value.translation }
                }.onEnded { value in
                  guard zoom > 1 else { return }
                  let limit = (zoom - 1) * 170
                  pan = CGSize(
                    width: max(-limit, min(limit, pan.width + value.translation.width)),
                    height: max(-limit, min(limit, pan.height + value.translation.height)))
                }, including: zoom > 1 ? .all : .subviews
              )
              .frame(width: geometry.size.width, height: geometry.size.height)
          }.frame(height: 340).clipped().accessibilityElement(children: .ignore).accessibilityLabel(
            store.text(
              "Plan Hali Koszyki. Wybierz restaurację na liście poniżej.",
              "Hala Koszyki plan. Choose a restaurant from the list below."))
          HStack {
            Label(store.text("Stolik ", "Table ") + store.table, systemImage: "circle.inset.filled").font(
              Papu.body(11)
            ).foregroundStyle(Papu.muted)
            Spacer()
            HStack(spacing: 0) {
              Button {
                withAnimation { zoom = max(1, zoom - 0.2) }
              } label: {
                Image(systemName: "minus").frame(width: 44, height: 44)
              }.accessibilityLabel("Zoom out")
              Divider().frame(height: 18)
              Button {
                withAnimation { zoom = min(1.8, zoom + 0.2) }
              } label: {
                Image(systemName: "plus").frame(width: 44, height: 44)
              }.accessibilityLabel("Zoom in")
            }.font(.system(size: 12)).background(Papu.cream, in: RoundedRectangle(cornerRadius: 12))
          }.padding(16)
        }.background(Papu.sage.opacity(0.7), in: RoundedRectangle(cornerRadius: 23)).overlay(
          RoundedRectangle(cornerRadius: 23).stroke(Papu.line))
        VStack(alignment: .leading, spacing: 11) {
          HStack(spacing: 14) {
            FoodPhoto(name: selected.image).frame(width: 76, height: 80).clipped().clipShape(
              RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 7) {
              Eyebrow(text: store.text("TWÓJ KIERUNEK", "YOUR DESTINATION"))
              HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(selected.name).font(Papu.display(25)).fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Text(String(format: "%02d", selected.unit)).font(Papu.poster(27))
                  .padding(.horizontal, 11).padding(.vertical, 7)
                  .background(Papu.orange, in: RoundedRectangle(cornerRadius: 11))
              }
              Text(
                store.text(
                  "Lokal \(selected.unit) · Parter", "Unit \(selected.unit) · Ground floor")
              ).font(Papu.body(14)).foregroundStyle(Papu.muted)
            }.frame(maxWidth: .infinity, alignment: .leading)
          }
          PrimaryButton(title: store.text("Zobacz menu", "See menu")) {
            selectedRestaurant = selected
          }
          Button {
            showRoute.toggle()
          } label: {
            Label(
              showRoute
                ? store.text("Ukryj trasę", "Hide route") : store.text("Pokaż trasę", "Show route"),
              systemImage: "location"
            ).font(Papu.body(13)).frame(maxWidth: .infinity)
          }
        }.padding(18).papuCard().id(selected.id).transition(.opacity)
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 9) {
          ForEach(store.catalog.restaurants) { r in
            Button {
              withAnimation(.snappy) { store.mapRestaurant = r.id }
              UISelectionFeedbackGenerator().selectionChanged()
            } label: {
              HStack(spacing: 8) {
                Text(String(format: "%02d", r.unit)).font(.system(size: 11, weight: .semibold))
                  .frame(width: 29, height: 31).background(
                    selected.id == r.id ? Papu.orange : Papu.sage,
                    in: RoundedRectangle(cornerRadius: 9))
                VStack(alignment: .leading, spacing: 3) {
                  Text(r.name).font(Papu.body(13).bold()).lineLimit(1).minimumScaleFactor(0.8)
                  Text(store.text(r.cuisine, r.cuisineEn)).font(Papu.body(11)).foregroundStyle(
                    Papu.muted
                  ).lineLimit(1)
                }
                Spacer(minLength: 0)
              }.padding(10).background(
                selected.id == r.id ? Papu.sage : Color(hex: "FFFDF5"),
                in: RoundedRectangle(cornerRadius: 13)
              ).overlay(RoundedRectangle(cornerRadius: 13).stroke(Papu.line))
            }.buttonStyle(PressStyle()).accessibilityAddTraits(
              selected.id == r.id ? .isSelected : [])
          }
        }
        Text(
          store.text(
            "Plan lokali na podstawie koszyki.com. Położenie stolika i trasa są przykładowe.",
            "Venue plan based on koszyki.com. Table position and walking route are illustrative.")
        ).font(Papu.body(12)).foregroundStyle(Papu.muted).lineSpacing(3)
      }.padding(20).padding(.top, 10).padding(.bottom, 25)
    }
    .onAppear {
      if selected.unit == 20 { zoom = 1; pan = .zero }
    }
    .onChange(of: store.mapRestaurant) { _, _ in
      if selected.unit == 20 {
        withAnimation(reduceMotion ? nil : .smooth(duration: 0.3)) {
          zoom = 1
          pan = .zero
        }
      }
    }
    .onChange(of: store.completedCheckoutID) { _, _ in selectedRestaurant = nil }
    .sheet(item: $selectedRestaurant) {
      RestaurantView(restaurant: $0).environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
  }
}

private struct MapRoute: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var progress: CGFloat = 0
  let path: String
  var body: some View {
    SVGShape(path, canvas: .init(width: 609, height: 620)).trim(from: 0, to: progress)
      .stroke(Papu.ink, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
      .onAppear { withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.65)) { progress = 1 } }
  }
}
