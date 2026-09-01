const express = require("express");
const session = require("express-session");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const databasePath = path.join(__dirname, "supermercado.db");
const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    contact TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cliente'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    payment TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

function createInitialData() {
  const admin = db
    .prepare("SELECT id FROM users WHERE cpf = ?")
    .get("00000000000");

  if (!admin) {
    db.prepare(`
      INSERT INTO users (name, cpf, contact, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      "Administrador",
      "00000000000",
      "admin@mercado.local",
      "admin123",
      "admin",
    );
  }

  const firstProduct = db.prepare("SELECT id FROM products LIMIT 1").get();

  if (!firstProduct) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, price, stock)
      VALUES (?, ?, ?)
    `);

    const initialProducts = [
      ["Arroz 5kg", 28.9, 20],
      ["Feijão 1kg", 8.49, 35],
      ["Leite integral", 5.99, 40],
      ["Café 500g", 18.5, 18],
      ["Macarrão 500g", 5.25, 50],
    ];

    initialProducts.forEach((product) => {
      insertProduct.run(...product);
    });
  }
}

createInitialData();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "supermercado-local-2026",
    resave: false,
    saveUninitialized: false,
  }),
);

app.use(express.static(path.join(__dirname, "public")));

function requireLogin(request, response, next) {
  if (!request.session.user) {
    return response.status(401).json({
      error: "Faça login para continuar.",
    });
  }

  next();
}

function requireAdmin(request, response, next) {
  if (request.session.user?.role !== "admin") {
    return response.status(403).json({
      error: "Acesso permitido somente a administradores.",
    });
  }

  next();
}

app.get("/api/session", (request, response) => {
  response.json({
    user: request.session.user || null,
  });
});

app.get("/api/products", (request, response) => {
  const products = db.prepare("SELECT * FROM products ORDER BY name").all();
  response.json(products);
});

app.post("/api/products", requireLogin, requireAdmin, (request, response) => {
  const { name, price, stock } = request.body;
  const numericPrice = Number(price);
  const numericStock = Number(stock);

  const invalidProduct =
    !name?.trim() ||
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    !Number.isInteger(numericStock) ||
    numericStock < 0;

  if (invalidProduct) {
    return response.status(400).json({
      error: "Preencha os dados do produto corretamente.",
    });
  }

  const result = db
    .prepare(`
      INSERT INTO products (name, price, stock)
      VALUES (?, ?, ?)
    `)
    .run(name.trim(), numericPrice, numericStock);

  response.status(201).json({
    id: result.lastInsertRowid,
  });
});

app.delete(
  "/api/products/:id",
  requireLogin,
  requireAdmin,
  (request, response) => {
    const result = db
      .prepare("DELETE FROM products WHERE id = ?")
      .run(request.params.id);

    if (!result.changes) {
      return response.status(404).json({
        error: "Produto não encontrado.",
      });
    }

    response.status(204).end();
  },
);

app.post("/api/register", (request, response) => {
  const { name, cpf, contact, password } = request.body;
  const cleanCpf = (cpf || "").replace(/\D/g, "");

  if (!name?.trim() || !cleanCpf || !contact?.trim() || !password) {
    return response.status(400).json({
      error: "Preencha todos os campos.",
    });
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO users (name, cpf, contact, password, role)
        VALUES (?, ?, ?, ?, 'cliente')
      `)
      .run(name.trim(), cleanCpf, contact.trim(), password);

    request.session.user = {
      id: result.lastInsertRowid,
      name: name.trim(),
      role: "cliente",
    };

    response.status(201).json({
      user: request.session.user,
    });
  } catch (error) {
    response.status(400).json({
      error: "CPF já cadastrado.",
    });
  }
});

app.post("/api/login", (request, response) => {
  const cleanCpf = (request.body.cpf || "").replace(/\D/g, "");

  const user = db
    .prepare(`
      SELECT id, name, role, password
      FROM users
      WHERE cpf = ?
    `)
    .get(cleanCpf);

  if (!user || user.password !== request.body.password) {
    return response.status(401).json({
      error: "CPF ou senha inválidos.",
    });
  }

  request.session.user = {
    id: user.id,
    name: user.name,
    role: user.role,
  };

  response.json({
    user: request.session.user,
  });
});

app.post("/api/logout", (request, response) => {
  request.session.destroy(() => {
    response.status(204).end();
  });
});

app.post("/api/checkout", requireLogin, (request, response) => {
  const { items, payment } = request.body;
  const paymentMethods = ["pix", "credito", "debito", "dinheiro"];

  if (!Array.isArray(items) || items.length === 0 || !paymentMethods.includes(payment)) {
    return response.status(400).json({
      error: "Compra ou forma de pagamento inválida.",
    });
  }

  const findProduct = db.prepare("SELECT * FROM products WHERE id = ?");
  const updateStock = db.prepare(`
    UPDATE products
    SET stock = stock - ?
    WHERE id = ?
  `);
  const insertSale = db.prepare(`
    INSERT INTO sales (user_id, items, total, payment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const processSale = db.transaction(() => {
    let total = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = findProduct.get(item.id);
      const quantity = Number(item.quantity);

      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      if (!Number.isInteger(quantity) || quantity < 1 || product.stock < quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }

      const subtotal = product.price * quantity;
      total += subtotal;

      invoiceItems.push({
        name: product.name,
        quantity,
        price: product.price,
        subtotal,
      });

      updateStock.run(quantity, product.id);
    }

    const createdAt = new Date().toISOString();
    const result = insertSale.run(
      request.session.user.id,
      JSON.stringify(invoiceItems),
      total,
      payment,
      createdAt,
    );

    return {
      id: result.lastInsertRowid,
      items: invoiceItems,
      total,
    };
  });

  try {
    const sale = processSale();

    response.status(201).json({
      id: sale.id,
      customer: request.session.user.name,
      items: sale.items,
      total: sale.total,
      payment,
      date: new Date().toLocaleString("pt-BR"),
    });
  } catch (error) {
    response.status(400).json({
      error: error.message,
    });
  }
});

const siteRoutes = [
  "/",
  "/login",
  "/cadastro",
  "/pagamento",
  "/produtos",
  "/nota-fiscal",
];

siteRoutes.forEach((route) => {
  app.get(route, (request, response) => {
    response.sendFile(path.join(__dirname, "public", "index.html"));
  });
});

app.listen(3000, "127.0.0.1", () => {
  console.log("Supermercado em http://127.0.0.1:3000");
});
