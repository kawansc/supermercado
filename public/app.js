const app = document.querySelector("#app");
const accountLink = document.querySelector("#account");
const logoutButton = document.querySelector("#logout");
const cartCount = document.querySelector("#cartCount");

let currentUser = null;
const cart = JSON.parse(localStorage.getItem("cart") || "[]");

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));

  const totalItems = cart.reduce((total, item) => {
    return total + item.quantity;
  }, 0);

  cartCount.textContent = totalItems;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function updateNavigation() {
  accountLink.textContent = currentUser ? currentUser.name : "Entrar";
  accountLink.href = currentUser ? "/produtos" : "/login";
  logoutButton.hidden = !currentUser;
  saveCart();
}

function showMessage(message) {
  const messageArea = document.querySelector("#message");

  if (messageArea) {
    messageArea.innerHTML = `<p class="message">${escapeHtml(message)}</p>`;
  }
}

function renderHome() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Compras do dia a dia</p>
        <h1>Seu mercado de um jeito simples.</h1>
        <p>
          Consulte os produtos disponíveis, monte seu carrinho e escolha a
          forma de pagamento.
        </p>
        <a class="button" href="/produtos">Ver produtos</a>
      </div>

      <aside class="hero-card">
        <h2>Como funciona</h2>
        <ul>
          <li>Escolha os produtos.</li>
          <li>Entre ou crie seu cadastro.</li>
          <li>Finalize a compra e confira a nota fiscal.</li>
        </ul>
      </aside>
    </section>
  `;
}

function renderAdminForm() {
  return `
    <section class="panel admin-panel">
      <h2>Adicionar produto</h2>

      <form id="addProductForm" class="form-grid">
        <div class="field">
          <label for="productName">Produto</label>
          <input id="productName" name="name" required />
        </div>

        <div class="field">
          <label for="productPrice">Preço</label>
          <input
            id="productPrice"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div class="field">
          <label for="productStock">Estoque</label>
          <input
            id="productStock"
            name="stock"
            type="number"
            min="0"
            required
          />
        </div>

        <button class="button" type="submit">Salvar</button>
      </form>
    </section>
  `;
}

function renderProductCard(product) {
  const adminButton = currentUser?.role === "admin"
    ? `
        <button
          class="button button-danger delete-product"
          type="button"
          data-product-id="${product.id}"
        >
          Excluir
        </button>
      `
    : "";

  return `
    <article class="card">
      <h2>${escapeHtml(product.name)}</h2>
      <p class="price">${formatMoney(product.price)}</p>
      <p class="stock">${product.stock} unidade(s) em estoque</p>

      <div class="actions">
        <button
          class="button add-to-cart"
          type="button"
          data-product-id="${product.id}"
          ${product.stock === 0 ? "disabled" : ""}
        >
          ${product.stock === 0 ? "Sem estoque" : "Adicionar"}
        </button>
        ${adminButton}
      </div>
    </article>
  `;
}

async function renderProducts() {
  const products = await apiRequest("/api/products");
  const adminForm = currentUser?.role === "admin" ? renderAdminForm() : "";

  app.innerHTML = `
    <h1 class="page-title">Produtos</h1>
    ${adminForm}
    <div id="message"></div>

    <section class="grid">
      ${products.map(renderProductCard).join("")}
    </section>
  `;

  const addProductForm = document.querySelector("#addProductForm");

  if (addProductForm) {
    addProductForm.addEventListener("submit", handleAddProduct);
  }

  document.querySelectorAll(".add-to-cart").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = Number(button.dataset.productId);
      const product = products.find((item) => item.id === productId);
      addToCart(product);
    });
  });

  document.querySelectorAll(".delete-product").forEach((button) => {
    button.addEventListener("click", () => {
      deleteProduct(Number(button.dataset.productId));
    });
  });
}

async function handleAddProduct(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const product = Object.fromEntries(formData);

  try {
    await apiRequest("/api/products", {
      method: "POST",
      body: JSON.stringify(product),
    });

    await renderProducts();
  } catch (error) {
    showMessage(error.message);
  }
}

function addToCart(product) {
  const cartItem = cart.find((item) => item.id === product.id);

  if (cartItem && cartItem.quantity < product.stock) {
    cartItem.quantity += 1;
  } else if (!cartItem) {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  }

  saveCart();
}

async function deleteProduct(productId) {
  const confirmed = window.confirm("Deseja excluir este produto?");

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(`/api/products/${productId}`, {
      method: "DELETE",
    });

    await renderProducts();
  } catch (error) {
    showMessage(error.message);
  }
}

function renderAuthPage(isRegister) {
  const title = isRegister ? "Criar cadastro" : "Entrar";
  const submitText = isRegister ? "Cadastrar" : "Entrar";
  const endpoint = isRegister ? "/api/register" : "/api/login";

  const registerFields = isRegister
    ? `
        <div class="field">
          <label for="name">Nome completo</label>
          <input id="name" name="name" required />
        </div>

        <div class="field">
          <label for="contact">Contato</label>
          <input id="contact" name="contact" required />
        </div>
      `
    : "";

  app.innerHTML = `
    <section class="panel">
      <h1>${title}</h1>

      <form id="authForm">
        ${registerFields}

        <div class="field">
          <label for="cpf">CPF</label>
          <input id="cpf" name="cpf" inputmode="numeric" required />
        </div>

        <div class="field">
          <label for="password">Senha</label>
          <input id="password" name="password" type="password" required />
        </div>

        <button class="button" type="submit">${submitText}</button>
      </form>

      <div id="message"></div>

      <p class="helper-text">
        ${isRegister ? "Já possui cadastro?" : "Ainda não possui cadastro?"}
        <a href="${isRegister ? "/login" : "/cadastro"}">
          ${isRegister ? "Entrar" : "Cadastre-se"}
        </a>
      </p>

      ${
        isRegister
          ? ""
          : `
              <p class="helper-text">
                Administrador: CPF 00000000000 · senha admin123
              </p>
            `
      }
    </section>
  `;

  document.querySelector("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    try {
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      currentUser = data.user;
      updateNavigation();
      window.location.href = "/produtos";
    } catch (error) {
      showMessage(error.message);
    }
  });
}

function removeCartItem(productId) {
  const itemIndex = cart.findIndex((item) => item.id === productId);

  if (itemIndex !== -1) {
    cart.splice(itemIndex, 1);
    saveCart();
    renderCheckout();
  }
}

function renderCheckout() {
  if (!currentUser) {
    window.location.href = "/login";
    return;
  }

  if (cart.length === 0) {
    app.innerHTML = `
      <section class="panel">
        <h1>Carrinho vazio</h1>
        <p class="helper-text">Adicione produtos antes de continuar.</p>
        <a class="button" href="/produtos">Ver produtos</a>
      </section>
    `;
    return;
  }

  const total = cart.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const rows = cart
    .map((item) => {
      return `
        <div class="sale-row">
          <span>${escapeHtml(item.name)} × ${item.quantity}</span>
          <span>
            <strong>${formatMoney(item.price * item.quantity)}</strong>
            <button
              class="button button-danger remove-cart-item"
              type="button"
              data-product-id="${item.id}"
            >
              Remover
            </button>
          </span>
        </div>
      `;
    })
    .join("");

  app.innerHTML = `
    <section class="panel">
      <h1>Pagamento</h1>
      ${rows}
      <p class="total">Total: ${formatMoney(total)}</p>

      <form id="paymentForm">
        <div class="field">
          <label for="payment">Forma de pagamento</label>
          <select id="payment" name="payment">
            <option value="pix">Pix</option>
            <option value="credito">Cartão de crédito</option>
            <option value="debito">Cartão de débito</option>
            <option value="dinheiro">Dinheiro</option>
          </select>
        </div>

        <button class="button" type="submit">Finalizar compra</button>
      </form>

      <div id="message"></div>
    </section>
  `;

  document.querySelectorAll(".remove-cart-item").forEach((button) => {
    button.addEventListener("click", () => {
      removeCartItem(Number(button.dataset.productId));
    });
  });

  document.querySelector("#paymentForm").addEventListener("submit", handleCheckout);
}

async function handleCheckout(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);

  try {
    const sale = await apiRequest("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: cart,
        payment: formData.get("payment"),
      }),
    });

    localStorage.setItem("invoice", JSON.stringify(sale));
    cart.splice(0, cart.length);
    saveCart();
    window.location.href = "/nota-fiscal";
  } catch (error) {
    showMessage(error.message);
  }
}

function renderInvoice() {
  const invoice = JSON.parse(localStorage.getItem("invoice") || "null");

  if (!invoice) {
    window.location.href = "/produtos";
    return;
  }

  const rows = invoice.items
    .map((item) => {
      return `
        <div class="sale-row">
          <span>
            ${escapeHtml(item.name)} — ${item.quantity} × ${formatMoney(item.price)}
          </span>
          <strong>${formatMoney(item.subtotal)}</strong>
        </div>
      `;
    })
    .join("");

  app.innerHTML = `
    <section class="panel">
      <h1>Nota fiscal</h1>
      <p>
        <strong>Compra nº ${invoice.id}</strong><br />
        Cliente: ${escapeHtml(invoice.customer)}<br />
        Data: ${escapeHtml(invoice.date)}
      </p>

      ${rows}

      <p>Pagamento: ${escapeHtml(invoice.payment)}</p>
      <p class="total">Valor final: ${formatMoney(invoice.total)}</p>

      <button id="printInvoice" class="button" type="button">Imprimir</button>
    </section>
  `;

  document.querySelector("#printInvoice").addEventListener("click", () => {
    window.print();
  });
}

async function loadPage() {
  try {
    const session = await apiRequest("/api/session");
    currentUser = session.user;
    updateNavigation();

    switch (window.location.pathname) {
      case "/produtos":
        await renderProducts();
        break;
      case "/login":
        renderAuthPage(false);
        break;
      case "/cadastro":
        renderAuthPage(true);
        break;
      case "/pagamento":
        renderCheckout();
        break;
      case "/nota-fiscal":
        renderInvoice();
        break;
      default:
        renderHome();
    }
  } catch (error) {
    app.innerHTML = `
      <section class="panel">
        <h1>Não foi possível carregar o sistema</h1>
        <p class="message">${escapeHtml(error.message)}</p>
      </section>
    `;
  }
}

logoutButton.addEventListener("click", async () => {
  await apiRequest("/api/logout", {
    method: "POST",
  });

  currentUser = null;
  updateNavigation();
  window.location.href = "/";
});

loadPage();
