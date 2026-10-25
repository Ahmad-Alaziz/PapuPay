import SwiftUI

struct RootView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.scenePhase) private var scenePhase
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var showTour = false
  @State private var showTable = false
  @State private var showAbout = false
  var body: some View {
    TabView(selection: $store.selectedTab) {
      shell { DiscoverView(showTour: $showTour, showAbout: $showAbout) }.tabItem {
        Label(store.text("Odkrywaj", "Discover"), systemImage: "safari")
      }.tag(0)
      shell { HallMapView() }.tabItem {
        Label(store.text("Mapa hali", "Hall map"), systemImage: "map")
      }.tag(1)
      shell { OrdersView() }.tabItem {
        Label(store.text("Zamówienia", "Orders"), systemImage: "takeoutbag.and.cup.and.straw")
      }.badge(store.activeOrders.count).tag(2)
    }
    .tint(Papu.green).preferredColorScheme(.light)
    .sheet(isPresented: $store.showBasket) {
      BasketView().environmentObject(store).presentationDetents([.large]).presentationCornerRadius(
        30)
    }
    .sheet(isPresented: $showTour) {
      OnboardingView().environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
    .sheet(isPresented: $showTable) {
      TableView().environmentObject(store).presentationDetents([.height(460), .large])
        .presentationCornerRadius(30)
    }
    .sheet(isPresented: $showAbout) {
      AboutView().environmentObject(store).presentationDetents([.large]).presentationCornerRadius(
        30)
    }
    .overlay(alignment: .top) {
      if let toast = store.toast {
        HStack(spacing: 9) {
          Image(systemName: "checkmark.circle.fill").foregroundStyle(Papu.green)
          Text(toast).font(Papu.body(14).weight(.semibold))
        }.padding(14).papuGlass().padding(.top, 70).transition(
          .move(edge: .top).combined(with: .opacity)
        ).allowsHitTesting(false).accessibilityAddTraits(.updatesFrequently)
      }
    }
    .fullScreenCover(isPresented: $store.invocationError) {
      VStack(spacing: 22) {
        Image(systemName: "qrcode").font(.system(size: 46)).foregroundStyle(Papu.green)
        Text(store.text("Sprawdź kod na stoliku", "Check your table’s QR")).font(Papu.display(32))
          .multilineTextAlignment(.center)
        Text(
          store.text(
            "Ten link nie wskazuje obsługiwanej hali i stolika. Zeskanuj kod ponownie albo poproś obsługę o pomoc.",
            "This link doesn’t identify a supported food hall and table. Scan again or ask a member of staff."
          )
        )
        .font(Papu.body(16)).multilineTextAlignment(.center)
        Button(store.text("Otwórz demo: Koszyki, stolik 24", "Open demo: Koszyki, table 24")) {
          store.handle(URL(string: "https://papupay.com/go/koszyki/24")!)
        }.buttonStyle(.borderedProminent).tint(Papu.green)
      }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Papu.cream).foregroundStyle(Papu.ink).interactiveDismissDisabled()
    }
    .environment(\.locale, Locale(identifier: store.english ? "en_GB" : "pl_PL"))
    .environment(\.layoutDirection, .leftToRight)
    .onOpenURL { store.handle($0) }
    .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) {
      if let url = $0.webpageURL { store.handle(url) }
    }
    .onChange(of: scenePhase) { _, phase in
      if phase == .active {
        store.resumePendingActivity()
        store.refreshOrderStages()
      }
    }
  }
  private var brandButton: some View {
    Button { store.selectedTab = 0 } label: {
      BrandView(size: 26).fixedSize().padding(.leading, 4).padding(.vertical, 5)
    }.buttonStyle(.plain).accessibilityLabel("PapuPay")
  }
  private func shell<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    NavigationStack {
      content().background(Papu.cream).foregroundStyle(Papu.ink)
        .safeAreaInset(edge: .bottom, spacing: 0) {
          if store.count > 0 {
            BasketDock { store.showBasket = true }
          }
        }
        .toolbar {
          if #available(iOS 26.0, *) {
            ToolbarItem(placement: .topBarLeading) {
              brandButton
            }.sharedBackgroundVisibility(.hidden)
          } else {
            ToolbarItem(placement: .topBarLeading) { brandButton }
          }
          ToolbarItemGroup(placement: .topBarTrailing) {
            Button {
              store.english.toggle()
            } label: {
              Text(store.english ? "EN" : "PL").font(.system(size: 11, weight: .semibold))
            }.accessibilityLabel(store.text("Switch to English", "Zmień na polski"))
            Button {
              showTable = true
            } label: {
              HStack(spacing: 5) {
                Image(systemName: "qrcode")
                Text(store.table).fontWeight(.bold)
              }.font(.system(size: 13))
            }.accessibilityLabel(store.text("Stolik \(store.table)", "Table \(store.table)"))
          }
        }
        .animation(reduceMotion ? nil : .spring(response: 0.4, dampingFraction: 0.85), value: store.count)
    }
  }
}

struct DiscoverView: View {
  @Environment(\.dynamicTypeSize) private var typeSize
  @EnvironmentObject var store: PapuStore
  @Binding var showTour: Bool
  @Binding var showAbout: Bool
  @State private var search = ""
  @State private var category = "all"
  @State private var selectedRestaurant: Restaurant?
  @State private var selectedDish: Dish?
  @State private var veggieOnly = false
  let categories: [(String, String, String, String)] = [
    ("all", "fork.knife", "Wszystko", "Everything"),
    ("burgers", "takeoutbag.and.cup.and.straw", "Burgery", "Burgers"),
    ("asian", "bowl", "Azja", "Asian"),
    ("pizza", "circle.lefthalf.filled", "Pizza i pasta", "Pizza & pasta"),
    ("street", "bolt", "Street food", "Street food"), ("veggie", "leaf", "Vege", "Veggie"),
    ("drinks", "waterbottle", "Napoje", "Drinks"),
    ("desserts", "birthday.cake", "Desery", "Desserts"),
  ]
  var filtered: [Restaurant] {
    store.catalog.restaurants.filter { r in
      (category == "all" || r.category == category)
        && (!veggieOnly
          || store.catalog.items.contains { $0.restaurantId == r.id && $0.vegetarian })
        && (search.isEmpty
          || "\(r.name) \(r.cuisine) \(r.cuisineEn) \(store.catalog.items.filter { $0.restaurantId == r.id }.map(\.name).joined(separator: " "))"
            .localizedCaseInsensitiveContains(search))
    }
  }
  var body: some View {
    GeometryReader { viewport in
      ScrollView {
          VStack(spacing: 0) {
            CravingSpotlight(showTour: $showTour)
            VStack(alignment: .leading, spacing: 20) {
              Text(store.text("Co dziś jesz?", "What’s your craving?"))
                .font(Papu.display(32)).fixedSize(horizontal: false, vertical: true).id(
                  "restaurants")
              HStack(spacing: 10) {
                Image(systemName: "magnifyingglass").foregroundStyle(Papu.muted)
                TextField(
                  store.text(
                    "Restauracja, danie, zachcianka…", "Restaurant, dish, little craving…"),
                  text: $search
                ).font(Papu.body(15)).autocorrectionDisabled()
                if !search.isEmpty {
                  Button {
                    search = ""
                  } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(Papu.muted)
                  }.accessibilityLabel(store.text("Wyczyść", "Clear"))
                }
              }.padding(14).background(Color(hex: "F0F2E7"), in: RoundedRectangle(cornerRadius: 14))
              ScrollView(.horizontal) {
                HStack(spacing: 8) {
                  ForEach(categories, id: \.0) { c in
                    Button {
                      withAnimation(.snappy) { category = c.0 }
                    } label: {
                      Label(store.text(c.2, c.3), systemImage: c.1).font(
                        Papu.body(14).weight(.medium)
                      ).padding(.horizontal, 16).frame(minHeight: 48).foregroundStyle(
                        category == c.0 ? Papu.butter : Papu.ink
                      ).background(
                        category == c.0 ? Papu.ink : Color(hex: "FFFDF5"),
                        in: RoundedRectangle(cornerRadius: 14)
                      ).overlay(
                        RoundedRectangle(cornerRadius: 14).stroke(
                          category == c.0 ? Papu.ink : Papu.line, lineWidth: 1))
                    }.buttonStyle(PressStyle()).accessibilityAddTraits(
                      category == c.0 ? .isSelected : [])
                  }
                }
              }.scrollIndicators(.hidden).contentMargins(.trailing, 2)
              HStack {
                Text(
                  "\(filtered.count) "
                    + store.text("miejsc na coś pysznego", "places for something delicious")
                ).font(Papu.body(12))
                Spacer()
                Button {
                  withAnimation { veggieOnly.toggle() }
                } label: {
                  Image(systemName: "leaf").frame(width: 44, height: 44).foregroundStyle(
                    veggieOnly ? Papu.green : Papu.muted)
                }.accessibilityLabel(store.text("Opcje wege", "Vegetarian options"))

              }.foregroundStyle(Papu.muted)
              if filtered.isEmpty {
                VStack(spacing: 13) {
                  Image(systemName: "magnifyingglass").font(.largeTitle)
                  Text(
                    store.text("Tego smaku jeszcze nie znamy", "We haven’t found that flavour")
                  )
                  .font(Papu.display(28))
                  Button(store.text("Wyczyść filtry", "Clear filters")) {
                    search = ""
                    category = "all"
                    veggieOnly = false
                  }.font(Papu.body(16).bold())
                }.frame(maxWidth: .infinity).padding(.vertical, 40)
              }
              LazyVGrid(
                columns: Array(
                  repeating: GridItem(.flexible(), spacing: 16),
                  count: typeSize.isAccessibilitySize ? 1 : 2),
                spacing: 28
              ) {
                ForEach(filtered) { restaurant in
                  RestaurantCard(restaurant: restaurant) { selectedRestaurant = restaurant }
                }
              }
            }.padding(20).padding(.top, 12)
            gatherBanner.padding(.horizontal, 20).padding(.vertical, 16)
            VStack(alignment: .leading, spacing: 18) {
              Eyebrow(text: store.text("MIŁOŚĆ OD PIERWSZEGO KĘSA", "LOVE AT FIRST BITE"))
              Text(store.text("Małe zachcianki", "Little cravings")).font(Papu.display(34))
              ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 14) {
                  ForEach([
                    store.catalog.items[0], store.catalog.items[2], store.catalog.items[4],
                    store.catalog.items[8],
                  ]) { dish in SmallDishCard(dish: dish) { selectedDish = dish } }
                }
              }.scrollIndicators(.hidden)
            }.padding(20)
            ZStack(alignment: .leading) {
              Image("hall").resizable().scaledToFill().frame(height: 260).clipped()
              LinearGradient(
                colors: [Papu.ink.opacity(0.92), Papu.ink.opacity(0.3)], startPoint: .leading,
                endPoint: .trailing)
              VStack(alignment: .leading, spacing: 15) {
                Text("KOSZYKOWA 63 · WARSZAWA").font(.system(size: 11, weight: .bold)).tracking(1.5)
                Text(
                  store.text("Jedna hala\nCały świat smaków", "One hall\nA world of flavours")
                )
                .font(Papu.display(34))
                Button {
                  store.selectedTab = 1
                } label: {
                  Label(
                    store.text("Rozejrzyj się", "Take a look around"), systemImage: "arrow.up.right"
                  ).font(Papu.body(14).weight(.semibold)).padding(.horizontal, 18).padding(
                    .vertical, 12
                  ).background(Papu.butter, in: Capsule()).foregroundStyle(Papu.ink)
                }
              }.padding(25).foregroundStyle(Papu.butter)
            }.frame(height: 260).clipShape(RoundedRectangle(cornerRadius: 22)).padding(20)
            HStack {
              BrandView(size: 24)
              Spacer()
              Button(store.text("O wersji demo", "About this demo")) { showAbout = true }.font(
                Papu.body(13)
              ).foregroundStyle(Papu.muted)
            }.padding(20).padding(.bottom, 15)
          }.frame(width: viewport.size.width)
        }.scrollDismissesKeyboard(.interactively)
    }
    .onChange(of: store.completedCheckoutID) { _, _ in
      selectedRestaurant = nil
      selectedDish = nil
    }
    .sheet(item: $selectedRestaurant) {
      RestaurantView(restaurant: $0).environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
    .sheet(item: $selectedDish) {
      DishView(dish: $0).environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
  }
  private var gatherBanner: some View {
    ZStack(alignment: .bottomTrailing) {
      Papu.orange.opacity(0.23)
      PapayaMark().frame(width: 90, height: 110).rotationEffect(.degrees(20)).offset(x: 13, y: 18)
        .opacity(0.8)
      VStack(alignment: .leading, spacing: 12) {
        Eyebrow(
          text: store.text("RÓŻNE APETYTY · WSPÓLNY STOLIK", "DIFFERENT CRAVINGS · SAME TABLE"))
        Text(
          store.text(
            "Ty ramen, ja burgera\nRazem? Idealnie", "You get ramen\nI get a burger · Perfect")
        ).font(Papu.display(30))
        Text(
          store.text(
            "Mieszaj kuchnie, jak lubisz.\nJedno zamówienie, więcej przyjemności.",
            "Mix your favourite kitchens.\nOne checkout, more happiness.")
        ).font(Papu.body(14)).foregroundStyle(Papu.muted)
        Button {
          showTour = true
        } label: {
          Image(systemName: "arrow.up.right").padding(11).background(Papu.butter, in: Circle())
        }.tint(Papu.ink)
      }.frame(maxWidth: .infinity, alignment: .leading).padding(24)
    }.clipShape(RoundedRectangle(cornerRadius: 22))
  }
}

struct RestaurantCard: View {
  @EnvironmentObject var store: PapuStore
  let restaurant: Restaurant
  var action: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      ZStack(alignment: .topTrailing) {
        Button(action: action) {
          GeometryReader { g in
            FoodPhoto(name: restaurant.image).frame(width: g.size.width, height: g.size.height)
              .clipped()
          }.frame(height: 151).overlay(alignment: .bottomLeading) {
            Text(store.text(restaurant.tag, restaurant.tagEn)).font(Papu.body(11).weight(.medium))
              .lineLimit(1).padding(.horizontal, 9).padding(.vertical, 6).background(
                Papu.butter.opacity(0.94), in: Capsule()
              ).padding(9)
          }.clipShape(RoundedRectangle(cornerRadius: 18))
        }.buttonStyle(PressStyle())

      }
      Button(action: action) {
        VStack(alignment: .leading, spacing: 5) {
          Text(restaurant.name).font(Papu.display(21)).tracking(-0.5).fixedSize(
            horizontal: false, vertical: true)
          Text(store.text(restaurant.cuisine, restaurant.cuisineEn)).font(Papu.body(12))
            .foregroundStyle(Papu.muted)
          HStack(spacing: 3) {
            Image(systemName: "clock")
            Text(store.text("Demo · 12 s", "Demo · 12 sec"))
            Spacer(minLength: 0)
            Text(store.text("Lokal ", "Unit ") + String(format: "%02d", restaurant.unit))
          }.font(.system(size: 11)).foregroundStyle(Papu.muted).padding(.top, 2)
        }.frame(maxWidth: .infinity, alignment: .leading)
      }.buttonStyle(.plain)
    }.accessibilityElement(children: .contain)
  }
}
struct SmallDishCard: View {
  @EnvironmentObject var store: PapuStore
  let dish: Dish
  var action: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 9) {
      Button(action: action) {
        FoodPhoto(name: dish.image).frame(width: 170, height: 145).clipped().clipShape(
          RoundedRectangle(cornerRadius: 13))
      }
      Eyebrow(text: store.catalog.restaurants.first { $0.id == dish.restaurantId }!.name)
      Button(action: action) {
        Text(store.text(dish.name, dish.nameEn)).font(Papu.display(22))
          .lineLimit(2, reservesSpace: true).multilineTextAlignment(.leading)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
      HStack {
        Text(money(dish.price, english: store.english)).font(Papu.body(14).bold())
        Spacer()
        QuickAddButton(dish: dish)
      }
    }.frame(width: 170).padding(12).papuCard()
  }
}


/// A curved window into the hall: each kitchen has one large, photograph-led moment.
private struct CravingSpotlight: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
  @Environment(\.scenePhase) private var phase
  @ScaledMetric(relativeTo: .body) private var introFontSize: CGFloat = 14
  @Binding var showTour: Bool
  @State private var position = 0
  @State private var direction = 1
  @State private var dragOffset: CGFloat = 0
  @State private var lastSwipe = Date.distantPast
  @State private var visible = true
  @State private var autoplayStopped = false
  @State private var autoStep = 0
  @State private var autoplayOrigin = 0
  @State private var showCombo = false
  @State private var selectedRestaurant: Restaurant?
  @State private var openBasketAfterReview = false
  private var foods: [PapuCarouselFood] { PapuCarouselFood.all }
  private func index(_ value: Int) -> Int { (value % foods.count + foods.count) % foods.count }
  private var stage: Int { index(position) }
  private var selectedFood: PapuCarouselFood { foods[stage] }
  private var restaurant: Restaurant? { store.catalog.restaurants.first { $0.id == selectedFood.vendorID } }
  private var dish: Dish? { store.catalog.items.first { $0.restaurantId == selectedFood.vendorID } }
  private var animationActive: Bool {
    visible && phase == .active && store.selectedTab == 0 && !showCombo && selectedRestaurant == nil && !showTour
  }
  private var autoplayActive: Bool { animationActive && !reduceMotion && !voiceOver && !autoplayStopped }
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 8) {
        Eyebrow(text: "HALA KOSZYKI")
        Spacer(minLength: 8)
        Label(store.text("Stolik ", "Table ") + store.table, systemImage: "checkmark.circle.fill")
          .font(Papu.body(12).weight(.semibold)).foregroundStyle(Papu.green)
      }
      VStack(alignment: .leading, spacing: 8) {
        VStack(alignment: .leading, spacing: 0) {
          Text(store.text("CAŁA HALA", "ONE FOOD HALL"))
          Text(store.text("JEDEN KOSZYK", "ONE BASKET")).foregroundStyle(Papu.accentText)
        }.font(Papu.poster(store.english ? 36 : 40))
          .lineLimit(typeSize.isAccessibilitySize ? nil : 1).minimumScaleFactor(0.75)
          .fixedSize(horizontal: false, vertical: true)
        Text(store.text(
          "Różne kuchnie, wspólny apetyt. Wybieraj z całej hali i zamawiaj w jednym koszyku.",
          "Different kitchens, one shared appetite. Find your favourites and order them together."))
          .font(.system(size: introFontSize)).foregroundStyle(Papu.muted)
          .fixedSize(horizontal: false, vertical: true)
      }
      GeometryReader { geometry in
        let width = geometry.size.width
        ZStack(alignment: .top) {
          RadialGradient(colors: [Color(hex: "416A43"), Papu.ink], center: UnitPoint(x: 0.5, y: 0.58), startRadius: 4, endRadius: width * 0.7)
          ForEach(Array((position - 4)...(position + 4)), id: \.self) { slot in
            vendorWindow(slot: slot, width: width)
          }
          PapuCarouselScene(stage: stage, direction: direction, active: animationActive)
            .frame(width: width, height: width * 640 / 720)
            .offset(x: reduceMotion ? 0 : dragOffset * 0.13)
            .zIndex(20)
          HStack(spacing: 8) {
            Text(store.text("10 KUCHNI · JEDEN KOSZYK", "10 KITCHENS · ONE BASKET"))
              .font(.system(size: 11, weight: .semibold)).tracking(1)
            Spacer(minLength: 4)
            if !reduceMotion && !voiceOver {
              Button {
                if autoplayStopped { autoplayOrigin = position; autoStep = 0 }
                autoplayStopped.toggle()
              } label: {
                Image(systemName: autoplayStopped ? "play.fill" : "pause.fill")
                  .font(.system(size: 11, weight: .semibold)).frame(width: 44, height: 44)
              }.buttonStyle(.plain)
                .accessibilityLabel(store.text(autoplayStopped ? "Włącz animację" : "Wstrzymaj animację", autoplayStopped ? "Play carousel" : "Pause carousel"))
            }
          }.foregroundStyle(Papu.butter.opacity(0.85)).padding(.leading, 17).padding(.trailing, 3).padding(.top, 2).zIndex(30)
          Text(store.text("Przesuń i poznaj kuchnie", "Swipe to explore the kitchens"))
            .font(Papu.body(11).weight(.medium)).foregroundStyle(Papu.butter.opacity(0.8))
            .position(x: width / 2, y: width * 610 / 720).zIndex(30).allowsHitTesting(false)
        }.frame(width: width, height: geometry.size.height)
          .contentShape(Rectangle())
          .simultaneousGesture(DragGesture(minimumDistance: 16).onChanged { value in
            guard abs(value.translation.width) > abs(value.translation.height) else { return }
            autoplayStopped = true
            lastSwipe = Date()
            dragOffset = value.translation.width
          }.onEnded { value in
            guard abs(value.translation.width) > abs(value.translation.height), abs(value.translation.width) > 24 else {
              withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) { dragOffset = 0 }
              return
            }
            lastSwipe = Date()
            let projected = value.predictedEndTranslation.width
            let distance = max(1, min(3, Int((abs(projected) / (width * 0.38)).rounded())))
            select(position + (value.translation.width < 0 ? distance : -distance), manual: true)
          })
      }.aspectRatio(720.0 / 640.0, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .modifier(ComboVisibilityObserver(visible: $visible))
      HStack(spacing: 12) {
        carouselArrow(-1)
        VStack(spacing: 3) {
          Text(restaurant?.name ?? "").font(Papu.display(21)).lineLimit(2).multilineTextAlignment(.center)
          if let dish {
            Text(store.text(dish.name, dish.nameEn)).font(Papu.body(12)).foregroundStyle(Papu.muted)
              .lineLimit(2).multilineTextAlignment(.center)
          }
        }.frame(maxWidth: .infinity, minHeight: 48).id(stage)
          .transition(.opacity.combined(with: .offset(y: reduceMotion ? 0 : 5)))
          .accessibilityElement(children: .combine)
        carouselArrow(1)
      }.animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: stage)
        .padding(.top, 2)
      Button {
        autoplayStopped = true
        selectedRestaurant = restaurant
      } label: {
        HStack(spacing: 9) {
          Text(store.text("Zobacz menu", "View menu"))
          Image(systemName: "arrow.up.right")
        }.font(Papu.body(15).weight(.semibold)).frame(maxWidth: .infinity, minHeight: 50)
          .foregroundStyle(Papu.butter).background(Papu.ink, in: Capsule())
      }.buttonStyle(PressStyle())
        .accessibilityLabel(store.text("Zobacz menu: ", "View menu: ") + (restaurant?.name ?? ""))
      HStack(spacing: 8) {
        Button {
          autoplayStopped = true
          showCombo = true
        } label: {
          HStack(spacing: 7) {
            Image(systemName: "basket")
            Text(store.text("Połącz trzy kuchnie", "Mix three kitchens"))
            Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .semibold))
          }.font(Papu.body(13).weight(.semibold)).frame(minHeight: 44)
        }.buttonStyle(.plain)
        Spacer(minLength: 0)
        Button { autoplayStopped = true; showTour = true } label: {
          Image(systemName: "questionmark.circle").frame(width: 44, height: 44)
        }.buttonStyle(.plain).accessibilityLabel(store.text("Jak to działa?", "How it works"))
      }.foregroundStyle(Papu.green).padding(.top, -7)
    }.padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 8)
      .onDisappear { visible = false }
      .task(id: autoplayActive) {
        guard autoplayActive else { return }
        let targets = [autoplayOrigin - 1, autoplayOrigin + 2, autoplayOrigin]
        let durations = [1.4, 1.8, 1.6]
        while !Task.isCancelled, autoplayActive {
          do { try await Task.sleep(for: .milliseconds(autoStep == 0 ? 4000 : 2400)) } catch { return }
          guard !Task.isCancelled, autoplayActive else { return }
          let duration = durations[autoStep]
          select(targets[autoStep], manual: false, duration: duration)
          autoStep = (autoStep + 1) % targets.count
          do { try await Task.sleep(for: .milliseconds(Int(duration * 1000))) } catch { return }
        }
      }
      .onChange(of: store.completedCheckoutID) { _, _ in selectedRestaurant = nil }
      .sheet(item: $selectedRestaurant) {
        RestaurantView(restaurant: $0).environmentObject(store).presentationDetents([.large])
          .presentationCornerRadius(30)
      }
      .sheet(isPresented: $showCombo, onDismiss: {
        if openBasketAfterReview {
          openBasketAfterReview = false
          store.showBasket = true
        }
      }) {
        ComboReviewView {
          openBasketAfterReview = true
          showCombo = false
        }.environmentObject(store).presentationDetents([.large]).presentationCornerRadius(30)
      }
  }
  private func select(_ value: Int, manual: Bool, duration: Double = 0.7) {
    if manual { autoplayStopped = true }
    guard value != position else {
      withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) { dragOffset = 0 }
      return
    }
    direction = value > position ? 1 : -1
    withAnimation(reduceMotion ? nil : .timingCurve(0.22, 0.75, 0.18, 1, duration: duration)) {
      position = value
      dragOffset = 0
    }
    if manual { UISelectionFeedbackGenerator().selectionChanged() }
  }
  private func carouselArrow(_ delta: Int) -> some View {
    Button { select(position + delta, manual: true) } label: {
      Image(systemName: delta < 0 ? "chevron.left" : "chevron.right")
        .font(.system(size: 14, weight: .semibold)).frame(width: 44, height: 44)
        .background(Papu.butter, in: Circle())
    }.buttonStyle(PressStyle())
      .accessibilityLabel(store.text(delta < 0 ? "Poprzednia kuchnia" : "Następna kuchnia", delta < 0 ? "Previous kitchen" : "Next kitchen"))
  }
  private func vendorWindow(slot: Int, width: CGFloat) -> some View {
    let food = foods[index(slot)]
    let vendor = store.catalog.restaurants.first { $0.id == food.vendorID }
    let relative = Double(slot - position) + Double(dragOffset / (width * 0.36))
    return Button {
      guard Date().timeIntervalSince(lastSwipe) > 0.25 else { return }
      select(slot, manual: true)
    } label: {
      VStack(spacing: 0) {
        Image(food.imageName).resizable().scaledToFit().padding(.horizontal, 6).frame(height: width * 0.22)
          .accessibilityHidden(true)
        Text(vendor?.name ?? "").font(Papu.display(14)).lineLimit(2).minimumScaleFactor(0.8)
          .multilineTextAlignment(.center).frame(maxWidth: .infinity, minHeight: width * 0.065)
          .padding(.horizontal, 5).padding(.bottom, 8)
      }.frame(width: width * 0.305, height: width * 0.33)
        .foregroundStyle(Papu.ink).background(Papu.butter, in: RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.18), radius: 10, y: 8)
    }.buttonStyle(.plain)
      .modifier(VendorWindowArc(relative: relative, width: width))
      .zIndex(10 - abs(Double(slot - position)))
      .accessibilityLabel(vendor?.name ?? "")
      .accessibilityAddTraits(slot == position ? .isSelected : [])
      .accessibilityHidden(abs(slot - position) > 1)
  }
}

/// Interpolating the track parameter (rather than x/y endpoints) keeps every window on the arc.
private struct VendorWindowArc: AnimatableModifier {
  var relative: Double
  let width: CGFloat
  var animatableData: Double {
    get { relative }
    set { relative = newValue }
  }
  func body(content: Content) -> some View {
    let distance = abs(relative)
    let x = 0.5 + 0.389 * relative / (1 + 0.08 * relative * relative)
    let y = 0.31 + 0.12 * pow(min(distance, 3), 1.7)
    let scale = max(0.58, 0.98 - 0.13 * distance)
    return content.scaleEffect(scale)
      .rotationEffect(.degrees(max(-38, min(38, relative * 14))))
      .opacity(min(1, distance * 1.6) * (distance <= 2.3 ? 1 : max(0, 1 - (distance - 2.3) / 0.7)))
      .position(x: width * x, y: width * 640 / 720 * y)
  }
}

private struct ComboVisibilityObserver: ViewModifier {
  @Binding var visible: Bool
  @ViewBuilder func body(content: Content) -> some View {
    if #available(iOS 18.0, *) {
      content.onScrollVisibilityChange(threshold: 0.2) { visible = $0 }
    } else {
      content.background {
        GeometryReader { geometry in
          let frame = geometry.frame(in: .global)
          Color.clear.preference(key: ComboVisibilityKey.self,
            value: frame.maxY > 100 && frame.minY < UIScreen.main.bounds.height - 100)
        }
      }.onPreferenceChange(ComboVisibilityKey.self) { visible = $0 }
    }
  }
}
private struct ComboVisibilityKey: PreferenceKey {
  static var defaultValue = false
  static func reduce(value: inout Bool, nextValue: () -> Bool) { value = value || nextValue() }
}

/// Editing a suggested meal is local until the person confirms the basket action.
private struct ComboReviewView: View {
  @EnvironmentObject var store: PapuStore
  let confirm: () -> Void
  @State private var quantities = ["atom-classic": 1, "fry-fries": 1, "tecza-gelato": 1]
  @State private var notes: [String: String] = [:]
  @State private var expanded: String?
  private let itemIDs = ["atom-classic", "fry-fries", "tecza-gelato"]
  private var dishes: [Dish] {
    itemIDs.compactMap { id in store.catalog.items.first { $0.id == id } }
  }
  private var total: Int { dishes.reduce(0) { $0 + $1.price * (quantities[$1.id] ?? 0) } }
  private var count: Int { dishes.reduce(0) { $0 + (quantities[$1.id] ?? 0) } }
  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          Text(store.text("Twój idealny zestaw", "Your perfect combo"))
            .font(Papu.display(31)).fixedSize(horizontal: false, vertical: true)
          Text(store.text(
            "Połącz trzy kuchnie tak, jak lubisz. Zmień ilości lub pomiń wybrane danie.",
            "Make three kitchens your own. Adjust quantities or leave a dish out."))
            .font(Papu.body(15)).foregroundStyle(Papu.muted).fixedSize(horizontal: false, vertical: true)
          ForEach(dishes) { dish in comboRow(dish) }
          Text(store.text(
            "To przykładowy zestaw. Dania, zdjęcia, ceny i alergeny są demonstracyjne. Odbiór osobno w każdej kuchni.",
            "This is a sample combo. Dishes, photos, prices and allergens are illustrative. Collect from each kitchen separately."))
            .font(Papu.body(12)).foregroundStyle(Papu.muted).lineSpacing(3)
        }.padding(20)
      }.background(Papu.cream).foregroundStyle(Papu.ink)
        .navigationTitle(store.text("Zestaw z Koszyków", "The Koszyki combo"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { SheetClose().padding(-17) } }
        .safeAreaInset(edge: .bottom, spacing: 0) {
          Button {
            for dish in dishes where (quantities[dish.id] ?? 0) > 0 {
              store.add(dish, quantity: quantities[dish.id] ?? 1, note: notes[dish.id] ?? "")
            }
            confirm()
          } label: {
            HStack(spacing: 12) {
              Image(systemName: "basket")
              Text(store.text("Dodaj do koszyka", "Add to basket"))
              Spacer(minLength: 0)
              Text(money(total, english: store.english)).monospacedDigit()
            }.font(Papu.body(14).weight(.semibold)).lineLimit(1).minimumScaleFactor(0.8)
              .padding(.horizontal, 18).frame(minHeight: 54)
              .foregroundStyle(Papu.butter).background(count > 0 ? Papu.ink : Papu.muted, in: Capsule())
          }.buttonStyle(PressStyle()).disabled(count == 0).padding(20).background(.regularMaterial)
        }
    }
  }
  private func comboRow(_ dish: Dish) -> some View {
    let quantity = quantities[dish.id] ?? 0
    let restaurant = store.catalog.restaurants.first { $0.id == dish.restaurantId }
    return VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top, spacing: 12) {
        Image(["atom-classic": "combo-burger", "fry-fries": "combo-fries", "tecza-gelato": "combo-gelato"][dish.id] ?? (dish.image as NSString).deletingPathExtension).resizable().scaledToFit().frame(width: 72, height: 78).clipped().accessibilityHidden(true)
          .clipShape(RoundedRectangle(cornerRadius: 14))
        VStack(alignment: .leading, spacing: 5) {
          Text(restaurant?.name ?? "").font(Papu.body(11).weight(.semibold)).foregroundStyle(Papu.green)
            .fixedSize(horizontal: false, vertical: true)
          Text(store.text(dish.name, dish.nameEn)).font(Papu.display(21))
            .fixedSize(horizontal: false, vertical: true)
          Text(money(dish.price, english: store.english)).font(Papu.body(13).weight(.semibold))
        }.frame(maxWidth: .infinity, alignment: .leading)
      }
      HStack(spacing: 10) {
        Button { expanded = expanded == dish.id ? nil : dish.id } label: {
          Label(store.text("Szczegóły", "Details"), systemImage: expanded == dish.id ? "chevron.up" : "chevron.down")
            .font(Papu.body(12).weight(.semibold)).frame(minHeight: 44)
        }.buttonStyle(.plain)
        Spacer(minLength: 0)
        HStack(spacing: 0) {
          Button { quantities[dish.id] = max(0, quantity - 1) } label: {
            Image(systemName: quantity == 1 ? "trash" : "minus").font(.system(size: 13)).frame(width: 44, height: 44)
          }.disabled(quantity == 0).accessibilityLabel(store.text("Zmniejsz ilość: ", "Decrease quantity: ") + store.text(dish.name, dish.nameEn))
          Text(String(quantity)).font(Papu.body(15).weight(.semibold)).monospacedDigit().frame(minWidth: 18)
            .accessibilityLabel(store.text("Ilość: ", "Quantity: ") + String(quantity))
          Button { quantities[dish.id] = min(20, quantity + 1) } label: {
            Image(systemName: "plus").font(.system(size: 13)).frame(width: 44, height: 44)
          }.disabled(quantity == 20).accessibilityLabel(store.text("Zwiększ ilość: ", "Increase quantity: ") + store.text(dish.name, dish.nameEn))
        }.buttonStyle(PressStyle()).background(Papu.sage, in: Capsule())
      }
      if expanded == dish.id {
        Text(store.text(dish.description, dish.descriptionEn)).font(Papu.body(14)).foregroundStyle(Papu.muted)
        FlowTags(tags: (dish.vegetarian ? ["Vege"] : []) + dish.allergens)
        TextField(store.text("Uwaga dla kuchni (opcjonalnie)", "Kitchen note (optional)"), text: Binding(
          get: { notes[dish.id] ?? "" }, set: { notes[dish.id] = String($0.prefix(180)) }), axis: .vertical)
          .lineLimit(2...4).font(Papu.body(14)).padding(13)
          .background(Papu.sage.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
      }
    }.padding(16).papuCard()
  }
}
