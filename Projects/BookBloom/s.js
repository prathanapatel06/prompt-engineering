/* BOOKBLOOM — WEBSITE FUNCTIONALITY */

"use strict";

/* BOOK DATA */

const books = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    category: "Fiction",
    price: 399,
    rating: 4.8,
    badge: "Bestseller",
    cover: "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg"
  },
  {
    id: 2,
    title: "It Ends with Us",
    author: "Colleen Hoover",
    category: "Romance",
    price: 449,
    rating: 4.6,
    badge: "Popular",
    cover: "https://covers.openlibrary.org/b/isbn/9781501110368-L.jpg"
  },
  {
    id: 3,
    title: "The Silent Patient",
    author: "Alex Michaelides",
    category: "Mystery",
    price: 379,
    rating: 4.7,
    badge: "Bestseller",
    cover: "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg"
  },
  {
    id: 4,
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    category: "Fantasy",
    price: 499,
    rating: 4.9,
    badge: "Reader favourite",
    cover: "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg"
  },
  {
    id: 5,
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-help",
    price: 499,
    rating: 4.8,
    badge: "Bestseller",
    cover: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg"
  },
  {
    id: 6,
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "Self-help",
    price: 349,
    rating: 4.7,
    badge: "Popular",
    cover: "https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg"
  },
  {
    id: 7,
    title: "A Good Girl's Guide to Murder",
    author: "Holly Jackson",
    category: "Mystery",
    price: 429,
    rating: 4.7,
    badge: "New",
    cover: "https://covers.openlibrary.org/b/isbn/9781984896360-L.jpg"
  },
  {
    id: 8,
    title: "Pride and Prejudice",
    author: "Jane Austen",
    category: "Romance",
    price: 299,
    rating: 4.8,
    badge: "Classic",
    cover: "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg"
  },
  {
    id: 9,
    title: "The Alchemist",
    author: "Paulo Coelho",
    category: "Fiction",
    price: 299,
    rating: 4.6,
    badge: "Reader favourite",
    cover: "https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg"
  },
  {
    id: 10,
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Academic",
    price: 399,
    rating: 4.5,
    badge: "Popular",
    cover: "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg"
  },
  {
    id: 11,
    title: "The Song of Achilles",
    author: "Madeline Miller",
    category: "Fantasy",
    price: 459,
    rating: 4.8,
    badge: "New",
    cover: "https://covers.openlibrary.org/b/isbn/9780062060624-L.jpg"
  },
  {
    id: 12,
    title: "Deep Work",
    author: "Cal Newport",
    category: "Academic",
    price: 429,
    rating: 4.6,
    badge: "New",
    cover: "https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg"
  }
];


/* SHORTCUTS */

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];


/* SAFE LOCAL STORAGE */

const safeRead = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};


/* APPLICATION STATE */

let cart = safeRead("bookbloom-cart", []);
let wishlist = safeRead("bookbloom-wishlist", []);

if (!Array.isArray(cart)) cart = [];
if (!Array.isArray(wishlist)) wishlist = [];

let activeFilter = "All";
let activeCategory = "";
let searchTerm = "";
let toastTimer;


/* HTML ELEMENTS */

const bookGrid = $("#bookGrid");
const emptyState = $("#emptyState");
const resultsLine = $("#resultsLine");

const cartDrawer = $("#cartDrawer");
const wishlistDrawer = $("#wishlistDrawer");
const backdrop = $("#drawerBackdrop");


/* HELPER FUNCTIONS */

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function persist() {
  localStorage.setItem("bookbloom-cart", JSON.stringify(cart));
  localStorage.setItem("bookbloom-wishlist", JSON.stringify(wishlist));
}

function notify(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

function bookById(id) {
  return books.find(book => book.id === Number(id));
}


/* CREATE BOOK CARD */

function bookCard(book) {
  const saved = wishlist.includes(book.id);

  return `
    <article class="book-card">

      <div class="book-cover-wrap">

        <img
          class="book-cover"
          src="${book.cover}"
          alt="Cover of ${book.title}"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://placehold.co/400x600/e9e2f5/5c4c66?text=BookBloom'"
        >

        <span class="book-badge">${book.badge}</span>

        <button
          class="wishlist-toggle ${saved ? "saved" : ""}"
          data-wishlist="${book.id}"
          aria-label="${saved ? "Remove from" : "Add to"} wishlist"
        >
          ${saved ? "♥" : "♡"}
        </button>

      </div>

      <div class="book-info">

        <span class="book-category">${book.category}</span>

        <h3>${book.title}</h3>

        <p class="book-author">by ${book.author}</p>

        <p class="book-rating">
          ★★★★★ <span>(${book.rating.toFixed(1)})</span>
        </p>

        <div class="book-bottom">

          <span class="book-price">${money(book.price)}</span>

          <button class="add-button" data-add="${book.id}">
            Add to cart +
          </button>

        </div>

      </div>

    </article>
  `;
}


/* SEARCH, FILTER AND SORT */

function getVisibleBooks() {
  let list = [...books];

  if (activeCategory) {
    list = list.filter(book => book.category === activeCategory);
  }

  if (activeFilter === "Bestseller") {
    list = list.filter(book => book.badge === "Bestseller");
  }

  if (activeFilter === "New") {
    list = list.filter(book => book.badge === "New");
  }

  if (activeFilter === "Under500") {
    list = list.filter(book => book.price < 500);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();

    list = list.filter(book =>
      `${book.title} ${book.author} ${book.category}`
        .toLowerCase()
        .includes(term)
    );
  }

  const sort = $("#sortSelect").value;

  if (sort === "price-low") {
    list.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-high") {
    list.sort((a, b) => b.price - a.price);
  }

  if (sort === "rating") {
    list.sort((a, b) => b.rating - a.rating);
  }

  if (sort === "title") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }

  return list;
}


/* DISPLAY CATALOGUE */

function renderCatalog() {
  const visible = getVisibleBooks();

  bookGrid.innerHTML = visible.map(bookCard).join("");

  resultsLine.textContent =
    `${visible.length} ${visible.length === 1 ? "book" : "books"} found`;

  emptyState.classList.toggle("hidden", visible.length !== 0);
  bookGrid.classList.toggle("hidden", visible.length === 0);

  $("#catalogTitle").innerHTML = activeCategory
    ? `${activeCategory} <em>books</em>`
    : "Books to <em>fall for</em>";

  $("#catalogSubtitle").textContent = activeCategory
    ? `Explore our ${activeCategory.toLowerCase()} shelf.`
    : "A few lovely places to begin your next reading adventure.";

  $("#clearCategory").classList.toggle("hidden", !activeCategory);

  $$(".filter-pill").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === activeFilter
    );
  });
}


/* CATEGORY SELECTION */

function setCategory(category) {
  activeCategory = category;
  activeFilter = "All";

  $("#sortSelect").value = "featured";

  renderCatalog();

  $("#catalog").scrollIntoView({
    behavior: "smooth"
  });
}

function resetCatalog() {
  activeCategory = "";
  activeFilter = "All";
  searchTerm = "";

  $("#searchInput").value = "";
  $("#sortSelect").value = "featured";

  renderCatalog();
}


/* UPDATE COUNTS */

function updateCounts() {
  const cartQuantity = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  $("#cartCount").textContent = cartQuantity;
  $("#wishlistCount").textContent = wishlist.length;

  $("#cartHeadingCount").textContent = `(${cartQuantity})`;
  $("#wishlistHeadingCount").textContent = `(${wishlist.length})`;
}


/* SHOPPING CART */

function renderCart() {
  const container = $("#cartItems");

  if (!cart.length) {
    container.innerHTML = `
      <div class="drawer-empty">
        <div style="font-size:2rem">🛍</div>
        <p>Your basket is waiting for a story.</p>
        <button class="button button-soft" data-close-drawer>
          Explore books
        </button>
      </div>
    `;
  } else {
    container.innerHTML = cart.map(item => {
      const book = bookById(item.id);

      if (!book) return "";

      return `
        <div class="drawer-item">

          <img
            src="${book.cover}"
            alt=""
            onerror="this.onerror=null;this.src='https://placehold.co/120x160/e9e2f5/5c4c66?text=Book'"
          >

          <div>
            <h3>${book.title}</h3>
            <p>${money(book.price)} each</p>

            <div class="quantity-controls">

              <button
                data-quantity="${book.id}"
                data-change="-1"
                aria-label="Decrease quantity"
              >−</button>

              <span>${item.quantity}</span>

              <button
                data-quantity="${book.id}"
                data-change="1"
                aria-label="Increase quantity"
              >+</button>

            </div>
          </div>

          <button class="remove-item" data-remove-cart="${book.id}">
            Remove
          </button>

        </div>
      `;
    }).join("");
  }

  const subtotal = cart.reduce((sum, item) => {
    const book = bookById(item.id);

    return sum + (book ? book.price * item.quantity : 0);
  }, 0);

  $("#cartSubtotal").textContent = money(subtotal);

  $("#shippingNote").textContent =
    subtotal === 0
      ? "Free delivery on orders over ₹799."
      : subtotal >= 799
        ? "Lovely! Your demo basket qualifies for free delivery."
        : `Add ${money(799 - subtotal)} more for free delivery.`;

  $("#checkoutButton").disabled = cart.length === 0;
  $("#checkoutButton").style.opacity = cart.length ? "1" : ".5";

  $("#checkoutTotal").textContent = money(subtotal);

  updateCounts();
}


/* WISHLIST */

function renderWishlist() {
  const container = $("#wishlistItems");

  if (!wishlist.length) {
    container.innerHTML = `
      <div class="drawer-empty">
        <div style="font-size:2rem">♡</div>
        <p>Your wishlist is ready for a few favourites.</p>
        <button class="button button-soft" data-close-drawer>
          Find a book
        </button>
      </div>
    `;
  } else {
    container.innerHTML = wishlist.map(id => {
      const book = bookById(id);

      if (!book) return "";

      return `
        <div class="drawer-item">

          <img
            src="${book.cover}"
            alt=""
            onerror="this.onerror=null;this.src='https://placehold.co/120x160/e9e2f5/5c4c66?text=Book'"
          >

          <div>
            <h3>${book.title}</h3>
            <p>${money(book.price)}</p>

            <div class="drawer-wish-actions">
              <button data-add="${book.id}">Add to cart</button>
              <button data-wishlist="${book.id}">Remove</button>
            </div>
          </div>

        </div>
      `;
    }).join("");
  }

  updateCounts();
}


/* CART ACTIONS */

function addToCart(id) {
  const existing = cart.find(
    item => item.id === Number(id)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: Number(id),
      quantity: 1
    });
  }

  persist();
  renderCart();

  notify("Added to your basket!");
}

function changeQuantity(id, change) {
  const item = cart.find(
    entry => entry.id === Number(id)
  );

  if (!item) return;

  item.quantity += Number(change);

  if (item.quantity <= 0) {
    cart = cart.filter(
      entry => entry.id !== Number(id)
    );
  }

  persist();
  renderCart();
}

function removeCartItem(id) {
  cart = cart.filter(
    item => item.id !== Number(id)
  );

  persist();
  renderCart();

  notify("Item removed.");
}


/* WISHLIST ACTIONS */

function toggleWishlist(id) {
  id = Number(id);

  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(item => item !== id);
    notify("Removed from wishlist.");
  } else {
    wishlist.push(id);
    notify("Saved to your wishlist!");
  }

  persist();
  renderCatalog();
  renderWishlist();
}


/* DRAWERS */

function openDrawer(drawer) {
  closeDrawers();

  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");

  backdrop.classList.add("visible");

  document.body.style.overflow = "hidden";
}

function closeDrawers() {
  [cartDrawer, wishlistDrawer].forEach(drawer => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  });

  backdrop.classList.remove("visible");

  document.body.style.overflow = "";
}


/* CHECKOUT PREVIEW */

function openCheckout() {
  if (!cart.length) return;

  closeDrawers();

  $("#checkoutModal").classList.remove("hidden");

  $("#checkoutTotal").textContent =
    $("#cartSubtotal").textContent;
}

function closeCheckout() {
  $("#checkoutModal").classList.add("hidden");
}


/* CLICK EVENTS */

document.addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  const wish = event.target.closest("[data-wishlist]");
  const qty = event.target.closest("[data-quantity]");
  const remove = event.target.closest("[data-remove-cart]");
  const close = event.target.closest("[data-close-drawer]");
  const category = event.target.closest("[data-category]");

  if (add) {
    addToCart(add.dataset.add);
  }

  if (wish) {
    toggleWishlist(wish.dataset.wishlist);
  }

  if (qty) {
    changeQuantity(
      qty.dataset.quantity,
      qty.dataset.change
    );
  }

  if (remove) {
    removeCartItem(remove.dataset.removeCart);
  }

  if (close) {
    closeDrawers();
  }

  if (category) {
    setCategory(category.dataset.category);
  }
});


/* FILTERS */

$$(".filter-pill").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    renderCatalog();
  });
});


/* SORTING */

$("#sortSelect").addEventListener("change", renderCatalog);


/* SEARCH */

$("#searchInput").addEventListener("input", event => {
  searchTerm = event.target.value.trim();
  activeCategory = "";

  renderCatalog();
});


/* RESET BUTTONS */

$("#clearCategory").addEventListener("click", resetCatalog);
$("#resetCatalog").addEventListener("click", resetCatalog);


/* OPEN AND CLOSE DRAWERS */

$("#cartButton").addEventListener("click", () => {
  openDrawer(cartDrawer);
});

$("#wishlistButton").addEventListener("click", () => {
  openDrawer(wishlistDrawer);
});

$("#drawerBackdrop").addEventListener("click", closeDrawers);

$$("[data-close-drawer]").forEach(button => {
  button.addEventListener("click", closeDrawers);
});


/* CHECKOUT EVENTS */

$("#checkoutButton").addEventListener("click", openCheckout);

$("#closeCheckout").addEventListener("click", closeCheckout);

$("#checkoutModal").addEventListener("click", event => {
  if (event.target.id === "checkoutModal") {
    closeCheckout();
  }
});

$("#checkoutForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!event.currentTarget.reportValidity()) return;

  const reference =
    "BB-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  cart = [];

  persist();
  renderCart();
  renderCatalog();
  closeCheckout();

  event.currentTarget.reset();

  notify(`Demo order ${reference} created. No payment was taken.`);
});


/* CONTACT FORM */

$("#contactForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!event.currentTarget.reportValidity()) return;

  event.currentTarget.reset();

  notify("Thanks! The demo form was validated (not sent).");
});


/* NEWSLETTER FORM */

$("#newsletterForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!event.currentTarget.reportValidity()) return;

  const email = $("#newsletterEmail").value.trim();

  const saved = safeRead("bookbloom-newsletter", []);

  if (!saved.includes(email)) {
    saved.push(email);
  }

  localStorage.setItem(
    "bookbloom-newsletter",
    JSON.stringify(saved)
  );

  event.currentTarget.reset();

  notify("You're on the local demo list. Thank you!");
});


/* DARK MODE */

$("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "bookbloom-theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
});

if (localStorage.getItem("bookbloom-theme") === "dark") {
  document.body.classList.add("dark");
}


/* MOBILE MENU */

$("#menuToggle").addEventListener("click", () => {
  const open = $("#mainNav").classList.toggle("open");

  $("#menuToggle").setAttribute(
    "aria-expanded",
    String(open)
  );

  $("#menuToggle").setAttribute(
    "aria-label",
    open ? "Close menu" : "Open menu"
  );
});

$$(".main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    $("#mainNav").classList.remove("open");

    $("#menuToggle").setAttribute(
      "aria-expanded",
      "false"
    );
  });
});


/* BACK TO TOP */

window.addEventListener("scroll", () => {
  $("#backToTop").classList.toggle(
    "visible",
    window.scrollY > 450
  );
});

$("#backToTop").addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});


/* FOOTER YEAR */

$("#year").textContent = new Date().getFullYear();


/* INITIALIZE WEBSITE */

renderCatalog();
renderCart();
renderWishlist();
