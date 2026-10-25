import SwiftUI

struct SheetClose: View {
  @Environment(\.dismiss) var dismiss
  var body: some View {
    Button {
      dismiss()
    } label: {
      Image(systemName: "xmark").font(.system(size: 13, weight: .semibold)).frame(
        width: 44, height: 44
      ).background(.ultraThinMaterial, in: Circle())
    }.tint(Papu.ink).accessibilityLabel("Close").padding(17)
  }
}
struct RestaurantView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dismiss) private var dismiss
  let restaurant: Restaurant
  @State private var dish: Dish?
  var body: some View {
    ScrollView {
      VStack(spacing: 0) {
        ZStack(alignment: .bottomLeading) {
          FoodPhoto(name: restaurant.image).frame(height: 250).clipped()
          LinearGradient(
            colors: [.clear, Papu.ink.opacity(0.9)], startPoint: .top, endPoint: .bottom)
          VStack(alignment: .leading, spacing: 9) {
            Text(store.text("Lokal ", "Unit ") + String(restaurant.unit)).font(
              Papu.body(12).weight(.semibold)
            ).padding(.horizontal, 11).padding(.vertical, 7).background(Papu.butter, in: Capsule())
              .foregroundStyle(Papu.ink)
            Text(restaurant.name).font(Papu.display(42))
            Text(
              store.text(restaurant.cuisine, restaurant.cuisineEn)
                + store.text(" · Demo 12–28 s", " · Demo 12–28 sec")
            ).font(Papu.body(14))
          }.foregroundStyle(Papu.butter).padding(25)
        }.frame(height: 250)
        VStack(alignment: .leading, spacing: 22) {
          HStack(alignment: .top, spacing: 20) {
            Text(store.text(restaurant.description, restaurant.descriptionEn)).font(Papu.body(15))
              .lineSpacing(3).foregroundStyle(Papu.muted)
            Button {
              store.navigate(to: restaurant)
              dismiss()
            } label: {
              Image(systemName: "map").frame(width: 44, height: 44).background(
                Papu.sage, in: Circle())
            }.accessibilityLabel(store.text("Pokaż na mapie", "Show on map"))
          }
          HStack {
            Text(store.text("Dobre rzeczy w menu", "Good things on the menu")).font(
              Papu.display(26))
            Spacer()
            Text("DEMO").font(.system(size: 11, weight: .bold)).foregroundStyle(Papu.muted)
          }
          ForEach(store.catalog.items.filter { $0.restaurantId == restaurant.id }) { item in
            Button {
              dish = item
            } label: {
              HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                  Label(item.tag, systemImage: item.vegetarian ? "leaf" : "sparkles").font(
                    Papu.body(11)
                  ).foregroundStyle(Papu.green)
                  Text(store.text(item.name, item.nameEn)).font(Papu.display(24))
                  Text(store.text(item.description, item.descriptionEn)).font(Papu.body(13))
                    .lineSpacing(3).foregroundStyle(Papu.muted).fixedSize(
                      horizontal: false, vertical: true)
                  Text(money(item.price, english: store.english)).font(Papu.body(15).bold())
                }
                Spacer(minLength: 0)
                FoodPhoto(name: item.image).frame(width: 105, height: 115).clipped().clipShape(
                  RoundedRectangle(cornerRadius: 15)
                ).overlay(alignment: .bottomTrailing) {
                  Image(systemName: "plus").font(.system(size: 16, weight: .semibold)).frame(
                    width: 31, height: 31
                  ).background(Papu.green, in: Circle()).foregroundStyle(Papu.butter).padding(7)
                }
              }.padding(.vertical, 7)
            }.buttonStyle(.plain)
            Divider().overlay(Papu.line)
          }
          Text(
            store.text(
              "Dania, ceny, alergeny, zdjęcia i czasy są przykładowe. To wersja demonstracyjna.",
              "Dishes, prices, allergens, photos and prep times are illustrative. This is a demo.")
          ).font(Papu.body(12)).foregroundStyle(Papu.muted).lineSpacing(3)
          Link(destination: URL(string: restaurant.source)!) {
            Label(
              store.text("Restauracja na koszyki.com", "Restaurant on koszyki.com"),
              systemImage: "arrow.up.right"
            ).font(Papu.body(13))
          }
        }.padding(24)
      }
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      SheetClose()
    }
    .sheet(item: $dish) {
      DishView(dish: $0).environmentObject(store).presentationDetents([.large])
        .presentationCornerRadius(30)
    }
  }
}
struct DishView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dismiss) private var dismiss
  let dish: Dish
  @State private var quantity = 1
  @State private var extra = false
  @State private var note = ""
  private var total: Int { (dish.price + (extra ? 500 : 0)) * quantity }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        FoodPhoto(name: dish.image).frame(height: 270).clipped()
        VStack(alignment: .leading, spacing: 19) {
          HStack(alignment: .top, spacing: 15) {
            Text(store.text(dish.name, dish.nameEn)).font(Papu.display(35))
            Spacer(minLength: 0)
            Text(money(dish.price, english: store.english)).font(Papu.body(16).bold()).fixedSize()
              .padding(.top, 7)
          }
          Text(store.text(dish.description, dish.descriptionEn)).font(Papu.body(15)).lineSpacing(4)
            .foregroundStyle(Papu.muted)
          FlowTags(tags: (dish.vegetarian ? ["Vege"] : []) + dish.allergens)
          Divider().overlay(Papu.line)
          Text(store.text("Jeszcze trochę przyjemności?", "A little extra happiness?")).font(
            Papu.display(23))
          Toggle(isOn: $extra) {
            VStack(alignment: .leading, spacing: 4) {
              Text(store.text("Dodatkowy sos", "Extra sauce")).font(Papu.body(15).weight(.semibold))
              Text("+ " + money(500, english: store.english)).font(Papu.body(13)).foregroundStyle(
                Papu.muted)
            }
          }.tint(Papu.green).padding(14).background(
            Papu.sage.opacity(0.6), in: RoundedRectangle(cornerRadius: 14))
          VStack(alignment: .leading, spacing: 10) {
            HStack {
              Text(store.text("Coś dla kuchni?", "A note for the kitchen?"))
              Spacer()
              Text(store.text("opcjonalnie", "optional")).foregroundStyle(Papu.muted)
            }.font(Papu.body(13))
            TextField(
              store.text("Np. bez cebuli…", "For example, no onions…"), text: $note, axis: .vertical
            ).lineLimit(2...4).font(Papu.body(15)).padding(14).background(
              Color(hex: "FFFDF5"), in: RoundedRectangle(cornerRadius: 14)
            ).overlay(RoundedRectangle(cornerRadius: 14).stroke(Papu.line, lineWidth: 1)).onChange(
              of: note
            ) { _, value in if value.count > 180 { note = String(value.prefix(180)) } }
          }
          Text(
            store.text(
              "Alergeny są przykładowe. W realnym zamówieniu potwierdź je z restauracją.",
              "Allergens are illustrative. Confirm with the restaurant for a real order.")
          ).font(Papu.body(12)).foregroundStyle(Papu.muted)
        }.padding(24)
      }
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      SheetClose()
    }
    .safeAreaInset(edge: .bottom) {
      HStack(spacing: 14) {
        HStack(spacing: 0) {
          Button {
            quantity = max(1, quantity - 1)
          } label: {
            Image(systemName: "minus").frame(width: 44, height: 48)
          }.disabled(quantity <= 1).accessibilityLabel(
            store.text("Zmniejsz ilość", "Decrease quantity"))
          Text(verbatim: String(quantity)).font(Papu.body(16).bold())
          Button {
            quantity = min(20, quantity + 1)
          } label: {
            Image(systemName: "plus").frame(width: 44, height: 48)
          }.disabled(quantity >= 20).accessibilityLabel(
            store.text("Zwiększ ilość", "Increase quantity"))
        }.padding(.horizontal, 4).frame(minHeight: 52).background(Papu.sage, in: Capsule())
        Button {
          store.add(dish, quantity: quantity, extra: extra, note: note)
          dismiss()
        } label: {
          HStack {
            Text(store.text("Dodaj", "Add"))
            Spacer(minLength: 5)
            Text(money(total, english: store.english))
          }.font(Papu.body(15).weight(.semibold)).padding(.horizontal, 20).frame(height: 52)
            .foregroundStyle(Papu.butter).background(Papu.ink, in: Capsule())
        }.buttonStyle(PressStyle())
      }.padding(.horizontal, 24).padding(.vertical, 12).background(.regularMaterial)
    }
  }
}
struct FlowTags: View {
  let tags: [String]
  var body: some View {
    ViewThatFits(in: .horizontal) {
      HStack(spacing: 6) { content }
      VStack(alignment: .leading, spacing: 6) { content }
    }
  }
  @ViewBuilder private var content: some View {
    ForEach(tags, id: \.self) {
      Text($0.capitalized).font(.system(size: 11)).foregroundStyle(Papu.muted).padding(
        .horizontal, 9
      ).padding(.vertical, 6).background(Papu.sage, in: RoundedRectangle(cornerRadius: 7))
    }
  }
}
struct BasketView: View {
  @EnvironmentObject var store: PapuStore
  @Environment(\.dismiss) private var dismiss
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var checkout = false
  @State private var name = ""
  @State private var paying = false
  @State private var success = false
  var body: some View {
    Group {
      if success {
        successView
      } else {
        ScrollView {
          VStack(alignment: .leading, spacing: 20) {
            Eyebrow(
              text: store.text("JEDEN KOSZYK. DUŻO SZCZĘŚCIA.", "ONE BASKET. LOTS OF HAPPINESS."))
            Text(
              checkout
                ? store.text("Prawie przy stole.", "Almost at the table.")
                : store.text("Same dobre rzeczy.", "All the good stuff.")
            ).font(Papu.display(35))
            Label(
              "Hala Koszyki · " + store.text("Stolik ", "Table ") + store.table,
              systemImage: "mappin.and.ellipse"
            ).font(Papu.body(13)).foregroundStyle(Papu.muted)
            Divider().overlay(Papu.line)
            if store.cart.isEmpty {
              VStack(spacing: 20) {
                PapayaMark().frame(width: 85, height: 100).rotationEffect(.degrees(-10))
                Text(store.text("Apetyt jest. Papu jeszcze nie.", "Appetite? Yes. Food? Not yet."))
                  .font(Papu.display(30)).multilineTextAlignment(.center)
                Text(
                  store.text(
                    "Dodaj coś pysznego z dowolnej restauracji.",
                    "Add something delicious from any restaurant.")
                ).font(Papu.body(15)).foregroundStyle(Papu.muted)
                PrimaryButton(title: store.text("Znajdź swój smak", "Find your flavour")) {
                  store.selectedTab = 0
                  dismiss()
                }
              }.frame(maxWidth: .infinity).padding(.vertical, 40)
            } else {
              if !checkout {
                ForEach(store.groupedCart, id: \.0.id) { restaurant, lines in
                  VStack(alignment: .leading, spacing: 17) {
                    HStack(spacing: 9) {
                      Text(String(restaurant.name.prefix(1))).font(Papu.display(18)).frame(
                        width: 29, height: 29
                      ).background(
                        Color(hex: restaurant.color), in: RoundedRectangle(cornerRadius: 9))
                      Text(restaurant.name).font(Papu.body(15).bold())
                      Spacer()
                      Text(store.text("Lokal ", "Unit ") + String(restaurant.unit)).font(
                        Papu.body(12)
                      ).foregroundStyle(Papu.muted)
                    }
                    ForEach(lines) { line in
                      HStack(alignment: .top, spacing: 13) {
                        FoodPhoto(name: line.item.image).frame(width: 66, height: 72).clipped()
                          .clipShape(RoundedRectangle(cornerRadius: 12))
                        VStack(alignment: .leading, spacing: 6) {
                          Text(store.text(line.item.name, line.item.nameEn)).font(
                            Papu.body(15).weight(.semibold))
                          if line.extra {
                            Text(store.text("+ Dodatkowy sos", "+ Extra sauce")).font(Papu.body(12))
                              .foregroundStyle(Papu.muted)
                          }
                          if !line.note.isEmpty {
                            Text(line.note).font(Papu.body(12)).foregroundStyle(Papu.muted)
                          }
                          HStack {
                            HStack(spacing: 4) {
                              Button {
                                store.change(line, by: -1)
                              } label: {
                                Image(systemName: "minus").font(.system(size: 11)).frame(
                                  width: 44, height: 44)
                              }.accessibilityLabel(
                                store.text("Zmniejsz ", "Decrease ") + line.item.name)
                              Text(verbatim: String(line.quantity)).font(Papu.body(13).bold())
                              Button {
                                store.change(line, by: 1)
                              } label: {
                                Image(systemName: "plus").font(.system(size: 11)).frame(
                                  width: 44, height: 44)
                              }.disabled(line.quantity >= 20).accessibilityLabel(
                                store.text("Zwiększ ", "Increase ") + line.item.name)
                            }.background(Papu.sage, in: Capsule())
                            Spacer()
                            Text(money(line.total, english: store.english)).font(
                              Papu.body(14).bold())
                          }
                        }.frame(maxWidth: .infinity, alignment: .leading)
                      }.disabled(paying)
                    }
                  }.padding(.vertical, 5)
                }
              } else {
                HStack(spacing: 14) {
                  Image(systemName: "takeoutbag.and.cup.and.straw.fill").font(.title2)
                    .foregroundStyle(Papu.green)
                  VStack(alignment: .leading, spacing: 4) {
                    Text(store.text("Twój koszyk jest gotowy.", "Your basket is ready.")).font(
                      Papu.display(20))
                    Text(
                      store.text(
                        "Produkty: \(store.count) · Kuchnie: \(store.groupedCart.count)",
                        "Items: \(store.count) · Kitchens: \(store.groupedCart.count)")
                    )
                    .font(Papu.body(13)).foregroundStyle(Papu.muted)
                  }
                }.padding(18).papuCard()
              }
              if !checkout && !store.cart.contains(where: { $0.itemId == "bar-lemonade" }) {
                Button {
                  store.add(store.catalog.items.first { $0.id == "bar-lemonade" }!)
                } label: {
                  HStack(spacing: 11) {
                    FoodPhoto(name: "lemonade.jpg").frame(width: 45, height: 49).clipped()
                      .clipShape(RoundedRectangle(cornerRadius: 8))
                    VStack(alignment: .leading, spacing: 4) {
                      Text(
                        store.text(
                          "A do tego coś orzeźwiającego?", "Something refreshing with that?")
                      ).font(Papu.body(13).bold())
                      Text(store.text("Lemoniada yuzu · 18 zł", "Yuzu lemonade · PLN 18")).font(
                        Papu.body(12)
                      ).foregroundStyle(Papu.muted)
                    }
                    Spacer()
                    Image(systemName: "plus")
                  }.padding(13).background(Papu.sage, in: RoundedRectangle(cornerRadius: 15))
                }.buttonStyle(PressStyle())
              }
              if checkout {
                Toggle(isOn: $store.wantsReadyAlerts) {
                  VStack(alignment: .leading, spacing: 5) {
                    Label(
                      store.text("Daj znać, gdy gotowe", "Tell me when it’s ready"),
                      systemImage: "bell.badge"
                    )
                    .font(Papu.body(16).weight(.semibold))
                    Text(
                      store.text("Demo: gotowe za 12–28 sekund.", "Demo: ready in 12–28 seconds.")
                    )
                    .font(Papu.body(13)).foregroundStyle(Papu.muted)
                  }
                }.tint(Papu.green).padding(18).papuCard().disabled(paying)
                VStack(alignment: .leading, spacing: 10) {
                  Text(store.text("Jak mamy Cię wołać?", "What should we call you?")).font(
                    Papu.body(14).bold())
                  TextField(
                    store.text("Twoje imię (opcjonalnie)", "Your name (optional)"), text: $name
                  ).font(Papu.body(16)).padding(15).background(
                    Color(hex: "FFFDF5"), in: RoundedRectangle(cornerRadius: 14)
                  ).overlay(RoundedRectangle(cornerRadius: 14).stroke(Papu.line)).onChange(of: name)
                  { _, value in if value.count > 40 { name = String(value.prefix(40)) } }
                }
                HStack(spacing: 12) {
                  Image(systemName: "lock.shield").font(.title3)
                  VStack(alignment: .leading, spacing: 4) {
                    Text(store.text("Płatność demonstracyjna", "Demo payment")).font(
                      Papu.body(14).bold())
                    Text(
                      store.text(
                        "Bez karty, bez obciążenia konta. Po prostu wypróbuj.",
                        "No card, no charge. Just try the experience.")
                    ).font(Papu.body(12)).foregroundStyle(Papu.muted)
                  }
                }.padding(17).background(Papu.sage, in: RoundedRectangle(cornerRadius: 15))
              }
              Divider().overlay(Papu.line)
              HStack {
                Text(store.text("Produkty", "Items") + " (\(store.count))")
                Spacer()
                Text(money(store.total, english: store.english))
              }.font(Papu.body(14)).foregroundStyle(Papu.muted)
              HStack {
                Text(store.text("Opłata serwisowa", "Service fee"))
                Spacer()
                Text(money(0, english: store.english))
              }.font(Papu.body(14)).foregroundStyle(Papu.muted)
              HStack {
                Text(store.text("Razem", "Total"))
                Spacer()
                Text(money(store.total, english: store.english))
              }.font(Papu.display(28)).padding(.vertical, 6)
              Button {
                if checkout {
                  paying = true
                  Task {
                    try? await Task.sleep(for: .seconds(1.4))
                    guard !Task.isCancelled else { return }
                    await store.placeOrder(name: name)
                    paying = false
                    withAnimation(.spring) { success = true }
                  }
                } else {
                  withAnimation(.smooth(duration: 0.3)) { checkout = true }
                }
              } label: {
                HStack {
                  if paying { ProgressView().tint(Papu.butter) }
                  Text(
                    paying
                      ? store.text("Papu w drodze do kuchni…", "Sending your happy food…")
                      : checkout
                        ? store.text("Zamawiam w demo", "Place demo order")
                        : store.text("Przejdź do podsumowania", "Continue to checkout"))
                  Spacer(minLength: 0)
                  if !paying { Image(systemName: "arrow.right") }
                }.font(Papu.body(15).weight(.semibold)).padding(.horizontal, 22).frame(
                  minHeight: 54
                ).foregroundStyle(Papu.butter).background(Papu.ink, in: Capsule())
              }.disabled(paying).buttonStyle(PressStyle())
              if checkout {
                Button {
                  withAnimation(.smooth(duration: 0.3)) { checkout = false }
                } label: {
                  Label(store.text("Wróć do koszyka", "Back to basket"), systemImage: "arrow.left")
                    .font(Papu.body(13)).frame(maxWidth: .infinity)
                }.disabled(paying)
              }
              Text(
                store.text(
                  "Odbiór osobisty przy stanowiskach restauracji.",
                  "Collect your food at each restaurant’s counter.")
              ).font(Papu.body(12)).foregroundStyle(Papu.muted).frame(maxWidth: .infinity)
            }
          }.padding(24).padding(.top, 24).padding(.bottom, 20)
        }.id(checkout).transition(
          reduceMotion ? .opacity : .opacity.combined(with: .offset(x: checkout ? 24 : -24)))
      }
    }.background(Papu.cream).foregroundStyle(Papu.ink).overlay(alignment: .topTrailing) {
      if !paying { SheetClose() }
    }.interactiveDismissDisabled(paying)
  }
  private var successView: some View {
    ScrollView {
      VStack(spacing: 20) {
        PapuAnimation(scene: 3).frame(height: 220)
        Eyebrow(text: store.text("TERAZ CHWILA DLA CIEBIE.", "NOW TAKE A MOMENT."))
        Text(store.text("Już się robi.", "On its way.")).font(Papu.display(42))
          .multilineTextAlignment(.center)
        Text(
          store.text(
            "Rozgość się przy stoliku. Twoje smaki są już w dobrych rękach.",
            "Settle in at your table. Your cravings are in good hands.")
        ).font(Papu.body(16)).foregroundStyle(Papu.muted).multilineTextAlignment(.center)
          .lineSpacing(
            3)
        HStack {
          Image(systemName: "mappin.and.ellipse")
          Text(store.text("Stolik ", "Table ") + store.table)
          Spacer()
          Text("Hala Koszyki").font(Papu.body(13)).foregroundStyle(Papu.muted)
        }.font(Papu.body(16).bold()).padding(18).background(
          Papu.sage, in: RoundedRectangle(cornerRadius: 16))
        if let message = store.notificationMessage {
          Label(message, systemImage: "bell").font(Papu.body(13)).foregroundStyle(Papu.muted)
        }
        PrimaryButton(title: store.text("Śledź moje papu", "Track my food"), symbol: "arrow.right")
        {
          dismiss()
        }
        Text(
          store.text(
            "Zamówienie demo — bez płatności i wysyłki do restauracji.",
            "Demo order — no payment or submission to restaurants.")
        ).font(Papu.body(12)).foregroundStyle(Papu.muted).multilineTextAlignment(.center)
      }.padding(24).padding(.top, 24)
    }
  }
}
